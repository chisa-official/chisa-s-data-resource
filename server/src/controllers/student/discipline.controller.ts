import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as disciplineService from '../../services/student/discipline.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/discipline —— 我的违纪记录（只读） */
export async function getDisciplineList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await disciplineService.getDisciplineList(studentId);
  res.json(success(data));
}
