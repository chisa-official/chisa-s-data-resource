import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as courseService from '../../services/student/course.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/course/timetable?semester=&week= */
export async function getTimetable(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const semester = (req.query.semester as string) || '2025-2026-1';
  const week = Number(req.query.week) || 1;
  const data = await courseService.getTimetable(studentId, semester, week);
  res.json(success(data));
}

/** GET /api/student/course/score?semester= */
export async function getScores(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const semester = req.query.semester as string | undefined;
  const data = await courseService.getScores(studentId, semester);
  res.json(success(data));
}

/** GET /api/student/course/gpa?semester= */
export async function getGpa(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const semester = req.query.semester as string | undefined;
  const data = await courseService.getGpa(studentId, semester);
  res.json(success(data));
}

/** GET /api/student/course/selectable?semester= */
export async function getSelectable(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const semester = (req.query.semester as string) || '2025-2026-1';
  const data = await courseService.getSelectableCourses(studentId, semester);
  res.json(success(data));
}

/** GET /api/student/course/my-selections?semester= */
export async function getMySelections(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const semester = (req.query.semester as string) || '2025-2026-1';
  const data = await courseService.getMySelections(studentId, semester);
  res.json(success(data));
}

/** POST /api/student/course/select */
export async function selectCourse(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { courseId, semester } = req.body;
  const data = await courseService.selectCourse(studentId, courseId, semester);
  res.json(success(data, '选课成功'));
}

/** DELETE /api/student/course/select/:id */
export async function dropCourse(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await courseService.dropCourse(studentId, req.params.id);
  res.json(success(data, '退选成功'));
}

/** GET /api/student/course/retake */
export async function getRetakeable(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await courseService.getRetakeableCourses(studentId);
  res.json(success(data));
}

/** POST /api/student/course/retake */
export async function applyRetake(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { courseId, semester } = req.body;
  const data = await courseService.applyRetake(studentId, courseId, semester);
  res.json(success(data, '重修报名成功'));
}

/** GET /api/student/course/exam/retake */
export async function getExamRetakeList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await courseService.getExamRetakeList(studentId);
  res.json(success(data));
}

/** POST /api/student/course/exam/retake */
export async function applyExamRetake(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { scoreId } = req.body;
  const data = await courseService.applyExamRetake(studentId, scoreId);
  res.json(success(data, '补考报名成功'));
}
