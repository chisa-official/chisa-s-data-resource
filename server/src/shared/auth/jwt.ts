import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { UserType } from '@prisma/client';
import { ApiError } from '../error/ApiError';
import { isBlacklisted } from './blacklist';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '2h';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

export interface JwtPayload {
  userId: string;
  userType: UserType;
  role?: string;       // 学生角色固定 STUDENT；管理员为角色 code
  roleId?: string;     // 管理员角色 ID
}

/** 签发 Access Token */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES as any });
}

/** 签发 Refresh Token：同时写入数据库 */
export async function signRefreshToken(payload: JwtPayload): Promise<string> {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES as any });
  const decoded = jwt.decode(token) as { exp: number };
  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      userType: payload.userType,
      token,
      expiresAt: new Date(decoded.exp * 1000),
    },
  });
  return token;
}

/** 校验 Token：签名、过期、黑名单 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  if (isBlacklisted(token)) {
    throw ApiError.unauthorized('Token 已失效');
  }
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw ApiError.unauthorized('Token 无效或已过期');
  }
}

/** 校验 Refresh Token：签名 + 数据库存在且未撤销 */
export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const record = await prisma.refreshToken.findUnique({ where: { token } });
    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh Token 无效');
    }
    return decoded;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw ApiError.unauthorized('Refresh Token 无效');
  }
}

/** 撤销 Refresh Token */
export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

export { JWT_SECRET };
