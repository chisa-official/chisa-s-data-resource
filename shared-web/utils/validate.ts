import type { FormItemRule } from 'element-plus';

/** 学号校验：8-12 位数字 */
export const studentNoRule: FormItemRule[] = [
  { required: true, message: '请输入学号', trigger: 'blur' },
  { pattern: /^\d{8,12}$/, message: '学号为 8-12 位数字', trigger: 'blur' },
];

/** 手机号校验 */
export const phoneRule: FormItemRule[] = [
  { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' },
];

/** 邮箱校验 */
export const emailRule: FormItemRule[] = [
  { type: 'email', message: '邮箱格式错误', trigger: 'blur' },
];

/** 密码校验：6-20 位（登录场景使用，较弱） */
export const passwordRule: FormItemRule[] = [
  { required: true, message: '请输入密码', trigger: 'blur' },
  { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
];

/** 注册强密码校验：8-20 位，至少包含大小写字母、数字、特殊字符中的 3 种 */
export const strongPasswordRule: FormItemRule[] = [
  { required: true, message: '请输入密码', trigger: 'blur' },
  {
    validator: (_rule, value, callback) => {
      if (!value) return callback(new Error('请输入密码'));
      if (value.length < 8 || value.length > 20) {
        return callback(new Error('密码长度 8-20 位'));
      }
      let kind = 0;
      if (/[a-z]/.test(value)) kind++;
      if (/[A-Z]/.test(value)) kind++;
      if (/\d/.test(value)) kind++;
      if (/[!@#$%^&*(),.?":{}|_\-+=\[\]\\\/;'`~<>]/.test(value)) kind++;
      if (kind < 3) {
        return callback(new Error('密码需包含大小写字母、数字、特殊字符中至少 3 种'));
      }
      callback();
    },
    trigger: 'blur',
  },
];

/** 用户名校验：4-20 位字母数字下划线 */
export const usernameRule: FormItemRule[] = [
  { required: true, message: '请输入用户名', trigger: 'blur' },
  {
    pattern: /^[a-zA-Z0-9_]{4,20}$/,
    message: '用户名为 4-20 位字母、数字或下划线',
    trigger: 'blur',
  },
];

/** 身份证号校验 */
export const idCardRule: FormItemRule[] = [
  { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '身份证号格式错误', trigger: 'blur' },
];

/** 必填校验 */
export function required(message: string): FormItemRule {
  return { required: true, message, trigger: 'blur' };
}

/** 必选校验（change 触发） */
export function requiredSelect(message: string): FormItemRule {
  return { required: true, message, trigger: 'change' };
}
