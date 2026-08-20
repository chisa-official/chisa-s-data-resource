import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { SelectionStatus } from '@prisma/client';

// ========== 重修管理 ==========

export interface RetakeListParams {
  page: number;
  pageSize: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
}

/** 重修报名列表：所有 retake=true 的选课记录 */
export async function listRetakes(params: RetakeListParams) {
  const where: any = { status: SelectionStatus.SELECTED };
  // 重修判断：选课记录对应学生该课程历史成绩 < 60
  // 简化：通过 score 关联表 retake=true 标识
  if (params.semester) where.semester = params.semester;
  if (params.courseId) where.courseId = params.courseId;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  // 查询所有不及格成绩（作为重修候选）
  const failedWhere: any = { finalScore: { lt: 60 } };
  if (params.courseId) failedWhere.courseId = params.courseId;
  if (params.semester) failedWhere.semester = params.semester;
  if (params.studentNo || params.studentName) {
    failedWhere.student = {};
    if (params.studentNo) failedWhere.student.studentNo = { contains: params.studentNo };
    if (params.studentName) failedWhere.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.score.findMany({
      where: failedWhere,
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
        course: {
          select: { id: true, code: true, name: true, credit: true, type: true, teacher: { select: { name: true } } },
        },
      },
      orderBy: [{ semester: 'desc' }, { student: { studentNo: 'asc' } }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.score.count({ where: failedWhere }),
  ]);

  // 查询这些学生当前学期是否已报名重修
  const currentSemester = params.semester || getCurrentSemester();
  const studentCoursePairs = list.map((s) => ({ studentId: s.studentId, courseId: s.courseId }));
  const existingSelections = await prisma.courseSelection.findMany({
    where: {
      OR: studentCoursePairs.map((p) => ({ studentId: p.studentId, courseId: p.courseId, semester: currentSemester })),
    },
    select: { studentId: true, courseId: true, status: true },
  });
  const selectionMap = new Map(
    existingSelections.map((s) => [`${s.studentId}_${s.courseId}`, s.status]),
  );

  return {
    list: list.map((s) => ({
      ...s,
      retakeStatus: selectionMap.get(`${s.studentId}_${s.courseId}`) || 'NOT_APPLIED',
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  const term = month >= 8 || month < 2 ? 1 : 2;
  return `${startYear}-${endYear}-${term}`;
}

/** 管理员为不及格学生批量报名重修 */
export async function registerRetake(scoreIds: string[], semester?: string) {
  const sem = semester || getCurrentSemester();
  const scores = await prisma.score.findMany({
    where: { id: { in: scoreIds }, finalScore: { lt: 60 } },
  });
  if (scores.length === 0) throw ApiError.badRequest('未找到符合重修条件的不及格成绩');

  let created = 0;
  let updated = 0;
  for (const score of scores) {
    const existing = await prisma.courseSelection.findFirst({
      where: { studentId: score.studentId, courseId: score.courseId, semester: sem },
    });
    if (existing) {
      if (existing.status !== SelectionStatus.SELECTED) {
        await prisma.courseSelection.update({
          where: { id: existing.id },
          data: { status: SelectionStatus.SELECTED },
        });
        updated++;
      }
    } else {
      await prisma.courseSelection.create({
        data: {
          studentId: score.studentId,
          courseId: score.courseId,
          semester: sem,
          status: SelectionStatus.SELECTED,
        },
      });
      created++;
    }
  }

  return { semester: sem, created, updated, total: scores.length };
}

// ========== 补考管理 ==========

export interface ExamRetakeListParams {
  page: number;
  pageSize: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
  retake?: boolean;
}

/** 补考名单：不及格成绩（finalScore < 60） */
export async function listExamRetakes(params: ExamRetakeListParams) {
  const where: any = { finalScore: { lt: 60 } };
  if (params.courseId) where.courseId = params.courseId;
  if (params.semester) where.semester = params.semester;
  if (params.retake !== undefined) where.retake = params.retake;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.score.findMany({
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
        course: {
          select: { id: true, code: true, name: true, credit: true, type: true, teacher: { select: { name: true } } },
        },
      },
      orderBy: [{ semester: 'desc' }, { student: { studentNo: 'asc' } }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.score.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 标记补考通过：录入补考成绩（覆盖 finalScore） */
export async function recordExamRetakeScore(
  scoreId: string,
  retakeScore: number,
) {
  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score) throw ApiError.notFound('成绩记录不存在');
  if (score.finalScore >= 60) throw ApiError.badRequest('该课程已及格，无需补考');
  if (retakeScore < 0 || retakeScore > 100) throw ApiError.badRequest('补考成绩取值 0-100');

  // 补考成绩统一记为 60 分及格线，绩点按补考成绩重算但最高 1.0
  const finalScore = retakeScore;
  const gpaPoint = retakeScore >= 60 ? 1.0 : 0;

  return prisma.score.update({
    where: { id: scoreId },
    data: {
      finalScore,
      gpaPoint,
      retake: true,
    },
  });
}

/** 批量标记补考通过（仅改 retake 标记） */
export async function batchMarkRetake(scoreIds: string[]): Promise<{ count: number }> {
  const result = await prisma.score.updateMany({
    where: { id: { in: scoreIds }, finalScore: { lt: 60 }, retake: false },
    data: { retake: true },
  });
  return { count: result.count };
}
