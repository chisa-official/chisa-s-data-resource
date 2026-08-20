import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as retakeService from '../../services/admin/retake.service';

// ========== 重修管理 ==========

export async function listRetakes(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', studentNo, studentName, courseId, semester } = req.query;
  const result = await retakeService.listRetakes({
    page: Number(page),
    pageSize: Number(pageSize),
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    courseId: courseId as string | undefined,
    semester: semester as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function registerRetake(req: Request, res: Response): Promise<void> {
  const result = await retakeService.registerRetake(req.body.scoreIds, req.body.semester);
  res.json(success(result, `已报名重修：新建 ${result.created} 条，更新 ${result.updated} 条`));
}

// ========== 补考管理 ==========

export async function listExamRetakes(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', studentNo, studentName, courseId, semester, retake } = req.query;
  const result = await retakeService.listExamRetakes({
    page: Number(page),
    pageSize: Number(pageSize),
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    courseId: courseId as string | undefined,
    semester: semester as string | undefined,
    retake: retake === undefined ? undefined : retake === 'true',
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function recordExamRetakeScore(req: Request, res: Response): Promise<void> {
  const result = await retakeService.recordExamRetakeScore(req.params.id, Number(req.body.retakeScore));
  res.json(success(result, '补考成绩已登记'));
}

export async function batchMarkRetake(req: Request, res: Response): Promise<void> {
  const result = await retakeService.batchMarkRetake(req.body.scoreIds || []);
  res.json(success(result, `已标记 ${result.count} 条补考`));
}
