import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { hashPassword } from '../../shared/utils/crypto';
import { writeExcel, readExcel, type ExcelColumn } from '../../shared/io/excel';
import { Gender, StudentStatus } from '@prisma/client';

// ========== 学生档案 CRUD ==========

export interface StudentListParams {
  page: number;
  pageSize: number;
  studentNo?: string;
  name?: string;
  departmentId?: string;
  classId?: string;
  status?: StudentStatus;
}

export async function studentList(params: StudentListParams) {
  const where: any = {};
  if (params.studentNo) where.studentNo = { contains: params.studentNo };
  if (params.name) where.name = { contains: params.name };
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.classId) where.classId = params.classId;
  if (params.status) where.status = params.status;

  const [list, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { studentNo: 'asc' },
    }),
    prisma.student.count({ where }),
  ]);

  return {
    list: list.map((s) => ({
      id: s.id,
      studentNo: s.studentNo,
      name: s.name,
      gender: s.gender,
      departmentId: s.departmentId,
      department: s.department,
      classId: s.classId,
      class: s.class,
      phone: s.phone,
      email: s.email,
      status: s.status,
      enrollDate: s.enrollDate,
      graduateDate: s.graduateDate,
      createdAt: s.createdAt,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function studentDetail(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, major: { select: { id: true, name: true, duration: true } } } },
    },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');
  return student;
}

export async function studentCreate(data: {
  studentNo: string;
  name: string;
  gender: string;
  departmentId: string;
  classId: string;
  phone?: string;
  email?: string;
  hometown?: string;
  address?: string;
  enrollDate?: string;
  password?: string;
}) {
  const existing = await prisma.student.findUnique({ where: { studentNo: data.studentNo } });
  if (existing) throw ApiError.conflict('学号已存在');

  // 校验班级归属院系
  const cls = await prisma.class.findUnique({ where: { id: data.classId } });
  if (!cls) throw ApiError.badRequest('班级不存在');
  if (cls.departmentId !== data.departmentId) {
    throw ApiError.badRequest('班级与院系不匹配');
  }

  const password = await hashPassword(data.password || '123456');
  return prisma.student.create({
    data: {
      studentNo: data.studentNo,
      name: data.name,
      gender: data.gender as Gender,
      departmentId: data.departmentId,
      classId: data.classId,
      phone: data.phone || null,
      email: data.email || null,
      hometown: data.hometown || null,
      address: data.address || null,
      enrollDate: data.enrollDate ? new Date(data.enrollDate) : null,
      password,
      status: StudentStatus.NORMAL,
    },
  });
}

export async function studentUpdate(
  id: string,
  data: {
    name?: string;
    gender?: string;
    departmentId?: string;
    classId?: string;
    phone?: string;
    email?: string;
    hometown?: string;
    address?: string;
    status?: StudentStatus;
    enrollDate?: string;
    graduateDate?: string;
  },
) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const updateData: any = { ...data };
  if (data.gender) updateData.gender = data.gender as Gender;
  if (data.status) updateData.status = data.status as StudentStatus;
  if (data.enrollDate !== undefined) updateData.enrollDate = data.enrollDate ? new Date(data.enrollDate) : null;
  if (data.graduateDate !== undefined) updateData.graduateDate = data.graduateDate ? new Date(data.graduateDate) : null;

  return prisma.student.update({ where: { id }, data: updateData });
}

export async function studentRemove(id: string) {
  // 软删除：将状态置为 DROPPED（保留档案数据，避免外键级联）
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  // 检查是否有关联业务数据（成绩、选课等）
  const [scores, selections] = await Promise.all([
    prisma.score.count({ where: { studentId: id } }),
    prisma.courseSelection.count({ where: { studentId: id } }),
  ]);

  if (scores + selections > 0) {
    // 有业务数据：改为退学状态，不物理删除
    await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.DROPPED },
    });
    return { softDeleted: true };
  }

  await prisma.student.delete({ where: { id } });
  return { softDeleted: false };
}

export async function studentResetPassword(id: string, newPassword?: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw ApiError.notFound('学生档案不存在');
  const password = await hashPassword(newPassword || '123456');
  await prisma.student.update({ where: { id }, data: { password } });
  return { defaultPassword: !newPassword };
}

// ========== Excel 导入导出 ==========

const STUDENT_COLUMNS: ExcelColumn[] = [
  { header: '学号', key: 'studentNo', width: 15 },
  { header: '姓名', key: 'name', width: 12 },
  { header: '性别', key: 'genderText', width: 8 },
  { header: '院系', key: 'departmentName', width: 20 },
  { header: '班级', key: 'className', width: 20 },
  { header: '手机号', key: 'phone', width: 15 },
  { header: '邮箱', key: 'email', width: 22 },
  { header: '籍贯', key: 'hometown', width: 15 },
  { header: '状态', key: 'statusText', width: 10 },
  { header: '入学日期', key: 'enrollDate', width: 14 },
];

const STATUS_TEXT: Record<string, string> = {
  NORMAL: '在校',
  SUSPENDED: '休学',
  RESUMED: '复学',
  DROPPED: '退学',
  HELD_BACK: '留级',
  GRADUATED: '毕业',
};

export async function studentExport(params: Omit<StudentListParams, 'page' | 'pageSize'>) {
  const where: any = {};
  if (params.studentNo) where.studentNo = { contains: params.studentNo };
  if (params.name) where.name = { contains: params.name };
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.classId) where.classId = params.classId;
  if (params.status) where.status = params.status;

  const students = await prisma.student.findMany({
    where,
    include: {
      department: { select: { name: true } },
      class: { select: { name: true } },
    },
    orderBy: { studentNo: 'asc' },
  });

  const rows = students.map((s) => ({
    studentNo: s.studentNo,
    name: s.name,
    genderText: s.gender === 'MALE' ? '男' : '女',
    departmentName: s.department?.name || '',
    className: s.class?.name || '',
    phone: s.phone || '',
    email: s.email || '',
    hometown: s.hometown || '',
    statusText: STATUS_TEXT[s.status] || s.status,
    enrollDate: s.enrollDate ? s.enrollDate.toISOString().slice(0, 10) : '',
  }));

  return writeExcel(rows, STUDENT_COLUMNS, '学生档案');
}

export async function studentImport(file: Express.Multer.File) {
  const rows = await readExcel(file.buffer);
  if (rows.length === 0) throw ApiError.badRequest('Excel 数据为空');

  // 预加载院系 + 班级映射（按名称）
  const deptNames = Array.from(new Set(rows.map((r) => r['院系']).filter(Boolean))) as string[];
  const classNames = Array.from(new Set(rows.map((r) => r['班级']).filter(Boolean))) as string[];

  const [depts, classes] = await Promise.all([
    prisma.department.findMany({ where: { name: { in: deptNames } } }),
    prisma.class.findMany({ where: { name: { in: classNames } } }),
  ]);
  const deptMap = new Map(depts.map((d) => [d.name, d]));
  const classMap = new Map(classes.map((c) => [c.name, c]));

  const errors: { row: number; message: string }[] = [];
  const success: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 表头占第 1 行
    const studentNo = String(row['学号'] || '').trim();
    const name = String(row['姓名'] || '').trim();
    const genderText = String(row['性别'] || '').trim();
    const deptName = String(row['院系'] || '').trim();
    const className = String(row['班级'] || '').trim();
    const phone = String(row['手机号'] || '').trim() || undefined;
    const email = String(row['邮箱'] || '').trim() || undefined;
    const hometown = String(row['籍贯'] || '').trim() || undefined;
    const enrollDateStr = String(row['入学日期'] || '').trim();

    if (!studentNo || !name) {
      errors.push({ row: rowNum, message: '学号或姓名为空' });
      continue;
    }
    const gender = genderText === '男' ? 'MALE' : genderText === '女' ? 'FEMALE' : '';
    if (!gender) {
      errors.push({ row: rowNum, message: '性别必须为"男"或"女"' });
      continue;
    }
    const dept = deptMap.get(deptName);
    if (!dept) {
      errors.push({ row: rowNum, message: `院系「${deptName}」不存在` });
      continue;
    }
    const cls = classMap.get(className);
    if (!cls) {
      errors.push({ row: rowNum, message: `班级「${className}」不存在` });
      continue;
    }
    if (cls.departmentId !== dept.id) {
      errors.push({ row: rowNum, message: `班级「${className}」不属于院系「${deptName}」` });
      continue;
    }

    // 检查学号重复
    const existing = await prisma.student.findUnique({ where: { studentNo } });
    if (existing) {
      errors.push({ row: rowNum, message: `学号「${studentNo}」已存在` });
      continue;
    }

    const password = await hashPassword('123456');
    await prisma.student.create({
      data: {
        studentNo,
        name,
        gender: gender as Gender,
        departmentId: dept.id,
        classId: cls.id,
        phone: phone || null,
        email: email || null,
        hometown: hometown || null,
        enrollDate: enrollDateStr ? new Date(enrollDateStr) : null,
        password,
        status: StudentStatus.NORMAL,
      },
    });
    success.push(studentNo);
  }

  return {
    total: rows.length,
    successCount: success.length,
    failCount: errors.length,
    errors,
    successStudentNos: success,
  };
}

export async function studentImportTemplate() {
  const sample = [
    {
      studentNo: '20240001',
      name: '张三',
      genderText: '男',
      departmentName: '计算机学院',
      className: '软件工程2401',
      phone: '13800000001',
      email: 'zhangsan@example.com',
      hometown: '北京',
      statusText: '在校',
      enrollDate: '2024-09-01',
    },
  ];
  return writeExcel(sample, STUDENT_COLUMNS, '学生导入模板');
}
