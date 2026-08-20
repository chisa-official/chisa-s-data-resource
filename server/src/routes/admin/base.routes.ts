import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as baseController from '../../controllers/admin/base.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

// ========== 院系 ==========

const deptSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  code: z.string().min(1, '编码不能为空'),
  parentId: z.string().uuid().optional().nullable(),
  sort: z.number().int().optional(),
});

router.get('/departments/tree', asyncHandler(baseController.departmentTree));
router.get('/departments', asyncHandler(baseController.departmentList));
router.post('/departments', validate({ body: deptSchema }), asyncHandler(baseController.departmentCreate));
router.put('/departments/:id', validate({ body: deptSchema.partial() }), asyncHandler(baseController.departmentUpdate));
router.delete('/departments/:id', asyncHandler(baseController.departmentRemove));

// ========== 专业 ==========

const majorSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  code: z.string().min(1, '编码不能为空'),
  departmentId: z.string().uuid('院系ID格式错误'),
  duration: z.number().int().min(1).max(6),
});

router.get('/majors', asyncHandler(baseController.majorList));
router.post('/majors', validate({ body: majorSchema }), asyncHandler(baseController.majorCreate));
router.put('/majors/:id', validate({ body: majorSchema.partial() }), asyncHandler(baseController.majorUpdate));
router.delete('/majors/:id', asyncHandler(baseController.majorRemove));

// ========== 班级 ==========

const classSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  departmentId: z.string().uuid(),
  majorId: z.string().uuid(),
  grade: z.number().int().min(2000).max(2100),
  counselorId: z.string().uuid().optional().nullable(),
});

router.get('/classes', asyncHandler(baseController.classList));
router.post('/classes', validate({ body: classSchema }), asyncHandler(baseController.classCreate));
router.put('/classes/:id', validate({ body: classSchema.partial() }), asyncHandler(baseController.classUpdate));
router.delete('/classes/:id', asyncHandler(baseController.classRemove));

// ========== 教师 ==========

const teacherSchema = z.object({
  teacherNo: z.string().min(1, '工号不能为空'),
  name: z.string().min(1, '姓名不能为空'),
  gender: z.enum(['MALE', 'FEMALE']),
  departmentId: z.string().uuid(),
  title: z.string().optional(),
  phone: z.string().optional(),
});

router.get('/teachers', asyncHandler(baseController.teacherList));
router.post('/teachers', validate({ body: teacherSchema }), asyncHandler(baseController.teacherCreate));
router.put('/teachers/:id', validate({ body: teacherSchema.partial() }), asyncHandler(baseController.teacherUpdate));
router.delete('/teachers/:id', asyncHandler(baseController.teacherRemove));

// ========== 课程 ==========

const courseSchema = z.object({
  code: z.string().min(1, '课程编码不能为空'),
  name: z.string().min(1, '课程名称不能为空'),
  credit: z.number().min(0),
  hours: z.number().int().min(0),
  teacherId: z.string().uuid(),
  departmentId: z.string().uuid(),
  type: z.enum(['REQUIRED', 'ELECTIVE', 'PUBLIC']),
  capacity: z.number().int().min(1).optional(),
  selectStart: z.string().optional().nullable(),
  selectEnd: z.string().optional().nullable(),
});

router.get('/courses', asyncHandler(baseController.courseList));
router.post('/courses', validate({ body: courseSchema }), asyncHandler(baseController.courseCreate));
router.put('/courses/:id', validate({ body: courseSchema.partial() }), asyncHandler(baseController.courseUpdate));
router.delete('/courses/:id', asyncHandler(baseController.courseRemove));

// ========== 字典 ==========

const dictSchema = z.object({
  type: z.string().min(1, '字典类型不能为空'),
  label: z.string().min(1, '标签不能为空'),
  value: z.string().min(1, '值不能为空'),
  sort: z.number().int().optional(),
});

router.get('/dicts', asyncHandler(baseController.dictList));
router.get('/dicts/:type', asyncHandler(baseController.dictByType));
router.post('/dicts', validate({ body: dictSchema }), asyncHandler(baseController.dictCreate));
router.put('/dicts/:id', validate({ body: dictSchema.partial() }), asyncHandler(baseController.dictUpdate));
router.delete('/dicts/:id', asyncHandler(baseController.dictRemove));

export default router;
