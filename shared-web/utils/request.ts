import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import type { ApiResponse } from '../types';

// 刷新 token 相关
let isRefreshing = false;
let failedQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null, error: any = null): void {
  failedQueue.forEach((cb) => cb(error ? null : token));
  failedQueue = [];
}

/** 创建 Axios 实例（学生端与后台端共用） */
export function createRequest(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
  });

  // 请求拦截器：附加 Token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // 响应拦截器：统一处理 code !== 0、401 自动刷新、错误提示
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const res = response.data;
      // 二进制流（文件下载）直接返回
      if (response.config.responseType === 'blob') {
        return response as any;
      }
      if (res.code !== 0) {
        ElMessage.error(res.message || '请求失败');
        return Promise.reject(new Error(res.message || 'Error'));
      }
      return res.data as any;
    },
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      // 401：尝试用 refreshToken 静默刷新
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // 等待刷新完成后重试
          return new Promise((resolve, reject) => {
            failedQueue.push((token) => {
              if (!token) return reject(error);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(instance(originalRequest));
            });
          });
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('无 refreshToken');
          const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            `${baseURL}/auth/refresh`,
            { refreshToken },
          );
          if (data.code !== 0) throw new Error(data.message);
          const newAccess = data.data.accessToken;
          const newRefresh = data.data.refreshToken;
          localStorage.setItem('accessToken', newAccess);
          localStorage.setItem('refreshToken', newRefresh);
          processQueue(newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return instance(originalRequest);
        } catch (refreshError) {
          processQueue(null, refreshError);
          // 刷新失败：清空 token，跳登录
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          ElMessage.error('登录已失效，请重新登录');
          // 派发自定义事件，由 useAuth 监听跳登录
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
      // 其他错误
      const msg = error.response?.data?.message || error.message || '网络错误';
      ElMessage.error(msg);
      return Promise.reject(error);
    },
  );

  return instance;
}

/** 默认实例（基于 VITE_API_BASE_URL） */
export const request = createRequest(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
);

/** 通用 GET */
export function get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
  return request.get(url, { params, ...config }) as any;
}

/** 通用 POST */
export function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return request.post(url, data, config) as any;
}

/** 通用 PUT */
export function put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
  return request.put(url, data, config) as any;
}

/** 通用 DELETE */
export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.delete(url, config) as any;
}
