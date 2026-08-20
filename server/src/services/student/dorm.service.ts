import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';

/** 获取学生宿舍信息（含宿舍详情 + 床位） */
export async function getMyDorm(studentId: string) {
  const assignment = await prisma.dormAssignment.findUnique({
    where: { studentId },
    include: { dorm: true },
  });
  if (!assignment) return null;
  return assignment;
}

/** 卫生检查记录（按宿舍查询，分页） */
export async function getInspections(studentId: string, query: any) {
  const assignment = await prisma.dormAssignment.findUnique({
    where: { studentId },
    select: { dormId: true },
  });
  if (!assignment) return { list: [], total: 0, page: 1, pageSize: 10 };

  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  const skip = (page - 1) * pageSize;

  const [list, total] = await Promise.all([
    prisma.dormInspection.findMany({
      where: { dormId: assignment.dormId },
      orderBy: { inspectedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.dormInspection.count({ where: { dormId: assignment.dormId } }),
  ]);

  return { list, total, page, pageSize };
}

/** 宿舍违纪通报（按宿舍查询，分页） */
export async function getViolations(studentId: string, query: any) {
  const assignment = await prisma.dormAssignment.findUnique({
    where: { studentId },
    select: { dormId: true },
  });
  if (!assignment) return { list: [], total: 0, page: 1, pageSize: 10 };

  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  const skip = (page - 1) * pageSize;

  const [list, total] = await Promise.all([
    prisma.dormViolation.findMany({
      where: { dormId: assignment.dormId },
      orderBy: { occurredAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.dormViolation.count({ where: { dormId: assignment.dormId } }),
  ]);

  return { list, total, page, pageSize };
}

/** 调宿申请 —— 生成站内消息通知宿管处理 */
export async function applyTransfer(
  studentId: string,
  data: { reason: string; preferredDorm?: string },
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, studentNo: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const assignment = await prisma.dormAssignment.findUnique({
    where: { studentId },
    include: { dorm: true },
  });
  if (!assignment) throw ApiError.badRequest('您当前未分配宿舍，无法申请调宿');

  // 查找所有宿管角色管理员
  const dormManagers = await prisma.admin.findMany({
    where: { role: { code: 'DORM_MANAGER' }, status: 'ACTIVE' },
    select: { id: true },
  });

  const title = `调宿申请 - ${student.name}(${student.studentNo})`;
  const content = `学生 ${student.name}（学号 ${student.studentNo}）申请调宿，原因：${data.reason}${
    data.preferredDorm ? `，期望宿舍：${data.preferredDorm}` : ''
  }。当前宿舍：${assignment.dorm.building}-${assignment.dorm.roomNo} ${assignment.bedNo}号床位。`;

  // 向宿管发送站内消息（若无宿管则发给超管）
  const receivers = dormManagers.length > 0
    ? dormManagers
    : await prisma.admin.findMany({
        where: { role: { code: 'SUPER_ADMIN' } },
        select: { id: true },
      });

  if (receivers.length > 0) {
    await prisma.message.createMany({
      data: receivers.map((r) => ({
        receiverId: r.id,
        receiverType: 'ADMIN',
        title,
        content,
        type: 'SYSTEM',
        channel: 'IN_APP',
        bizType: 'dorm_transfer',
        bizId: studentId,
      })),
    });
  }

  return { submitted: true, message: '调宿申请已提交，请等待宿管处理' };
}

/** 退宿申请 —— 生成站内消息通知宿管处理 */
export async function applyCheckout(studentId: string, data: { reason: string }) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, studentNo: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const assignment = await prisma.dormAssignment.findUnique({
    where: { studentId },
    include: { dorm: true },
  });
  if (!assignment) throw ApiError.badRequest('您当前未分配宿舍，无法申请退宿');
  if (assignment.status === 'MOVED_OUT') throw ApiError.badRequest('您已退宿，无需重复申请');

  const dormManagers = await prisma.admin.findMany({
    where: { role: { code: 'DORM_MANAGER' }, status: 'ACTIVE' },
    select: { id: true },
  });

  const title = `退宿申请 - ${student.name}(${student.studentNo})`;
  const content = `学生 ${student.name}（学号 ${student.studentNo}）申请退宿，原因：${data.reason}。当前宿舍：${assignment.dorm.building}-${assignment.dorm.roomNo} ${assignment.bedNo}号床位。`;

  const receivers = dormManagers.length > 0
    ? dormManagers
    : await prisma.admin.findMany({
        where: { role: { code: 'SUPER_ADMIN' } },
        select: { id: true },
      });

  if (receivers.length > 0) {
    await prisma.message.createMany({
      data: receivers.map((r) => ({
        receiverId: r.id,
        receiverType: 'ADMIN',
        title,
        content,
        type: 'SYSTEM',
        channel: 'IN_APP',
        bizType: 'dorm_checkout',
        bizId: studentId,
      })),
    });
  }

  return { submitted: true, message: '退宿申请已提交，请等待宿管处理' };
}
