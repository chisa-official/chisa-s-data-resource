import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { ApplyStatus, LeaveType, AwardType, DisciplineType } from '@prisma/client';

// 审批节点定义：0=辅导员 → 1=学工老师
const LEAVE_MAX_STEP = 1;

// ========== 请假审批（多级流转） ==========

export interface LeaveListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  type?: LeaveType;
  studentNo?: string;
  studentName?: string;
}

export async function listLeaves(params: LeaveListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.leaveApply.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.leaveApply.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 审批通过当前节点：若已是最后节点则整体通过，否则推进到下一节点 */
export async function approveLeave(id: string, approverId: string) {
  const leave = await prisma.leaveApply.findUnique({ where: { id } });
  if (!leave) throw ApiError.notFound('请假申请不存在');
  if (leave.status !== ApplyStatus.PENDING) throw ApiError.badRequest('该申请已处理');

  if (leave.currentStep >= LEAVE_MAX_STEP) {
    // 最后节点 → 整体通过
    return prisma.leaveApply.update({
      where: { id },
      data: {
        status: ApplyStatus.APPROVED,
        approverId,
        reviewedAt: new Date(),
      },
    });
  }
  // 推进到下一节点
  return prisma.leaveApply.update({
    where: { id },
    data: { currentStep: leave.currentStep + 1 },
  });
}

/** 转交下一级审批（与 approve 推进节点一致，但语义独立） */
export async function forwardLeave(id: string, approverId: string) {
  const leave = await prisma.leaveApply.findUnique({ where: { id } });
  if (!leave) throw ApiError.notFound('请假申请不存在');
  if (leave.status !== ApplyStatus.PENDING) throw ApiError.badRequest('该申请已处理');
  if (leave.currentStep >= LEAVE_MAX_STEP) {
    throw ApiError.badRequest('已是最后审批节点，无法转交');
  }
  return prisma.leaveApply.update({
    where: { id },
    data: { currentStep: leave.currentStep + 1 },
  });
}

export async function rejectLeave(id: string, approverId: string, reason?: string) {
  const leave = await prisma.leaveApply.findUnique({ where: { id } });
  if (!leave) throw ApiError.notFound('请假申请不存在');
  if (leave.status !== ApplyStatus.PENDING) throw ApiError.badRequest('该申请已处理');

  return prisma.leaveApply.update({
    where: { id },
    data: {
      status: ApplyStatus.REJECTED,
      approverId,
      reviewedAt: new Date(),
    },
  });
}

// ========== 奖助贷项目管理（复用 Dict 表，type=award_project） ==========

const AWARD_PROJECT_DICT_TYPE = 'award_project';

export interface AwardProject {
  id: string;
  name: string;
  awardType: AwardType;
  amount?: number;
  description?: string;
  sort: number;
}

/** 将 Dict 记录解析为奖助项目 */
function parseProject(dict: any): AwardProject {
  let extra: any = {};
  try {
    extra = JSON.parse(dict.value || '{}');
  } catch { /* ignore */ }
  return {
    id: dict.id,
    name: dict.label,
    awardType: extra.awardType || AwardType.SCHOLARSHIP,
    amount: extra.amount,
    description: extra.description,
    sort: dict.sort,
  };
}

export async function listAwardProjects(): Promise<AwardProject[]> {
  const dicts = await prisma.dict.findMany({
    where: { type: AWARD_PROJECT_DICT_TYPE },
    orderBy: { sort: 'asc' },
  });
  return dicts.map(parseProject);
}

export async function createAwardProject(data: {
  name: string;
  awardType: AwardType;
  amount?: number;
  description?: string;
  sort?: number;
}): Promise<AwardProject> {
  const value = JSON.stringify({
    awardType: data.awardType,
    amount: data.amount,
    description: data.description,
  });
  const dict = await prisma.dict.create({
    data: {
      type: AWARD_PROJECT_DICT_TYPE,
      label: data.name,
      value,
      sort: data.sort ?? 0,
    },
  });
  return parseProject(dict);
}

export async function updateAwardProject(id: string, data: {
  name?: string;
  awardType?: AwardType;
  amount?: number;
  description?: string;
  sort?: number;
}): Promise<AwardProject> {
  const existing = await prisma.dict.findUnique({ where: { id } });
  if (!existing || existing.type !== AWARD_PROJECT_DICT_TYPE) {
    throw ApiError.notFound('奖助项目不存在');
  }
  let extra: any = {};
  try { extra = JSON.parse(existing.value || '{}'); } catch { /* ignore */ }
  if (data.awardType !== undefined) extra.awardType = data.awardType;
  if (data.amount !== undefined) extra.amount = data.amount;
  if (data.description !== undefined) extra.description = data.description;

  const dict = await prisma.dict.update({
    where: { id },
    data: {
      label: data.name ?? existing.label,
      value: JSON.stringify(extra),
      sort: data.sort ?? existing.sort,
    },
  });
  return parseProject(dict);
}

export async function deleteAwardProject(id: string): Promise<void> {
  const existing = await prisma.dict.findUnique({ where: { id } });
  if (!existing || existing.type !== AWARD_PROJECT_DICT_TYPE) {
    throw ApiError.notFound('奖助项目不存在');
  }
  await prisma.dict.delete({ where: { id } });
}

// ========== 奖助申请审核与公示 ==========

export interface AwardApplyListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  type?: AwardType;
  studentNo?: string;
  studentName?: string;
  semester?: string;
}

export async function listAwardApplies(params: AwardApplyListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.semester) where.semester = params.semester;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.award.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.award.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 材料审核：通过/驳回 + 填写评审结果 */
export async function auditAward(id: string, data: { passed: boolean; result?: string }) {
  const award = await prisma.award.findUnique({ where: { id } });
  if (!award) throw ApiError.notFound('奖助申请不存在');
  if (award.status !== ApplyStatus.PENDING) throw ApiError.badRequest('该申请已处理');

  return prisma.award.update({
    where: { id },
    data: {
      status: data.passed ? ApplyStatus.APPROVED : ApplyStatus.REJECTED,
      result: data.result ?? (data.passed ? '审核通过' : '审核未通过'),
    },
  });
}

/** 名单公示：将已通过的申请标记为已公示（result 前缀标记） */
export async function publishAward(id: string): Promise<void> {
  const award = await prisma.award.findUnique({ where: { id } });
  if (!award) throw ApiError.notFound('奖助申请不存在');
  if (award.status !== ApplyStatus.APPROVED) {
    throw ApiError.badRequest('仅已通过的申请可公示');
  }
  await prisma.award.update({
    where: { id },
    data: { result: `已公示 | ${award.result || ''}`.trim() },
  });
}

/** 批量公示 */
export async function batchPublishAward(ids: string[]): Promise<{ count: number }> {
  const result = await prisma.award.updateMany({
    where: { id: { in: ids }, status: ApplyStatus.APPROVED },
    data: { result: '已公示' },
  });
  return { count: result.count };
}

// ========== 违纪处分管理 ==========

export interface DisciplineListParams {
  page: number;
  pageSize: number;
  type?: DisciplineType;
  studentNo?: string;
  studentName?: string;
}

export async function listDisciplines(params: DisciplineListParams) {
  const where: any = {};
  if (params.type) where.type = params.type;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.discipline.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.discipline.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function createDiscipline(data: {
  studentId: string;
  type: DisciplineType;
  reason: string;
  occurredAt: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const occurredAt = new Date(data.occurredAt);
  if (isNaN(occurredAt.getTime())) throw ApiError.badRequest('违纪时间格式错误');

  return prisma.discipline.create({
    data: {
      studentId: data.studentId,
      type: data.type,
      reason: data.reason,
      occurredAt,
    },
  });
}

export async function updateDiscipline(id: string, data: {
  type?: DisciplineType;
  reason?: string;
  occurredAt?: string;
}) {
  const existing = await prisma.discipline.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('违纪记录不存在');

  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.reason !== undefined) updateData.reason = data.reason;
  if (data.occurredAt !== undefined) {
    const occurredAt = new Date(data.occurredAt);
    if (isNaN(occurredAt.getTime())) throw ApiError.badRequest('违纪时间格式错误');
    updateData.occurredAt = occurredAt;
  }

  return prisma.discipline.update({ where: { id }, data: updateData });
}

export async function deleteDiscipline(id: string): Promise<void> {
  const existing = await prisma.discipline.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('违纪记录不存在');
  await prisma.discipline.delete({ where: { id } });
}

// ========== 评优评先（简化实现，复用 Award 表 type=HONOR） ==========

export interface HonorListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
  semester?: string;
}

export async function listHonors(params: HonorListParams) {
  const where: any = { type: AwardType.HONOR };
  if (params.status) where.status = params.status;
  if (params.semester) where.semester = params.semester;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.award.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.award.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 管理员直接授予评优荣誉（创建已通过的 HONOR 记录） */
export async function grantHonor(data: {
  studentId: string;
  name: string;
  semester: string;
  result?: string;
  attachments?: string[];
}) {
  const student = await prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  return prisma.award.create({
    data: {
      studentId: data.studentId,
      type: AwardType.HONOR,
      name: data.name,
      semester: data.semester,
      status: ApplyStatus.APPROVED,
      result: data.result ?? '已授予',
      attachments: data.attachments ?? undefined,
    },
  });
}

export async function auditHonor(id: string, data: { passed: boolean; result?: string }) {
  return auditAward(id, data);
}
