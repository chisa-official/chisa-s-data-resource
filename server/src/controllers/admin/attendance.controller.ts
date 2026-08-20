import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as attendanceService from '../../services/admin/attendance.service';

// ========== 考勤录入 ==========

export async function importAttendance(req: Request, res: Response): Promise<void> {
  const result = await attendanceService.importAttendance(req.body.items || req.body);
  res.json(success(result, `录入完成：成功 ${result.successCount} 条`));
}

// ========== 考勤记录查询 ==========

export async function listAttendance(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', studentNo, studentName, classId, courseId, status, startDate, endDate } = req.query;
  const result = await attendanceService.listAttendance({
    page: Number(page),
    pageSize: Number(pageSize),
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    classId: classId as string | undefined,
    courseId: courseId as string | undefined,
    status: status as any | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

// ========== 考勤统计 ==========

export async function getStatistics(req: Request, res: Response): Promise<void> {
  const { classId, startDate, endDate } = req.query;
  const result = await attendanceService.getAttendanceStatistics({
    classId: classId as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json(success(result));
}

// ========== 考勤预警 ==========

export async function getWarnings(req: Request, res: Response): Promise<void> {
  const { classId } = req.query;
  const result = await attendanceService.getAttendanceWarnings({
    classId: classId as string | undefined,
  });
  res.json(success(result));
}

// ========== 预警规则配置 ==========

export async function getRule(req: Request, res: Response): Promise<void> {
  const result = await attendanceService.getAttendanceRule();
  res.json(success(result));
}

export async function updateRule(req: Request, res: Response): Promise<void> {
  const result = await attendanceService.updateAttendanceRule(req.body);
  res.json(success(result, '规则已更新'));
}
