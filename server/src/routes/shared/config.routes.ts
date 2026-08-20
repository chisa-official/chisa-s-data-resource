import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { success } from '../../shared/response/response';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import {
  getConfig,
  getConfigByGroup,
  setConfig,
  getPublicConfigs,
} from '../../shared/config/config.service';

const router = Router();

/** GET /api/shared/config/public —— 公开配置（无需鉴权） */
router.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const data = await getPublicConfigs();
    res.json(success(data));
  }),
);

// 以下接口需管理员权限
router.use(authMiddleware, adminOnly);

/** GET /api/admin/config?group= —— 查询配置（按分组） */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const group = req.query.group as string | undefined;
    const data = group ? await getConfigByGroup(group) : await getConfigByGroup('system');
    res.json(success(data));
  }),
);

/** PUT /api/admin/config/:key —— 更新配置 */
router.put(
  '/:key',
  asyncHandler(async (req, res) => {
    const { value } = req.body;
    await setConfig(req.params.key, value, req.user!.userId);
    res.json(success(null, '配置已更新'));
  }),
);

export default router;
