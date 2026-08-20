import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { success } from '../../shared/response/response';
import { validate } from '../../shared/validate/zod';
import { z } from 'zod';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../../shared/auth/jwt';
import { blacklistToken } from '../../shared/auth/blacklist';
import { ApiError } from '../../shared/error/ApiError';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../shared/auth/jwt';

const router = Router();

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

/** POST /api/auth/refresh —— 用 refreshToken 换新 accessToken */
router.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const payload = await verifyRefreshToken(refreshToken);
    // 撤销旧 refresh，签发新的（轮换）
    await revokeRefreshToken(refreshToken);
    const accessToken = signAccessToken(payload);
    const newRefresh = await signRefreshToken(payload);
    res.json(success({ accessToken, refreshToken: newRefresh }));
  }),
);

/** POST /api/auth/logout —— 登出，Token 加入黑名单 */
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    const refreshToken = req.body.refreshToken;
    if (header && header.startsWith('Bearer ')) {
      const token = header.slice(7);
      // 计算 token 剩余有效期作为黑名单 TTL
      try {
        const decoded = jwt.decode(token) as { exp?: number } | null;
        const ttl = decoded?.exp ? decoded.exp * 1000 - Date.now() : undefined;
        blacklistToken(token, ttl && ttl > 0 ? ttl : undefined);
      } catch {
        // ignore
      }
    }
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json(success(null, '已登出'));
  }),
);

export default router;
