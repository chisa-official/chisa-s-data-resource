import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';

// ========== 院系 ==========

export async function departmentTree() {
  const depts = await prisma.department.findMany({
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  });
  return buildDeptTree(depts, null);
}

export async function departmentList() {
  const depts = await prisma.department.findMany({
    orderBy: [{ sort: 'asc' }],
  });
  return depts.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    parentId: d.parentId,
    sort: d.sort,
  }));
}

export async function departmentCreate(data: { name: string; code: string; parentId?: string; sort?: number }) {
  const existing = await prisma.department.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('院系编码已存在');
  return prisma.department.create({ data: { name: data.name, code: data.code, parentId: data.parentId || null, sort: data.sort ?? 0 } });
}

export async function departmentUpdate(id: string, data: { name?: string; code?: string; parentId?: string | null; sort?: number }) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw ApiError.notFound('院系不存在');
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
  if (data.sort !== undefined) updateData.sort = data.sort;
  return prisma.department.update({ where: { id }, data: updateData });
}

export async function departmentRemove(id: string) {
  const children = await prisma.department.findMany({ where: { parentId: id } });
  if (children.length > 0) throw ApiError.badRequest('存在子院系，无法删除');
  const [majors, classes, teachers, students, courses] = await Promise.all([
    prisma.major.count({ where: { departmentId: id } }),
    prisma.class.count({ where: { departmentId: id } }),
    prisma.teacher.count({ where: { departmentId: id } }),
    prisma.student.count({ where: { departmentId: id } }),
    prisma.course.count({ where: { departmentId: id } }),
  ]);
  if (majors + classes + teachers + students + courses > 0) {
    throw ApiError.badRequest('该院系下仍有关联数据，无法删除');
  }
  await prisma.department.delete({ where: { id } });
}

// ========== 专业 ==========

export async function majorList(params: { page: number; pageSize: number; departmentId?: string; name?: string }) {
  const where: any = {};
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.name) where.name = { contains: params.name };
  const [list, total] = await Promise.all([
    prisma.major.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.major.count({ where }),
  ]);
  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function majorCreate(data: { name: string; code: string; departmentId: string; duration: number }) {
  return prisma.major.create({ data });
}

export async function majorUpdate(id: string, data: { name?: string; code?: string; departmentId?: string; duration?: number }) {
  return prisma.major.update({ where: { id }, data });
}

export async function majorRemove(id: string) {
  const classCount = await prisma.class.count({ where: { majorId: id } });
  if (classCount > 0) throw ApiError.badRequest('该专业下仍有班级，无法删除');
  await prisma.major.delete({ where: { id } });
}

// ========== 班级 ==========

export async function classList(params: { page: number; pageSize: number; departmentId?: string; majorId?: string; name?: string }) {
  const where: any = {};
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.majorId) where.majorId = params.majorId;
  if (params.name) where.name = { contains: params.name };
  const [list, total] = await Promise.all([
    prisma.class.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        major: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.class.count({ where }),
  ]);
  return {
    list: list.map((c) => ({
      id: c.id,
      name: c.name,
      departmentId: c.departmentId,
      department: c.department,
      majorId: c.majorId,
      major: c.major,
      grade: c.grade,
      counselorId: c.counselorId,
      studentCount: c._count.students,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function classCreate(data: { name: string; departmentId: string; majorId: string; grade: number; counselorId?: string }) {
  return prisma.class.create({ data });
}

export async function classUpdate(id: string, data: { name?: string; departmentId?: string; majorId?: string; grade?: number; counselorId?: string | null }) {
  return prisma.class.update({ where: { id }, data });
}

export async function classRemove(id: string) {
  const studentCount = await prisma.student.count({ where: { classId: id } });
  if (studentCount > 0) throw ApiError.badRequest('该班级下仍有学生，无法删除');
  await prisma.class.delete({ where: { id } });
}

// ========== 教师 ==========

export async function teacherList(params: { page: number; pageSize: number; departmentId?: string; name?: string }) {
  const where: any = {};
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.name) where.name = { contains: params.name };
  const [list, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.teacher.count({ where }),
  ]);
  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function teacherCreate(data: { teacherNo: string; name: string; gender: string; departmentId: string; title?: string; phone?: string }) {
  const existing = await prisma.teacher.findUnique({ where: { teacherNo: data.teacherNo } });
  if (existing) throw ApiError.conflict('工号已存在');
  return prisma.teacher.create({ data: { ...data, gender: data.gender as any } });
}

export async function teacherUpdate(id: string, data: { teacherNo?: string; name?: string; gender?: string; departmentId?: string; title?: string; phone?: string }) {
  const updateData: any = { ...data };
  if (data.gender) updateData.gender = data.gender as any;
  return prisma.teacher.update({ where: { id }, data: updateData });
}

export async function teacherRemove(id: string) {
  const courseCount = await prisma.course.count({ where: { teacherId: id } });
  if (courseCount > 0) throw ApiError.badRequest('该教师仍有授课，无法删除');
  await prisma.teacher.delete({ where: { id } });
}

// ========== 课程 ==========

export async function courseList(params: { page: number; pageSize: number; departmentId?: string; name?: string; type?: string }) {
  const where: any = {};
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.name) where.name = { contains: params.name };
  if (params.type) where.type = params.type;
  const [list, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.course.count({ where }),
  ]);
  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function courseCreate(data: {
  code: string; name: string; credit: number; hours: number;
  teacherId: string; departmentId: string; type: string; capacity?: number;
  selectStart?: string; selectEnd?: string;
}) {
  const existing = await prisma.course.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('课程编码已存在');
  return prisma.course.create({
    data: {
      code: data.code,
      name: data.name,
      credit: data.credit,
      hours: data.hours,
      teacherId: data.teacherId,
      departmentId: data.departmentId,
      type: data.type as any,
      capacity: data.capacity ?? 60,
      selectStart: data.selectStart ? new Date(data.selectStart) : null,
      selectEnd: data.selectEnd ? new Date(data.selectEnd) : null,
    },
  });
}

export async function courseUpdate(id: string, data: {
  code?: string; name?: string; credit?: number; hours?: number;
  teacherId?: string; departmentId?: string; type?: string; capacity?: number;
  selectStart?: string; selectEnd?: string;
}) {
  const updateData: any = { ...data };
  if (data.type) updateData.type = data.type as any;
  if (data.selectStart !== undefined) updateData.selectStart = data.selectStart ? new Date(data.selectStart) : null;
  if (data.selectEnd !== undefined) updateData.selectEnd = data.selectEnd ? new Date(data.selectEnd) : null;
  return prisma.course.update({ where: { id }, data: updateData });
}

export async function courseRemove(id: string) {
  const [selections, scores, schedules] = await Promise.all([
    prisma.courseSelection.count({ where: { courseId: id } }),
    prisma.score.count({ where: { courseId: id } }),
    prisma.schedule.count({ where: { courseId: id } }),
  ]);
  if (selections + scores + schedules > 0) throw ApiError.badRequest('该课程仍有关联数据，无法删除');
  await prisma.course.delete({ where: { id } });
}

// ========== 字典 ==========

export async function dictList(params: { type?: string }) {
  const where: any = {};
  if (params.type) where.type = params.type;
  const dicts = await prisma.dict.findMany({
    where,
    orderBy: [{ type: 'asc' }, { sort: 'asc' }],
  });
  return dicts;
}

export async function dictByType(type: string) {
  return prisma.dict.findMany({
    where: { type },
    orderBy: { sort: 'asc' },
  });
}

export async function dictCreate(data: { type: string; label: string; value: string; sort?: number }) {
  return prisma.dict.create({ data: { ...data, sort: data.sort ?? 0 } });
}

export async function dictUpdate(id: string, data: { type?: string; label?: string; value?: string; sort?: number }) {
  return prisma.dict.update({ where: { id }, data });
}

export async function dictRemove(id: string) {
  await prisma.dict.delete({ where: { id } });
}

// ========== 辅助 ==========

function buildDeptTree(depts: any[], parentId: string | null): any[] {
  return depts
    .filter((d) => (d.parentId || null) === parentId)
    .map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      parentId: d.parentId,
      sort: d.sort,
      children: buildDeptTree(depts, d.id),
    }))
    .sort((a, b) => a.sort - b.sort);
}
