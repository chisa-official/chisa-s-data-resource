import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** bcrypt 加密密码 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** 校验密码 */
export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
