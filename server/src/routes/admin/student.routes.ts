import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import { createUploader } from '../../shared/file/upload';
import * as studentController from '../../controllers/admin/student.controller';

const router = Router();
const excelUploader = createUploader({
  maxSizeMB: 5,
  allowedMime: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
});

router.use(authMiddleware, adminOnly);

const createSchema = z.object({
  studentNo: z.string().min(1, '学号不能为空'),
  name: z.string().min(1, '姓名不能为空'),
  gender: z.enum(['MALE', 'FEMALE']),
  departmentId: z.string().uuid(),
  classId: z.string().uuid(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式错误').optional(),
  hometown: z.string().optional(),
  address: z.string().optional(),
  enrollDate: z.string().optional(),
  password: z.string().min(6).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  departmentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  hometown: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['NORMAL', 'SUSPENDED', 'RESUMED', 'DROPPED', 'HELD_BACK', 'GRADUATED']).optional(),
  enrollDate: z.string().optional().nullable(),
  graduateDate: z.string().optional().nullable(),
});

/** GET /api/admin/students —— 学生档案列表 */
router.get('/', asyncHandler(studentController.list));

/** GET /api/admin/students/export —— 导出 Excel */
router.get('/export', asyncHandler(studentController.exportExcel));

/** GET /api/admin/students/import/template —— 下载导入模板 */
router.get('/import/template', asyncHandler(studentController.importTemplate));

/** POST /api/admin/students/import —— Excel 批量导入 */
router.post('/import', excelUploader.single('file'), asyncHandler(studentController.importExcel));

/** GET /api/admin/students/:id —— 学生详情 */
router.get('/:id', asyncHandler(studentController.detail));

/** POST /api/admin/students —— 录入学生档案 */
router.post('/', validate({ body: createSchema }), asyncHandler(studentController.create));

/** PUT /api/admin/students/:id —— 编辑档案 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(studentController.update));

/** PUT /api/admin/students/:id/password —— 重置密码 */
router.put('/:id/password', asyncHandler(studentController.resetPassword));

/** DELETE /api/admin/students/:id —— 删除（软删除） */
router.delete('/:id', asyncHandler(studentController.remove));

export default router;
