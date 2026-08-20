import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { Gender, AssignStatus, RepairStatus, RepairType } from '@prisma/client';

// 分页参数解析
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// ========== 宿舍/床位管理 ==========

export interface DormListParams {
  page: number;
  pageSize: number;
  building?: string;
  roomNo?: string;
  gender?: Gender;
}

export async function listDorms(params: DormListParams) {
  const where: any = {};
  if (params.building) where.building = { contains: params.building };
  if (params.roomNo) where.roomNo = { contains: params.roomNo };
  if (params.gender) where.gender = params.gender;

  const [list, total] = await Promise.all([
    prisma.dorm.findMany({
      where,
      include: {
        assignments: {
          where: { status: AssignStatus.ACTIVE },
          select: { id: true, bedNo: true, student: { select: { id: true, studentNo: true, name: true } } },
        },
      },
      orderBy: [{ building: 'asc' }, { roomNo: 'asc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.dorm.count({ where }),
  ]);

  // 计算入住率
  const resultList = list.map((d) => {
    const beds: string[] = Array.isArray(d.beds) ? (d.beds as string[]) : [];
    const occupiedBeds = d.assignments.map((a) => a.bedNo);
    return {
      id: d.id,
      building: d.building,
      roomNo: d.roomNo,
      capacity: d.capacity,
      gender: d.gender,
      beds,
      occupiedCount: d.assignments.length,
      vacantCount: beds.length - d.assignments.length,
      assignments: d.assignments,
      createdAt: d.createdAt,
    };
  });

  return { list: resultList, total, page: params.page, pageSize: params.pageSize };
}

/** 床位入住详情（每个床位 + 入住学生） */
export async function getDormBeds(id: string) {
  const dorm = await prisma.dorm.findUnique({
    where: { id },
    include: {
      assignments: {
        where: { status: AssignStatus.ACTIVE },
        include: { student: { select: { id: true, studentNo: true, name: true, gender: true } } },
      },
    },
  });
  if (!dorm) throw ApiError.notFound('宿舍不存在');

  const beds: string[] = Array.isArray(dorm.beds) ? (dorm.beds as string[]) : [];
  const assignmentMap = new Map(dorm.assignments.map((a) => [a.bedNo, a]));

  return {
    id: dorm.id,
    building: dorm.building,
    roomNo: dorm.roomNo,
    capacity: dorm.capacity,
    gender: dorm.gender,
    beds: beds.map((bedNo) => {
      const a = assignmentMap.get(bedNo);
      return {
        bedNo,
        occupied: !!a,
        student: a?.student || null,
        moveInDate: a?.moveInDate || null,
      };
    }),
  };
}

export async function createDorm(data: {
  building: string;
  roomNo: string;
  capacity: number;
  gender: Gender;
  beds: string[];
}) {
  if (data.beds.length === 0) throw ApiError.badRequest('床位号不能为空');
  if (data.beds.length !== new Set(data.beds).size) throw ApiError.badRequest('床位号不能重复');
  if (data.capacity < data.beds.length) throw ApiError.badRequest('容量不能小于床位数');

  return prisma.dorm.create({
    data: {
      building: data.building,
      roomNo: data.roomNo,
      capacity: data.capacity,
      gender: data.gender,
      beds: data.beds,
    },
  });
}

export async function updateDorm(id: string, data: {
  building?: string;
  roomNo?: string;
  capacity?: number;
  gender?: Gender;
  beds?: string[];
}) {
  const existing = await prisma.dorm.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('宿舍不存在');

  if (data.beds) {
    if (data.beds.length !== new Set(data.beds).size) throw ApiError.badRequest('床位号不能重复');
    // 校验已占用床位仍在新床位列表中
    const occupied = await prisma.dormAssignment.findMany({
      where: { dormId: id, status: AssignStatus.ACTIVE },
      select: { bedNo: true },
    });
    const occupiedSet = new Set(occupied.map((o) => o.bedNo));
    const newBedSet = new Set(data.beds);
    for (const ob of occupiedSet) {
      if (!newBedSet.has(ob)) throw ApiError.badRequest(`床位 ${ob} 已被占用，无法移除`);
    }
  }

  return prisma.dorm.update({ where: { id }, data });
}

export async function deleteDorm(id: string): Promise<void> {
  const existing = await prisma.dorm.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('宿舍不存在');
  const activeCount = await prisma.dormAssignment.count({
    where: { dormId: id, status: AssignStatus.ACTIVE },
  });
  if (activeCount > 0) throw ApiError.badRequest('该宿舍仍有在住学生，无法删除');
  await prisma.dorm.delete({ where: { id } });
}

// ========== 入住分配 / 调宿 / 退宿 ==========

/** 分配入住：校验性别匹配、床位存在且空闲、学生无在住记录 */
export async function assignDorm(data: {
  studentId: string;
  dormId: string;
  bedNo: string;
  moveInDate?: string;
}) {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { id: true, name: true, gender: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const dorm = await prisma.dorm.findUnique({ where: { id: data.dormId } });
  if (!dorm) throw ApiError.notFound('宿舍不存在');

  if (student.gender !== dorm.gender) {
    throw ApiError.badRequest('学生性别与宿舍性别不匹配');
  }

  const beds: string[] = Array.isArray(dorm.beds) ? (dorm.beds as string[]) : [];
  if (!beds.includes(data.bedNo)) throw ApiError.badRequest('该床位号不存在');

  // 校验学生无在住记录
  const current = await prisma.dormAssignment.findUnique({ where: { studentId: data.studentId } });
  if (current && current.status === AssignStatus.ACTIVE) {
    throw ApiError.badRequest('该学生已分配宿舍，请先退宿或办理调宿');
  }

  // 校验床位未被占用
  const bedOccupied = await prisma.dormAssignment.findFirst({
    where: { dormId: data.dormId, bedNo: data.bedNo, status: AssignStatus.ACTIVE },
  });
  if (bedOccupied) throw ApiError.badRequest('该床位已被占用');

  const moveInDate = data.moveInDate ? new Date(data.moveInDate) : new Date();
  if (isNaN(moveInDate.getTime())) throw ApiError.badRequest('入住日期格式错误');

  // 若存在历史已退宿记录则更新复用，否则新建
  if (current) {
    return prisma.dormAssignment.update({
      where: { studentId: data.studentId },
      data: { dormId: data.dormId, bedNo: data.bedNo, moveInDate, moveOutDate: null, status: AssignStatus.ACTIVE },
    });
  }
  return prisma.dormAssignment.create({
    data: { studentId: data.studentId, dormId: data.dormId, bedNo: data.bedNo, moveInDate, status: AssignStatus.ACTIVE },
  });
}

/** 调宿：退旧床位 + 入新床位（事务） */
export async function transferDorm(data: {
  studentId: string;
  dormId: string;
  bedNo: string;
}) {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { id: true, gender: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const current = await prisma.dormAssignment.findUnique({
    where: { studentId: data.studentId },
    include: { dorm: true },
  });
  if (!current || current.status !== AssignStatus.ACTIVE) {
    throw ApiError.badRequest('该学生当前未入住，无法调宿');
  }

  const targetDorm = await prisma.dorm.findUnique({ where: { id: data.dormId } });
  if (!targetDorm) throw ApiError.notFound('目标宿舍不存在');
  if (student.gender !== targetDorm.gender) throw ApiError.badRequest('学生性别与目标宿舍性别不匹配');

  const beds: string[] = Array.isArray(targetDorm.beds) ? (targetDorm.beds as string[]) : [];
  if (!beds.includes(data.bedNo)) throw ApiError.badRequest('目标床位号不存在');

  const bedOccupied = await prisma.dormAssignment.findFirst({
    where: { dormId: data.dormId, bedNo: data.bedNo, status: AssignStatus.ACTIVE },
  });
  if (bedOccupied) throw ApiError.badRequest('目标床位已被占用');

  return prisma.$transaction(async (tx) => {
    // 退旧
    await tx.dormAssignment.update({
      where: { studentId: data.studentId },
      data: { status: AssignStatus.MOVED_OUT, moveOutDate: new Date() },
    });
    // 入新
    return tx.dormAssignment.create({
      data: { studentId: data.studentId, dormId: data.dormId, bedNo: data.bedNo, moveInDate: new Date(), status: AssignStatus.ACTIVE },
    });
  });
}

/** 退宿 */
export async function checkoutDorm(data: { studentId: string }) {
  const current = await prisma.dormAssignment.findUnique({ where: { studentId: data.studentId } });
  if (!current || current.status !== AssignStatus.ACTIVE) {
    throw ApiError.badRequest('该学生当前未入住，无需退宿');
  }
  return prisma.dormAssignment.update({
    where: { studentId: data.studentId },
    data: { status: AssignStatus.MOVED_OUT, moveOutDate: new Date() },
  });
}

/** 在住学生列表（按宿舍/楼栋筛选） */
export async function listAssignments(params: {
  page: number;
  pageSize: number;
  dormId?: string;
  building?: string;
  studentNo?: string;
  studentName?: string;
  status?: AssignStatus;
}) {
  const where: any = {};
  if (params.dormId) where.dormId = params.dormId;
  if (params.status) where.status = params.status;
  if (params.building) where.dorm = { building: { contains: params.building } };
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.dormAssignment.findMany({
      where,
      include: {
        student: { select: { id: true, studentNo: true, name: true, gender: true, department: { select: { name: true } }, class: { select: { name: true } } } },
        dorm: { select: { id: true, building: true, roomNo: true, gender: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.dormAssignment.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

// ========== 卫生检查 ==========

export async function listInspections(params: {
  page: number;
  pageSize: number;
  dormId?: string;
  building?: string;
}) {
  const where: any = {};
  if (params.dormId) where.dormId = params.dormId;
  if (params.building) where.dorm = { building: { contains: params.building } };

  const [list, total] = await Promise.all([
    prisma.dormInspection.findMany({
      where,
      include: { dorm: { select: { id: true, building: true, roomNo: true } } },
      orderBy: { inspectedAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.dormInspection.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function createInspection(data: {
  dormId: string;
  score: number;
  issues?: string;
  inspectedAt: string;
  inspectorId: string;
}) {
  const dorm = await prisma.dorm.findUnique({ where: { id: data.dormId }, select: { id: true } });
  if (!dorm) throw ApiError.notFound('宿舍不存在');
  if (data.score < 0 || data.score > 100) throw ApiError.badRequest('分数应在 0-100 之间');

  const inspectedAt = new Date(data.inspectedAt);
  if (isNaN(inspectedAt.getTime())) throw ApiError.badRequest('检查时间格式错误');

  return prisma.dormInspection.create({
    data: {
      dormId: data.dormId,
      score: data.score,
      issues: data.issues,
      inspectedAt,
      inspectorId: data.inspectorId,
    },
    include: { dorm: { select: { building: true, roomNo: true } } },
  });
}

export async function updateInspection(id: string, data: {
  score?: number;
  issues?: string;
  inspectedAt?: string;
}) {
  const existing = await prisma.dormInspection.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('检查记录不存在');

  const updateData: any = {};
  if (data.score !== undefined) {
    if (data.score < 0 || data.score > 100) throw ApiError.badRequest('分数应在 0-100 之间');
    updateData.score = data.score;
  }
  if (data.issues !== undefined) updateData.issues = data.issues;
  if (data.inspectedAt !== undefined) {
    const inspectedAt = new Date(data.inspectedAt);
    if (isNaN(inspectedAt.getTime())) throw ApiError.badRequest('检查时间格式错误');
    updateData.inspectedAt = inspectedAt;
  }

  return prisma.dormInspection.update({ where: { id }, data: updateData });
}

export async function deleteInspection(id: string): Promise<void> {
  const existing = await prisma.dormInspection.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('检查记录不存在');
  await prisma.dormInspection.delete({ where: { id } });
}

// ========== 宿舍违纪 ==========

export async function listViolations(params: {
  page: number;
  pageSize: number;
  dormId?: string;
  building?: string;
  studentNo?: string;
  studentName?: string;
}) {
  const where: any = {};
  if (params.dormId) where.dormId = params.dormId;
  if (params.building) where.dorm = { building: { contains: params.building } };
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.dormViolation.findMany({
      where,
      include: {
        dorm: { select: { id: true, building: true, roomNo: true } },
        student: { select: { id: true, studentNo: true, name: true, department: { select: { name: true } }, class: { select: { name: true } } } },
      },
      orderBy: { occurredAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.dormViolation.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function createViolation(data: {
  dormId: string;
  studentId?: string;
  type: string;
  description: string;
  occurredAt: string;
}) {
  const dorm = await prisma.dorm.findUnique({ where: { id: data.dormId }, select: { id: true } });
  if (!dorm) throw ApiError.notFound('宿舍不存在');
  if (data.studentId) {
    const student = await prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true } });
    if (!student) throw ApiError.notFound('学生档案不存在');
  }

  const occurredAt = new Date(data.occurredAt);
  if (isNaN(occurredAt.getTime())) throw ApiError.badRequest('违纪时间格式错误');

  return prisma.dormViolation.create({
    data: {
      dormId: data.dormId,
      studentId: data.studentId || null,
      type: data.type,
      description: data.description,
      occurredAt,
    },
    include: { dorm: { select: { building: true, roomNo: true } } },
  });
}

export async function updateViolation(id: string, data: {
  type?: string;
  description?: string;
  occurredAt?: string;
}) {
  const existing = await prisma.dormViolation.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('违纪记录不存在');

  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.occurredAt !== undefined) {
    const occurredAt = new Date(data.occurredAt);
    if (isNaN(occurredAt.getTime())) throw ApiError.badRequest('违纪时间格式错误');
    updateData.occurredAt = occurredAt;
  }

  return prisma.dormViolation.update({ where: { id }, data: updateData });
}

export async function deleteViolation(id: string): Promise<void> {
  const existing = await prisma.dormViolation.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('违纪记录不存在');
  await prisma.dormViolation.delete({ where: { id } });
}

// ========== 报修工单处理 ==========

export async function listRepairs(params: {
  page: number;
  pageSize: number;
  status?: RepairStatus;
  type?: RepairType;
  studentNo?: string;
  studentName?: string;
}) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.repair.findMany({
      where,
      include: {
        student: { select: { id: true, studentNo: true, name: true, department: { select: { name: true } }, class: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.repair.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 处理报修：状态流转 PENDING → PROCESSING → DONE，记录处理人与结果 */
export async function handleRepair(id: string, handlerId: string, data: { status: RepairStatus; result?: string }) {
  const repair = await prisma.repair.findUnique({ where: { id } });
  if (!repair) throw ApiError.notFound('报修工单不存在');

  // 校验状态流转合法性
  const flow: Record<RepairStatus, RepairStatus[]> = {
    PENDING: [RepairStatus.PROCESSING],
    PROCESSING: [RepairStatus.DONE],
    DONE: [],
  };
  const allowed = flow[repair.status] || [];
  if (!allowed.includes(data.status)) {
    throw ApiError.badRequest(`当前状态「${repair.status}」不可流转至「${data.status}」`);
  }

  return prisma.repair.update({
    where: { id },
    data: {
      status: data.status,
      handlerId,
      result: data.result ?? repair.result,
    },
  });
}
