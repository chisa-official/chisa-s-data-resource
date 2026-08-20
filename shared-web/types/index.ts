// 全局共享类型定义（学生端 + 后台端复用，保证两端类型一致）

// ========== 通用响应 ==========

export interface ApiResponse<T = unknown> {
  code: number;       // 0 成功，非 0 失败
  message: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

// ========== 用户与权限 ==========

export enum UserType {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum StudentStatus {
  NORMAL = 'NORMAL',
  SUSPENDED = 'SUSPENDED',
  RESUMED = 'RESUMED',
  DROPPED = 'DROPPED',
  HELD_BACK = 'HELD_BACK',
  GRADUATED = 'GRADUATED',
}

export enum ApplyStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum DataScope {
  ALL = 'ALL',
  DEPARTMENT = 'DEPARTMENT',
  SELF = 'SELF',
}

export enum MenuType {
  DIRECTORY = 'DIRECTORY',
  MENU = 'MENU',
  BUTTON = 'BUTTON',
}

export interface Admin {
  id: string;
  username: string;
  realName: string;
  roleId: string;
  role?: Role;
  phone?: string;
  status: AdminStatus;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  dataScope: DataScope;
  menus?: string[];
  permissions?: string[];
}

export interface Menu {
  id: string;
  parentId?: string;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  sort: number;
  type: MenuType;
  permission?: string;
  visible: boolean;
  children?: Menu[];
}

// ========== 学生 ==========

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender: Gender;
  photoUrl?: string;
  departmentId: string;
  department?: Department;
  classId: string;
  class?: Class;
  phone?: string;
  email?: string;
  hometown?: string;
  address?: string;
  status: StudentStatus;
  familyMembers?: FamilyMember[];
  enrollDate?: string;
  graduateDate?: string;
  createdAt: string;
}

export interface FamilyMember {
  name: string;
  relation: string;
  phone?: string;
  job?: string;
}

// ========== 基础数据 ==========

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  sort: number;
  children?: Department[];
}

export interface Major {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  duration: number;
}

export interface Class {
  id: string;
  name: string;
  departmentId: string;
  majorId: string;
  grade: number;
  counselorId?: string;
}

export interface Teacher {
  id: string;
  teacherNo: string;
  name: string;
  gender: Gender;
  departmentId: string;
  title?: string;
  phone?: string;
}

// ========== 课程与成绩 ==========

export enum CourseType {
  REQUIRED = 'REQUIRED',
  ELECTIVE = 'ELECTIVE',
  PUBLIC = 'PUBLIC',
}

export enum SelectionStatus {
  SELECTED = 'SELECTED',
  DROPPED = 'DROPPED',
  COMPLETED = 'COMPLETED',
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credit: number;
  hours: number;
  teacherId: string;
  teacher?: Teacher;
  departmentId: string;
  type: CourseType;
  capacity: number;
  selectStart?: string;
  selectEnd?: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  course?: Course;
  classId: string;
  weekDay: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  classroom: string;
}

export interface Score {
  id: string;
  studentId: string;
  courseId: string;
  course?: Course;
  semester: string;
  usualScore?: number;
  examScore?: number;
  finalScore: number;
  gpaPoint: number;
  retake: boolean;
  audited: boolean;
  createdAt?: string;
}

// ========== 申请类（学籍异动/请假/奖助/证明） ==========

export enum StatusChangeType {
  SUSPEND = 'SUSPEND',
  RESUME = 'RESUME',
  TRANSFER_MAJOR = 'TRANSFER_MAJOR',
  DROP_OUT = 'DROP_OUT',
}

export enum CertificateType {
  ENROLLMENT = 'ENROLLMENT',
  STATUS = 'STATUS',
}

export enum LeaveType {
  PERSONAL = 'PERSONAL',
  SICK = 'SICK',
}

export interface StatusChange {
  id: string;
  studentId: string;
  type: StatusChangeType;
  reason: string;
  attachmentUrl?: string;
  beforeStatus: StudentStatus;
  afterStatus?: StudentStatus;
  status: ApplyStatus;
  currentStep: number;
  reviewerId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveApply {
  id: string;
  studentId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  status: ApplyStatus;
  currentStep: number;
  approverId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// ========== 奖惩 ==========

export enum AwardType {
  SCHOLARSHIP = 'SCHOLARSHIP',
  AID = 'AID',
  LOAN = 'LOAN',
  HONOR = 'HONOR',
}

export enum DisciplineType {
  WARNING = 'WARNING',
  SERIOUS_WARNING = 'SERIOUS_WARNING',
  DEMERIT = 'DEMERIT',
  EXPEL = 'EXPEL',
}

export interface Award {
  id: string;
  studentId: string;
  type: AwardType;
  name: string;
  amount?: number;
  semester: string;
  status: ApplyStatus;
  attachments?: string[];
  result?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Discipline {
  id: string;
  studentId: string;
  type: DisciplineType;
  reason: string;
  occurredAt: string;
  createdAt?: string;
}

// ========== 考勤 ==========

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  LEAVE = 'LEAVE',
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  scheduleId: string;
  date: string;
  status: AttendanceStatus;
  course?: { id: string; name: string; code: string };
}

export interface AttendanceStatistics {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  rate: number;
}

// ========== 宿舍 ==========

export enum AssignStatus {
  ACTIVE = 'ACTIVE',
  MOVED_OUT = 'MOVED_OUT',
}

export interface Dorm {
  id: string;
  building: string;
  roomNo: string;
  capacity: number;
  gender: Gender;
  beds: string[];
}

export interface DormAssignment {
  id: string;
  studentId: string;
  dormId: string;
  dorm?: Dorm;
  bedNo: string;
  moveInDate: string;
  moveOutDate?: string;
  status: AssignStatus;
}

export interface DormInspection {
  id: string;
  dormId: string;
  score: number;
  issues?: string;
  inspectedAt: string;
  inspectorId: string;
}

export interface DormViolation {
  id: string;
  dormId: string;
  studentId?: string;
  type: string;
  description: string;
  occurredAt: string;
}

// ========== 通知 ==========

export enum NoticeScope {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
  CLASS = 'CLASS',
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  scope: NoticeScope;
  targetId?: string;
  attachments?: string[];
  publishAt: string;
  published: boolean;
  publisherId: string;
  createdAt: string;
  isRead?: boolean;
}

// ========== 报修与反馈 ==========

export enum RepairType {
  DORM = 'DORM',
  CLASSROOM = 'CLASSROOM',
}

export enum RepairStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
}

export enum FeedbackType {
  SUGGESTION = 'SUGGESTION',
  COMPLAINT = 'COMPLAINT',
}

export interface Repair {
  id: string;
  studentId: string;
  type: RepairType;
  location: string;
  description: string;
  images?: string[];
  status: RepairStatus;
  handlerId?: string;
  result?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  type: FeedbackType;
  content: string;
  reply?: string;
  status: ApplyStatus;
  createdAt: string;
}

// ========== 消息 ==========

export enum MessageType {
  SYSTEM = 'SYSTEM',
  NOTICE = 'NOTICE',
  APPROVAL = 'APPROVAL',
  WARNING = 'WARNING',
  REPAIR = 'REPAIR',
}

export interface Message {
  id: string;
  receiverId: string;
  receiverType: UserType;
  title: string;
  content: string;
  type: MessageType;
  bizType?: string;
  bizId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ========== 文件 ==========

export interface FileRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}
