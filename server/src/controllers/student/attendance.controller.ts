import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as attendanceService from '../../services/student/attendance.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/attendance/record?startDate=&endDate=&page=&pageSize= —— 考勤记录 */
export async function getRecords(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await attendanceService.getAttendanceRecords(studentId, req.query);
  res.json(success(data));
}

/** GET /api/student/attendance/statistics?startDate=&endDate= —— 缺勤统计 */
export async function getStatistics(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await attendanceService.getAttendanceStatistics(studentId, req.query);
  res.json(success(data));
}
