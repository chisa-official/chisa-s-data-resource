import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { readExcel, writeExcel, type ExcelColumn } from '../../shared/io/excel';

// ========== 成绩查询 ==========

export interface ScoreListParams {
  page: number;
  pageSize: number;
  studentNo?: string;
  studentName?: string;
  courseId?: string;
  semester?: string;
  audited?: boolean;
}

export async function listScores(params: ScoreListParams) {
  const where: any = {};
  if (params.courseId) where.courseId = params.courseId;
  if (params.semester) where.semester = params.semester;
  if (params.audited !== undefined) where.audited = params.audited;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.score.findMany({
      where,
      include: {
        student: { select: { id: true, studentNo: true, name: true, class: { select: { name: true } } } },
        course: { select: { id: true, code: true, name: true, credit: true, type: true } },
      },
      orderBy: [{ semester: 'desc' }, { student: { studentNo: 'asc' } }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.score.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

// ========== 单条成绩修改 ==========

export async function updateScore(
  id: string,
  data: { usualScore?: number; examScore?: number; finalScore?: number; retake?: boolean },
) {
  const score = await prisma.score.findUnique({ where: { id } });
  if (!score) throw ApiError.notFound('成绩记录不存在');
  if (score.audited) throw ApiError.badRequest('已审核的成绩不可修改，请先打回');

  // 自动计算总评与绩点（若未提供）
  let finalScore = data.finalScore;
  if (finalScore === undefined && (data.usualScore !== undefined || data.examScore !== undefined)) {
    const usual = data.usualScore ?? score.usualScore ?? 0;
    const exam = data.examScore ?? score.examScore ?? 0;
    finalScore = Number((usual * 0.3 + exam * 0.7).toFixed(2));
  }
  if (finalScore === undefined) finalScore = score.finalScore;

  // 绩点换算：90-100 → 4.0, 85-89 → 3.7, 82-84 → 3.3, 78-81 → 3.0, 75-77 → 2.7, 72-74 → 2.3, 68-71 → 2.0, 64-67 → 1.5, 60-63 → 1.0, <60 → 0
  const gpaPoint = scoreToGpa(finalScore);

  return prisma.score.update({
    where: { id },
    data: {
      ...(data.usualScore !== undefined ? { usualScore: data.usualScore } : {}),
      ...(data.examScore !== undefined ? { examScore: data.examScore } : {}),
      finalScore,
      gpaPoint,
      ...(data.retake !== undefined ? { retake: data.retake } : {}),
    },
  });
}

function scoreToGpa(score: number): number {
  if (score >= 90) return 4.0;
  if (score >= 85) return 3.7;
  if (score >= 82) return 3.3;
  if (score >= 78) return 3.0;
  if (score >= 75) return 2.7;
  if (score >= 72) return 2.3;
  if (score >= 68) return 2.0;
  if (score >= 64) return 1.5;
  if (score >= 60) return 1.0;
  return 0;
}

// ========== 成绩审核 / 打回 ==========

export async function auditScore(id: string) {
  const score = await prisma.score.findUnique({ where: { id } });
  if (!score) throw ApiError.notFound('成绩记录不存在');
  if (score.audited) throw ApiError.badRequest('该成绩已审核');
  return prisma.score.update({
    where: { id },
    data: { audited: true },
  });
}

export async function auditScoresBatch(ids: string[]): Promise<{ count: number }> {
  const result = await prisma.score.updateMany({
    where: { id: { in: ids }, audited: false },
    data: { audited: true },
  });
  return { count: result.count };
}

export async function rejectScore(id: string) {
  const score = await prisma.score.findUnique({ where: { id } });
  if (!score) throw ApiError.notFound('成绩记录不存在');
  return prisma.score.update({
    where: { id },
    data: { audited: false },
  });
}

// ========== Excel 批量录入 ==========

const SCORE_COLUMNS: ExcelColumn[] = [
  { header: '学号', key: 'studentNo', width: 15 },
  { header: '姓名', key: 'name', width: 12 },
  { header: '课程编码', key: 'courseCode', width: 15 },
  { header: '课程名称', key: 'courseName', width: 25 },
  { header: '学期', key: 'semester', width: 14 },
  { header: '平时成绩', key: 'usualScore', width: 12 },
  { header: '考试成绩', key: 'examScore', width: 12 },
  { header: '总评', key: 'finalScore', width: 10 },
  { header: '绩点', key: 'gpaPoint', width: 10 },
];

export async function importScores(
  file: Express.Multer.File,
  courseId?: string,
  semester?: string,
) {
  const rows = await readExcel(file.buffer);
  if (rows.length === 0) throw ApiError.badRequest('Excel 数据为空');

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const studentNo = String(row['学号'] || '').trim();
    const courseCode = String(row['课程编码'] || '').trim();
    const sem = String(row['学期'] || '').trim() || semester;
    const usualRaw = row['平时成绩'];
    const examRaw = row['考试成绩'];

    if (!studentNo || !courseCode || !sem) {
      errors.push({ row: rowNum, message: '学号/课程编码/学期为空' });
      continue;
    }

    const student = await prisma.student.findUnique({ where: { studentNo } });
    if (!student) {
      errors.push({ row: rowNum, message: `学号「${studentNo}」不存在` });
      continue;
    }

    const course = await prisma.course.findUnique({
      where: { code: courseCode },
      ...(courseId ? { where: { id: courseId, code: courseCode } } : {}),
    });
    if (!course) {
      errors.push({ row: rowNum, message: `课程编码「${courseCode}」不存在` });
      continue;
    }

    const usualScore = usualRaw !== undefined && usualRaw !== '' ? Number(usualRaw) : undefined;
    const examScore = examRaw !== undefined && examRaw !== '' ? Number(examRaw) : undefined;
    if (
      (usualScore !== undefined && (isNaN(usualScore) || usualScore < 0 || usualScore > 100)) ||
      (examScore !== undefined && (isNaN(examScore) || examScore < 0 || examScore > 100))
    ) {
      errors.push({ row: rowNum, message: '成绩取值应在 0-100' });
      continue;
    }

    const finalScore = Number(((usualScore ?? 0) * 0.3 + (examScore ?? 0) * 0.7).toFixed(2));
    const gpaPoint = scoreToGpa(finalScore);

    // upsert：同一学生+课程+学期 唯一约束不存在，使用 findFirst + update/create
    const existing = await prisma.score.findFirst({
      where: { studentId: student.id, courseId: course.id, semester: sem },
    });

    if (existing) {
      await prisma.score.update({
        where: { id: existing.id },
        data: {
          usualScore: usualScore ?? null,
          examScore: examScore ?? null,
          finalScore,
          gpaPoint,
          audited: false,
        },
      });
    } else {
      await prisma.score.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          semester: sem,
          usualScore: usualScore ?? null,
          examScore: examScore ?? null,
          finalScore,
          gpaPoint,
        },
      });
    }
    successCount++;
  }

  return {
    total: rows.length,
    successCount,
    failCount: errors.length,
    errors,
  };
}

export async function exportScoreTemplate(courseId?: string, semester?: string) {
  // 拉取选修该课程的所有学生作为模板预填
  let students: { studentNo: string; name: string }[] = [];
  if (courseId && semester) {
    const selections = await prisma.courseSelection.findMany({
      where: { courseId, semester, status: 'SELECTED' },
      include: { student: { select: { studentNo: true, name: true } } },
    });
    students = selections.map((s) => s.student);
  }
  const course = courseId ? await prisma.course.findUnique({ where: { id: courseId } }) : null;

  const rows = students.map((s) => ({
    studentNo: s.studentNo,
    name: s.name,
    courseCode: course?.code || '',
    courseName: course?.name || '',
    semester: semester || '',
    usualScore: '',
    examScore: '',
    finalScore: '',
    gpaPoint: '',
  }));

  if (rows.length === 0) {
    rows.push({
      studentNo: '20240001',
      name: '张三',
      courseCode: course?.code || 'CS101',
      courseName: course?.name || '示例课程',
      semester: semester || '2025-2026-1',
      usualScore: '',
      examScore: '',
      finalScore: '',
      gpaPoint: '',
    });
  }

  return writeExcel(rows, SCORE_COLUMNS, '成绩录入模板');
}

// ========== 绩点计算（按学生） ==========

export async function calculateGpa(studentId: string) {
  const scores = await prisma.score.findMany({
    where: { studentId, finalScore: { gte: 60 } },
    include: { course: { select: { credit: true } } },
  });

  let totalCredits = 0;
  let totalPoints = 0;
  for (const s of scores) {
    const credit = s.course.credit;
    totalCredits += credit;
    totalPoints += credit * s.gpaPoint;
  }

  return {
    studentId,
    totalCredits,
    gpa: totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0,
    courseCount: scores.length,
  };
}

/** 批量触发绩点计算（仅返回统计，成绩录入时已自动计算绩点） */
export async function batchCalculateGpa(): Promise<{ studentCount: number }> {
  const count = await prisma.student.count();
  return { studentCount: count };
}
