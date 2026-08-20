import { get, post, put, del } from '@shared-web/utils/request';
import type { PageResult, Department, Major, Class, Teacher, Course } from '@shared-web/types';

// ========== 院系 ==========

export function getDepartmentTree(): Promise<Department[]> {
  return get('/admin/base/departments/tree');
}

export function getDepartmentList(): Promise<Department[]> {
  return get('/admin/base/departments');
}

export function createDepartment(params: { name: string; code: string; parentId?: string; sort?: number }): Promise<Department> {
  return post('/admin/base/departments', params);
}

export function updateDepartment(id: string, params: Partial<{ name: string; code: string; parentId: string | null; sort: number }>): Promise<Department> {
  return put(`/admin/base/departments/${id}`, params);
}

export function deleteDepartment(id: string): Promise<void> {
  return del(`/admin/base/departments/${id}`);
}

// ========== 专业 ==========

export interface MajorListResult extends Major {
  department?: { id: string; name: string };
}

export function listMajors(params: { page?: number; pageSize?: number; departmentId?: string; name?: string }): Promise<PageResult<MajorListResult>> {
  return get('/admin/base/majors', params);
}

export function createMajor(params: { name: string; code: string; departmentId: string; duration: number }): Promise<Major> {
  return post('/admin/base/majors', params);
}

export function updateMajor(id: string, params: Partial<{ name: string; code: string; departmentId: string; duration: number }>): Promise<Major> {
  return put(`/admin/base/majors/${id}`, params);
}

export function deleteMajor(id: string): Promise<void> {
  return del(`/admin/base/majors/${id}`);
}

// ========== 班级 ==========

export interface ClassListResult extends Class {
  department?: { id: string; name: string };
  major?: { id: string; name: string };
  studentCount?: number;
}

export function listClasses(params: { page?: number; pageSize?: number; departmentId?: string; majorId?: string; name?: string }): Promise<PageResult<ClassListResult>> {
  return get('/admin/base/classes', params);
}

export function createClass(params: { name: string; departmentId: string; majorId: string; grade: number; counselorId?: string }): Promise<Class> {
  return post('/admin/base/classes', params);
}

export function updateClass(id: string, params: Partial<{ name: string; departmentId: string; majorId: string; grade: number; counselorId: string | null }>): Promise<Class> {
  return put(`/admin/base/classes/${id}`, params);
}

export function deleteClass(id: string): Promise<void> {
  return del(`/admin/base/classes/${id}`);
}

// ========== 教师 ==========

export interface TeacherListResult extends Teacher {
  department?: { id: string; name: string };
}

export function listTeachers(params: { page?: number; pageSize?: number; departmentId?: string; name?: string }): Promise<PageResult<TeacherListResult>> {
  return get('/admin/base/teachers', params);
}

export function createTeacher(params: { teacherNo: string; name: string; gender: string; departmentId: string; title?: string; phone?: string }): Promise<Teacher> {
  return post('/admin/base/teachers', params);
}

export function updateTeacher(id: string, params: Partial<{ teacherNo: string; name: string; gender: string; departmentId: string; title: string; phone: string }>): Promise<Teacher> {
  return put(`/admin/base/teachers/${id}`, params);
}

export function deleteTeacher(id: string): Promise<void> {
  return del(`/admin/base/teachers/${id}`);
}

// ========== 课程 ==========

export interface CourseListResult extends Omit<Course, 'teacher' | 'department'> {
  teacher?: { id: string; name: string };
  department?: { id: string; name: string };
}

export function listCourses(params: { page?: number; pageSize?: number; departmentId?: string; name?: string; type?: string }): Promise<PageResult<CourseListResult>> {
  return get('/admin/base/courses', params);
}

export function createCourse(params: {
  code: string; name: string; credit: number; hours: number;
  teacherId: string; departmentId: string; type: string; capacity?: number;
  selectStart?: string; selectEnd?: string;
}): Promise<Course> {
  return post('/admin/base/courses', params);
}

export function updateCourse(id: string, params: Partial<{
  code: string; name: string; credit: number; hours: number;
  teacherId: string; departmentId: string; type: string; capacity: number;
  selectStart: string | null; selectEnd: string | null;
}>): Promise<Course> {
  return put(`/admin/base/courses/${id}`, params);
}

export function deleteCourse(id: string): Promise<void> {
  return del(`/admin/base/courses/${id}`);
}

// ========== 字典 ==========

export interface Dict {
  id: string;
  type: string;
  label: string;
  value: string;
  sort: number;
}

export function listDicts(type?: string): Promise<Dict[]> {
  return get('/admin/base/dicts', { type });
}

export function getDictsByType(type: string): Promise<Dict[]> {
  return get(`/admin/base/dicts/${type}`);
}

export function createDict(params: { type: string; label: string; value: string; sort?: number }): Promise<Dict> {
  return post('/admin/base/dicts', params);
}

export function updateDict(id: string, params: Partial<{ type: string; label: string; value: string; sort: number }>): Promise<Dict> {
  return put(`/admin/base/dicts/${id}`, params);
}

export function deleteDict(id: string): Promise<void> {
  return del(`/admin/base/dicts/${id}`);
}
