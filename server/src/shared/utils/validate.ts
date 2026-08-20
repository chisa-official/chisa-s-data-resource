/** 密码强度校验：8-20 位，至少包含大小写字母、数字、特殊字符中的 3 种 */
export function validateStrongPassword(password: string): string | null {
  if (!password) return '密码不能为空';
  if (password.length < 8 || password.length > 20) return '密码长度 8-20 位';
  let kind = 0;
  if (/[a-z]/.test(password)) kind++;
  if (/[A-Z]/.test(password)) kind++;
  if (/\d/.test(password)) kind++;
  if (/[!@#$%^&*(),.?":{}|_\-+=\[\]\\\/;'`~<>]/.test(password)) kind++;
  if (kind < 3) return '密码需包含大小写字母、数字、特殊字符中至少 3 种';
  return null;
}

/** 学号格式校验：8-12 位数字 */
export function validateStudentNo(studentNo: string): string | null {
  if (!studentNo) return '学号不能为空';
  if (!/^\d{8,12}$/.test(studentNo)) return '学号为 8-12 位数字';
  return null;
}

/** 用户名格式校验：4-20 位字母数字下划线 */
export function validateUsername(username: string): string | null {
  if (!username) return '用户名不能为空';
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) return '用户名为 4-20 位字母、数字或下划线';
  return null;
}

/** 手机号校验 */
export function validatePhone(phone?: string | null): string | null {
  if (!phone) return null;
  if (!/^1[3-9]\d{9}$/.test(phone)) return '手机号格式错误';
  return null;
}

/** 邮箱校验 */
export function validateEmail(email?: string | null): string | null {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return '邮箱格式错误';
  return null;
}
