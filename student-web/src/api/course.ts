import { get, post, del } from './request';
import type { Score, Course, Schedule, SelectionStatus, CourseType } from '@shared-web/types';

export interface TimetableItem extends Omit<Schedule, 'course'> {
  course: {
    id: string;
    code: string;
    name: string;
    credit: number;
    type: CourseType;
    teacher: { id: string; name: string };
  };
}

export interface SelectableCourse extends Omit<Course, 'teacher'> {
  teacher: { id: string; name: string; title?: string };
  department: { id: string; name: string };
  schedules: Array<{ weekDay: number; startSection: number; endSection: number; classroom: string }>;
  selectedCount: number;
  remaining: number;
  isSelected: boolean;
}

export interface ScoreWithCourse extends Omit<Score, 'course'> {
  course: { id: string; code: string; name: string; credit: number; type: CourseType };
}

export interface GpaResult {
  semesters: Array<{ semester: string; totalCredits: number; gpa: number }>;
  overallGpa: number;
  totalCredits: number;
}

export interface MySelection extends CourseSelection {}

export interface CourseSelection {
  id: string;
  studentId: string;
  courseId: string;
  status: SelectionStatus;
  semester: string;
  createdAt: string;
  course: {
    id: string;
    code: string;
    name: string;
    credit: number;
    type: CourseType;
    teacher: { name: string };
    schedules: Array<{ weekDay: number; startSection: number; endSection: number; classroom: string }>;
  };
}

const DEFAULT_SEMESTER = '2025-2026-1';

/** 课表 */
export function getTimetable(semester = DEFAULT_SEMESTER, week = 1): Promise<TimetableItem[]> {
  return get('/student/course/timetable', { semester, week });
}

/** 成绩列表 */
export function getScores(semester?: string): Promise<{ grouped: Record<string, ScoreWithCourse[]>; list: ScoreWithCourse[] }> {
  return get('/student/course/score', semester ? { semester } : {});
}

/** 绩点统计 */
export function getGpa(semester?: string): Promise<GpaResult> {
  return get('/student/course/gpa', semester ? { semester } : {});
}

/** 可选课程 */
export function getSelectableCourses(semester = DEFAULT_SEMESTER): Promise<SelectableCourse[]> {
  return get('/student/course/selectable', { semester });
}

/** 我的已选课程 */
export function getMySelections(semester = DEFAULT_SEMESTER): Promise<MySelection[]> {
  return get('/student/course/my-selections', { semester });
}

/** 选课 */
export function selectCourse(courseId: string, semester = DEFAULT_SEMESTER): Promise<CourseSelection> {
  return post('/student/course/select', { courseId, semester });
}

/** 退选 */
export function dropCourse(selectionId: string): Promise<CourseSelection> {
  return del(`/student/course/select/${selectionId}`);
}

/** 可重修课程 */
export function getRetakeableCourses(): Promise<ScoreWithCourse[]> {
  return get('/student/course/retake');
}

/** 报名重修 */
export function applyRetake(courseId: string, semester = DEFAULT_SEMESTER): Promise<CourseSelection> {
  return post('/student/course/retake', { courseId, semester });
}

/** 补考报名列表 */
export function getExamRetakeList(): Promise<ScoreWithCourse[]> {
  return get('/student/course/exam/retake');
}

/** 补考报名 */
export function applyExamRetake(scoreId: string): Promise<Score> {
  return post('/student/course/exam/retake', { scoreId });
}
