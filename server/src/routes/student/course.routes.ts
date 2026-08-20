import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as courseController from '../../controllers/student/course.controller';

const router = Router();

const selectSchema = z.object({
  courseId: z.string().uuid('课程 ID 格式错误'),
  semester: z.string().min(1).default('2025-2026-1'),
});

const retakeSchema = z.object({
  courseId: z.string().uuid('课程 ID 格式错误'),
  semester: z.string().min(1).default('2025-2026-1'),
});

const examRetakeSchema = z.object({
  scoreId: z.string().uuid('成绩 ID 格式错误'),
});

router.use(authMiddleware, studentOnly);

/** GET /api/student/course/timetable —— 课表 */
router.get('/timetable', asyncHandler(courseController.getTimetable));

/** GET /api/student/course/score —— 成绩列表 */
router.get('/score', asyncHandler(courseController.getScores));

/** GET /api/student/course/gpa —— 绩点统计 */
router.get('/gpa', asyncHandler(courseController.getGpa));

/** GET /api/student/course/selectable —— 可选课程 */
router.get('/selectable', asyncHandler(courseController.getSelectable));

/** GET /api/student/course/my-selections —— 我的已选课程 */
router.get('/my-selections', asyncHandler(courseController.getMySelections));

/** POST /api/student/course/select —— 选课 */
router.post('/select', validate({ body: selectSchema }), asyncHandler(courseController.selectCourse));

/** DELETE /api/student/course/select/:id —— 退选 */
router.delete('/select/:id', asyncHandler(courseController.dropCourse));

/** GET /api/student/course/retake —— 可重修课程 */
router.get('/retake', asyncHandler(courseController.getRetakeable));

/** POST /api/student/course/retake —— 报名重修 */
router.post('/retake', validate({ body: retakeSchema }), asyncHandler(courseController.applyRetake));

/** GET /api/student/course/exam/retake —— 补考报名列表 */
router.get('/exam/retake', asyncHandler(courseController.getExamRetakeList));

/** POST /api/student/course/exam/retake —— 补考报名 */
router.post('/exam/retake', validate({ body: examRetakeSchema }), asyncHandler(courseController.applyExamRetake));

export default router;
