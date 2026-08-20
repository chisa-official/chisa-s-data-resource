/** 业务错误类：携带 code、message、status */
export class ApiError extends Error {
  constructor(
    public code: number,
    public override message: string,
    public status = 400,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message = '参数错误'): ApiError {
    return new ApiError(40000, message, 400);
  }

  static unauthorized(message = '未登录或登录已过期'): ApiError {
    return new ApiError(40100, message, 401);
  }

  static forbidden(message = '无权限访问'): ApiError {
    return new ApiError(40300, message, 403);
  }

  static notFound(message = '资源不存在'): ApiError {
    return new ApiError(40400, message, 404);
  }

  static conflict(message = '数据冲突'): ApiError {
    return new ApiError(40900, message, 409);
  }

  static internal(message = '服务器内部错误'): ApiError {
    return new ApiError(50000, message, 500);
  }
}
