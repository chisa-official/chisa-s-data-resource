import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as selectionService from '../../services/admin/selection.service';

// ========== 选课时间段控制 ==========

export async function listPeriods(req: Request, res: Response): Promise<void> {
  const { courseId, semester } = req.query;
  const result = await selectionService.getSelectionPeriods({
    courseId: courseId as string | undefined,
    semester: semester as string | undefined,
  });
  res.json(success(result));
}

export async function updatePeriod(req: Request, res: Response): Promise<void> {
  const result = await selectionService.updateSelectionPeriod(req.params.courseId, req.body);
  res.json(success(result, '选课时间段已更新'));
}

export async function toggle(req: Request, res: Response): Promise<void> {
  const result = await selectionService.toggleSelection(
    req.params.courseId,
    req.body.action,
    req.body.days,
  );
  res.json(success(result, req.body.action === 'OPEN' ? '选课已开放' : '选课已关闭'));
}

// ========== 选课情况查询 ==========

export async function list(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', courseId, studentNo, studentName, semester, status } = req.query;
  const result = await selectionService.listSelections({
    page: Number(page),
    pageSize: Number(pageSize),
    courseId: courseId as string | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    semester: semester as string | undefined,
    status: status as any | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function statistics(req: Request, res: Response): Promise<void> {
  const { semester } = req.query;
  const result = await selectionService.selectionStatistics(semester as string | undefined);
  res.json(success(result));
}

export async function forceDrop(req: Request, res: Response): Promise<void> {
  const result = await selectionService.forceDropSelection(req.params.id);
  res.json(success(result, '已强制退选'));
}
