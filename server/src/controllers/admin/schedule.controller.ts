import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as scheduleService from '../../services/admin/schedule.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page, pageSize, courseId, classId, classroom, weekDay } = req.query;
  const result = await scheduleService.listSchedules({
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    classroom: classroom as string | undefined,
    weekDay: weekDay ? Number(weekDay) : undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const { courseId, classId, classroom, weekDay } = req.query;
  const result = await scheduleService.listAllSchedules({
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    classroom: classroom as string | undefined,
    weekDay: weekDay ? Number(weekDay) : undefined,
  });
  res.json(success(result));
}

export async function create(req: Request, res: Response): Promise<void> {
  const result = await scheduleService.createSchedule(req.body);
  res.json(success(result, '排课成功'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const result = await scheduleService.updateSchedule(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await scheduleService.removeSchedule(req.params.id);
  res.json(success(null, '删除成功'));
}

export async function publish(req: Request, res: Response): Promise<void> {
  const result = await scheduleService.publishSchedules(req.body.ids || []);
  res.json(success(result, `已发布 ${result.count} 条排课`));
}
