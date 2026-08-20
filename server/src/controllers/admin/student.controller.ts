import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import { requireAdminId } from '../../middlewares/admin';
import * as studentService from '../../services/admin/student.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', studentNo, name, departmentId, classId, status } = req.query;
  const result = await studentService.studentList({
    page: Number(page),
    pageSize: Number(pageSize),
    studentNo: studentNo as string | undefined,
    name: name as string | undefined,
    departmentId: departmentId as string | undefined,
    classId: classId as string | undefined,
    status: status as any | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function detail(req: Request, res: Response): Promise<void> {
  const result = await studentService.studentDetail(req.params.id);
  res.json(success(result));
}

export async function create(req: Request, res: Response): Promise<void> {
  const result = await studentService.studentCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function update(req: Request, res: Response): Promise<void> {
  const result = await studentService.studentUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await studentService.studentRemove(req.params.id);
  res.json(success(result, result.softDeleted ? '已置为退学（关联数据保留）' : '删除成功'));
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const result = await studentService.studentResetPassword(req.params.id, req.body.password);
  res.json(success(result, result.defaultPassword ? '已重置为默认密码 123456' : '密码已重置'));
}

export async function exportExcel(req: Request, res: Response): Promise<void> {
  const { studentNo, name, departmentId, classId, status } = req.query;
  const buffer = await studentService.studentExport({
    studentNo: studentNo as string | undefined,
    name: name as string | undefined,
    departmentId: departmentId as string | undefined,
    classId: classId as string | undefined,
    status: status as any | undefined,
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="students_${Date.now()}.xlsx"`);
  res.send(buffer);
}

export async function importExcel(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.json(success(null, '请上传 Excel 文件'));
    return;
  }
  const result = await studentService.studentImport(req.file);
  res.json(success(result, `导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`));
}

export async function importTemplate(req: Request, res: Response): Promise<void> {
  const buffer = await studentService.studentImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="student_import_template.xlsx"`);
  res.send(buffer);
}
