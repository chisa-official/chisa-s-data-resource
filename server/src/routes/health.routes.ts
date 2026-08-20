import { Router } from 'express';
import { success } from '../shared/response/response';

const router = Router();

/** GET /api/health —— 健康检查 */
router.get('/health', (_req, res) => {
  res.json(success({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));
});

export default router;
