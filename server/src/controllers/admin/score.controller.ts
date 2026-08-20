import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as scoreService from '../../services/admin/score.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', studentNo, studentName, courseId, semester, audited } = req.query;
  const result = await scoreService.listScores({
    page: Number(page),
    pageSize: Number(pageSize),
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    courseId: courseId as string | undefined,
    semester: semester as string | undefined,
    audited: audited === undefined ? undefined : audited === 'true',
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function update(req: Request, res: Response): Promise<void> {
  const result = await scoreService.updateScore(req.params.id, req.body);
  res.json(success(result, '成绩已更新'));
}

export async function audit(req: Request, res: Response): Promise<void> {
  const result = await scoreService.auditScore(req.params.id);
  res.json(success(result, '审核通过'));
}

export async function auditBatch(req: Request, res: Response): Promise<void> {
  const result = await scoreService.auditScoresBatch(req.body.ids || []);
  res.json(success(result, `已审核 ${result.count} 条成绩`));
}

export async function reject(req: Request, res: Response): Promise<void> {
  const result = await scoreService.rejectScore(req.params.id);
  res.json(success(result, '已打回'));
}

export async function importExcel(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.json(success(null, '请上传 Excel 文件'));
    return;
  }
  const { courseId, semester } = req.query;
  const result = await scoreService.importScores(
    req.file,
    courseId as string | undefined,
    semester as string | undefined,
  );
  res.json(success(result, `导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`));
}

export async function exportTemplate(req: Request, res: Response): Promise<void> {
  const { courseId, semester } = req.query;
  const buffer = await scoreService.exportScoreTemplate(
    courseId as string | undefined,
    semester as string | undefined,
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="score_template.xlsx"`);
  res.send(buffer);
}

export async function calculateGpa(req: Request, res: Response): Promise<void> {
  if (req.query.studentId) {
    const result = await scoreService.calculateGpa(req.query.studentId as string);
    res.json(success(result, '绩点计算完成'));
    return;
  }
  const result = await scoreService.batchCalculateGpa();
  res.json(success(result, `批量绩点计算任务已派发，涉及 ${result.studentCount} 名学生`));
}
