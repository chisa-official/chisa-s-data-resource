import { prisma } from '../../shared/utils/prisma';

/** 我的违纪记录（只读，返回数组） */
export async function getDisciplineList(studentId: string) {
  return prisma.discipline.findMany({
    where: { studentId },
    orderBy: { occurredAt: 'desc' },
  });
}
