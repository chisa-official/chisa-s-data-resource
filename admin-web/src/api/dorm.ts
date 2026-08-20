import { get, post, put, del } from '@shared-web/utils/request';
import type {
  PageResult,
  Gender,
  AssignStatus,
  Dorm,
  DormInspection,
  DormViolation,
  Repair,
  RepairType,
  RepairStatus,
} from '@shared-web/types';

// ========== 宿舍/床位管理 ==========

export interface DormListResult extends Dorm {
  occupiedCount: number;
  vacantCount: number;
  assignments: { id: string; bedNo: string; student: { id: string; studentNo: string; name: string } }[];
  createdAt: string;
}

export interface DormBed {
  bedNo: string;
  occupied: boolean;
  student: { id: string; studentNo: string; name: string; gender: Gender } | null;
  moveInDate: string | null;
}

export interface DormBedsResult {
  id: string;
  building: string;
  roomNo: string;
  capacity: number;
  gender: Gender;
  beds: DormBed[];
}

export function listDorms(params: {
  page?: number;
  pageSize?: number;
  building?: string;
  roomNo?: string;
  gender?: Gender;
}): Promise<PageResult<DormListResult>> {
  return get('/admin/dorms', params);
}

export function getDormBeds(id: string): Promise<DormBedsResult> {
  return get(`/admin/dorms/${id}/beds`);
}

export function createDorm(params: {
  building: string;
  roomNo: string;
  capacity: number;
  gender: Gender;
  beds: string[];
}): Promise<Dorm> {
  return post('/admin/dorms', params);
}

export function updateDorm(id: string, params: Partial<{
  building: string;
  roomNo: string;
  capacity: number;
  gender: Gender;
  beds: string[];
}>): Promise<Dorm> {
  return put(`/admin/dorms/${id}`, params);
}

export function deleteDorm(id: string): Promise<void> {
  return del(`/admin/dorms/${id}`);
}

// ========== 入住分配 / 调宿 / 退宿 ==========

export interface AssignmentResult {
  id: string;
  studentId: string;
  dormId: string;
  bedNo: string;
  moveInDate: string;
  moveOutDate?: string;
  status: AssignStatus;
  student: { id: string; studentNo: string; name: string; gender: Gender; department?: { name: string }; class?: { name: string } };
  dorm: { id: string; building: string; roomNo: string; gender: Gender };
}

export function listAssignments(params: {
  page?: number;
  pageSize?: number;
  dormId?: string;
  building?: string;
  studentNo?: string;
  studentName?: string;
  status?: AssignStatus;
}): Promise<PageResult<AssignmentResult>> {
  return get('/admin/dorms/assignments', params);
}

export function assignDorm(params: {
  studentId: string;
  dormId: string;
  bedNo: string;
  moveInDate?: string;
}): Promise<AssignmentResult> {
  return post('/admin/dorms/assign', params);
}

export function transferDorm(params: {
  studentId: string;
  dormId: string;
  bedNo: string;
}): Promise<AssignmentResult> {
  return put('/admin/dorms/transfer', params);
}

export function checkoutDorm(params: { studentId: string }): Promise<AssignmentResult> {
  return put('/admin/dorms/checkout', params);
}

// ========== 卫生检查 ==========

export interface InspectionResult extends DormInspection {
  dorm?: { id: string; building: string; roomNo: string };
}

export function listInspections(params: {
  page?: number;
  pageSize?: number;
  dormId?: string;
  building?: string;
}): Promise<PageResult<InspectionResult>> {
  return get('/admin/dorms/inspections', params);
}

export function createInspection(params: {
  dormId: string;
  score: number;
  issues?: string;
  inspectedAt: string;
}): Promise<InspectionResult> {
  return post('/admin/dorms/inspections', params);
}

export function updateInspection(id: string, params: Partial<{
  score: number;
  issues: string;
  inspectedAt: string;
}>): Promise<InspectionResult> {
  return put(`/admin/dorms/inspections/${id}`, params);
}

export function deleteInspection(id: string): Promise<void> {
  return del(`/admin/dorms/inspections/${id}`);
}

// ========== 宿舍违纪 ==========

export interface ViolationResult extends DormViolation {
  dorm?: { id: string; building: string; roomNo: string };
  student?: { id: string; studentNo: string; name: string; department?: { name: string }; class?: { name: string } };
}

export function listViolations(params: {
  page?: number;
  pageSize?: number;
  dormId?: string;
  building?: string;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<ViolationResult>> {
  return get('/admin/dorms/violations', params);
}

export function createViolation(params: {
  dormId: string;
  studentId?: string;
  type: string;
  description: string;
  occurredAt: string;
}): Promise<ViolationResult> {
  return post('/admin/dorms/violations', params);
}

export function updateViolation(id: string, params: Partial<{
  type: string;
  description: string;
  occurredAt: string;
}>): Promise<ViolationResult> {
  return put(`/admin/dorms/violations/${id}`, params);
}

export function deleteViolation(id: string): Promise<void> {
  return del(`/admin/dorms/violations/${id}`);
}

// ========== 报修工单处理 ==========

export interface RepairResult extends Repair {
  student?: { id: string; studentNo: string; name: string; department?: { name: string }; class?: { name: string } };
}

export function listRepairs(params: {
  page?: number;
  pageSize?: number;
  status?: RepairStatus;
  type?: RepairType;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<RepairResult>> {
  return get('/admin/dorms/repairs', params);
}

export function handleRepair(id: string, params: {
  status: RepairStatus;
  result?: string;
}): Promise<Repair> {
  return put(`/admin/dorms/repairs/${id}`, params);
}
