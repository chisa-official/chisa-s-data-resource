import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import { ApiError } from '../../shared/error/ApiError';
import * as reportService from '../../services/admin/report.service';
import { exportReport, type ExportFormat } from '../../services/admin/reportExport.service';
import type { ReportType } from '../../services/admin/report.service';

// ========== 5 维度统计 ==========

export async function getStudentCount(req: Request, res: Response): Promise<void> {
  const { departmentId } = req.query;
  const result = await reportService.getStudentCountReport(departmentId as string | undefined);
  res.json(success(result));
}

export async function getStatusChange(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  const result = await reportService.getStatusChangeReport(startDate as string | undefined, endDate as string | undefined);
  res.json(success(result));
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  const result = await reportService.getAttendanceReport(startDate as string | undefined, endDate as string | undefined);
  res.json(success(result));
}

export async function getAward(req: Request, res: Response): Promise<void> {
  const { semester } = req.query;
  const result = await reportService.getAwardReport(semester as string | undefined);
  res.json(success(result));
}

export async function getDiscipline(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;
  const result = await reportService.getDisciplineReport(startDate as string | undefined, endDate as string | undefined);
  res.json(success(result));
}

// ========== Dashboard 概览 ==========

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const result = await reportService.getDashboardStats();
  res.json(success(result));
}

// ========== 报表导出 ==========

const VALID_TYPES: ReportType[] = ['student', 'status', 'attendance', 'award', 'discipline'];
const VALID_FORMATS: ExportFormat[] = ['excel', 'pdf'];

export async function exportReportFile(req: Request, res: Response): Promise<void> {
  const { type, format } = req.query;
  if (!type || !VALID_TYPES.includes(type as ReportType)) {
    throw ApiError.badRequest('不支持的报表类型，可选：student/status/attendance/award/discipline');
  }
  if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
    throw ApiError.badRequest('不支持的导出格式，可选：excel/pdf');
  }
  const result = await exportReport(type as ReportType, format as ExportFormat, req.query);
  res.setHeader('Content-Type', result.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
  res.send(result.buffer);
}
