import { get, post, put, del } from '@shared-web/utils/request';
import { downloadFile } from '@shared-web/utils/download';
import type { PageResult, Schedule, Score, Course, SelectionStatus } from '@shared-web/types';

// ========== 排课管理 ==========

export interface ScheduleListResult extends Omit<Schedule, 'course'> {
  course?: {
    id: string;
    code: string;
    name: string;
    credit: number;
    teacher?: { id: string; name: string };
  };
  className?: string;
}

export function listSchedules(params: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  classId?: string;
  classroom?: string;
  weekDay?: number;
}): Promise<PageResult<ScheduleListResult>> {
  return get('/admin/schedules', params);
}

export function listAllSchedules(params: {
  courseId?: string;
  classId?: string;
  classroom?: string;
  weekDay?: number;
}): Promise<ScheduleListResult[]> {
  return get('/admin/schedules/all', params);
}

export function createSchedule(params: {
  courseId: string;
  classId: string;
  weekDay: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  classroom: string;
}): Promise<Schedule> {
  return post('/admin/schedules', params);
}

export function updateSchedule(id: string, params: Partial<{
  courseId: string;
  classId: string;
  weekDay: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  classroom: string;
}>): Promise<Schedule> {
  return put(`/admin/schedules/${id}`, params);
}

export function deleteSchedule(id: string): Promise<void> {
  return del(`/admin/schedules/${id}`);
}

export function publishSchedules(ids: string[]): Promise<{ count: number }> {
  return put('/admin/schedules/publish', { ids });
}

// ========== 成绩管理 ==========

export interface ScoreListResult extends Omit<Score, 'student' | 'course'> {
  student?: {
    id: string;
    studentNo: string;
    name: string;
    class?: { name: string };
  };
  course?: {
    id: string;
    code: string;
    name: string;
    credit: number;
    type: string;
  };
}

export function listScores(params: {
  page?: number;
  pageSize?: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
  audited?: boolean;
}): Promise<PageResult<ScoreListResult>> {
  return get('/admin/scores', params);
}

export function updateScore(id: string, params: {
  usualScore?: number;
  examScore?: number;
  finalScore?: number;
  retake?: boolean;
}): Promise<Score> {
  return put(`/admin/scores/${id}`, params);
}

export function auditScore(id: string): Promise<Score> {
  return put(`/admin/scores/${id}/audit`);
}

export function auditScoresBatch(ids: string[]): Promise<{ count: number }> {
  return put('/admin/scores/audit-batch', { ids });
}

export function rejectScore(id: string): Promise<Score> {
  return put(`/admin/scores/${id}/reject`);
}

export function calculateGpa(studentId?: string): Promise<any> {
  return get('/admin/scores/calculate-gpa', studentId ? { studentId } : undefined);
}

export function downloadScoreTemplate(courseId?: string, semester?: string): Promise<void> {
  return downloadFile('/admin/scores/template', { courseId, semester }, 'score_template.xlsx');
}

export function importScores(file: File, courseId?: string, semester?: string): Promise<{
  total: number;
  successCount: number;
  failCount: number;
  errors: { row: number; message: string }[];
}> {
  const formData = new FormData();
  formData.append('file', file);
  return post('/admin/scores/import', formData, {
    params: { courseId, semester },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ========== 选课管理 ==========

export interface SelectionPeriodResult {
  id: string;
  code: string;
  name: string;
  type: string;
  capacity: number;
  selectStart?: string;
  selectEnd?: string;
  teacher?: { id: string; name: string };
  selectedCount: number;
  remaining: number;
  isOpen: boolean;
}

export function listSelectionPeriods(params: { courseId?: string; semester?: string }): Promise<SelectionPeriodResult[]> {
  return get('/admin/selection/period', params);
}

export function updateSelectionPeriod(courseId: string, params: {
  selectStart?: string | null;
  selectEnd?: string | null;
}): Promise<Course> {
  return put(`/admin/selection/period/${courseId}`, params);
}

export function toggleSelection(courseId: string, action: 'OPEN' | 'CLOSE', days?: number): Promise<Course> {
  return put(`/admin/selection/toggle/${courseId}`, { action, days });
}

export interface SelectionListResult {
  id: string;
  studentId: string;
  courseId: string;
  semester: string;
  status: SelectionStatus;
  createdAt: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    class?: { name: string };
  };
  course?: {
    id: string;
    code: string;
    name: string;
    credit: number;
    type: string;
    teacher?: { name: string };
  };
}

export function listSelections(params: {
  page?: number;
  pageSize?: number;
  courseId?: string;
  studentNo?: string;
  studentName?: string;
  semester?: string;
  status?: SelectionStatus;
}): Promise<PageResult<SelectionListResult>> {
  return get('/admin/selection/list', params);
}

export interface SelectionStatisticsResult {
  id: string;
  code: string;
  name: string;
  type: string;
  capacity: number;
  teacherName?: string;
  selectedCount: number;
  fillRate: number;
}

export function selectionStatistics(semester?: string): Promise<SelectionStatisticsResult[]> {
  return get('/admin/selection/statistics', { semester });
}

export function forceDropSelection(id: string): Promise<void> {
  return put(`/admin/selection/${id}/force-drop`);
}

// ========== 重修 / 补考 ==========

export interface RetakeListResult {
  id: string;
  studentId: string;
  courseId: string;
  semester: string;
  finalScore: number;
  gpaPoint: number;
  retake: boolean;
  retakeStatus: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { name: string };
    class?: { name: string };
  };
  course?: {
    id: string;
    code: string;
    name: string;
    credit: number;
    type: string;
    teacher?: { name: string };
  };
}

export function listRetakes(params: {
  page?: number;
  pageSize?: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
}): Promise<PageResult<RetakeListResult>> {
  return get('/admin/retake', params);
}

export function registerRetake(scoreIds: string[], semester?: string): Promise<{
  semester: string;
  created: number;
  updated: number;
  total: number;
}> {
  return post('/admin/retake/register', { scoreIds, semester });
}

export function listExamRetakes(params: {
  page?: number;
  pageSize?: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
  retake?: boolean;
}): Promise<PageResult<RetakeListResult>> {
  return get('/admin/retake/exam', params);
}

export function recordExamRetakeScore(id: string, retakeScore: number): Promise<Score> {
  return put(`/admin/retake/exam/${id}`, { retakeScore });
}

export function batchMarkRetake(scoreIds: string[]): Promise<{ count: number }> {
  return post('/admin/retake/exam/batch', { scoreIds });
}
