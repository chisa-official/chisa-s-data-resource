import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { comparePassword, hashPassword } from '../../shared/utils/crypto';
import { signAccessToken, signRefreshToken, revokeRefreshToken, verifyRefreshToken } from '../../shared/auth/jwt';
import { blacklistToken } from '../../shared/auth/blacklist';
import { UserType, Gender, StudentStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../shared/auth/jwt';
import {
  validateStrongPassword,
  validateStudentNo,
  validatePhone,
  validateEmail,
} from '../../shared/utils/validate';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  student: StudentProfile;
  /** 是否处于待分配状态（注册后尚未分配真实班级） */
  pendingAssign?: boolean;
}

export interface StudentProfile {
  id: string;
  studentNo: string;
  name: string;
  gender: string;
  photoUrl?: string | null;
  departmentId: string;
  department?: { id: string; name: string; code: string };
  classId: string;
  class?: { id: string; name: string };
  phone?: string | null;
  email?: string | null;
  hometown?: string | null;
  address?: string | null;
  status: string;
  enrollDate?: string | null;
  graduateDate?: string | null;
  createdAt: string;
}

export interface RegisterParams {
  studentNo: string;
  password: string;
  confirmPassword: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
}

/** 学生注册：默认挂靠到「待分配」院系/班级，等待后台审核后分配真实班级 */
export async function register(params: RegisterParams): Promise<{ id: string; studentNo: string }> {
  const { studentNo, password, confirmPassword, name, gender, phone, email } = params;

  // 1. 基本字段校验
  const err = validateStudentNo(studentNo);
  if (err) throw ApiError.badRequest(err);
  const pwdErr = validateStrongPassword(password);
  if (pwdErr) throw ApiError.badRequest(pwdErr);
  if (password !== confirmPassword) throw ApiError.badRequest('两次输入的密码不一致');
  if (!name?.trim()) throw ApiError.badRequest('姓名不能为空');
  if (gender !== 'MALE' && gender !== 'FEMALE') throw ApiError.badRequest('性别参数错误');
  const phoneErr = validatePhone(phone);
  if (phoneErr) throw ApiError.badRequest(phoneErr);
  const emailErr = validateEmail(email);
  if (emailErr) throw ApiError.badRequest(emailErr);

  // 2. 学号唯一性校验
  const existing = await prisma.student.findUnique({ where: { studentNo } });
  if (existing) throw ApiError.badRequest('该学号已被注册');

  // 3. 获取「待分配」虚拟院系/班级（注册时默认挂靠此处，后台审核后再修改）
  const pendingDept = await prisma.department.findFirst({ where: { code: 'PENDING' } });
  const pendingClass = await prisma.class.findFirst({
    where: { name: '待分配', department: { code: 'PENDING' } },
  });
  if (!pendingDept || !pendingClass) {
    throw ApiError.internal('虚拟组织机构未初始化，请先执行 seed 初始化数据');
  }

  // 4. 创建学生记录
  const hashed = await hashPassword(password);
  const created = await prisma.student.create({
    data: {
      studentNo,
      password: hashed,
      name: name.trim(),
      gender: gender as Gender,
      departmentId: pendingDept.id,
      classId: pendingClass.id,
      phone: phone || null,
      email: email || null,
      status: StudentStatus.NORMAL,
    },
  });

  return { id: created.id, studentNo: created.studentNo };
}

/** 学号 + 密码登录 */
export async function login(studentNo: string, password: string): Promise<LoginResult> {
  const student = await prisma.student.findUnique({
    where: { studentNo },
    include: {
      department: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!student) throw ApiError.unauthorized('学号或密码错误');

  // 退学/毕业学生禁止登录
  if (student.status === 'DROPPED' || student.status === 'GRADUATED') {
    throw ApiError.forbidden('该学籍状态不允许登录');
  }

  const ok = await comparePassword(password, student.password);
  if (!ok) throw ApiError.unauthorized('学号或密码错误');

  const payload = { userId: student.id, userType: UserType.STUDENT, role: 'STUDENT' };
  const accessToken = signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  const pendingAssign = student.department?.code === 'PENDING';

  return {
    accessToken,
    refreshToken,
    student: toProfile(student),
    pendingAssign,
  };
}

/** 刷新 Token：复用 shared 逻辑 */
export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = await verifyRefreshToken(refreshToken);
  await revokeRefreshToken(refreshToken);
  const accessToken = signAccessToken(payload);
  const newRefresh = await signRefreshToken(payload);
  return { accessToken, refreshToken: newRefresh };
}

/** 登出：accessToken 加黑名单 + refreshToken 撤销 */
export async function logout(accessToken?: string, refreshToken?: string): Promise<void> {
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      const ttl = decoded?.exp ? decoded.exp * 1000 - Date.now() : undefined;
      blacklistToken(accessToken, ttl && ttl > 0 ? ttl : undefined);
    } catch {
      // ignore
    }
  }
  if (refreshToken) await revokeRefreshToken(refreshToken);
}

/** 序列化 Student 为档案对象 */
function toProfile(s: any): StudentProfile {
  return {
    id: s.id,
    studentNo: s.studentNo,
    name: s.name,
    gender: s.gender,
    photoUrl: s.photoUrl,
    departmentId: s.departmentId,
    department: s.department,
    classId: s.classId,
    class: s.class,
    phone: s.phone,
    email: s.email,
    hometown: s.hometown,
    address: s.address,
    status: s.status,
    enrollDate: s.enrollDate ? s.enrollDate.toISOString() : null,
    graduateDate: s.graduateDate ? s.graduateDate.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
  };
}
