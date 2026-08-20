import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { CourseType, SelectionStatus } from '@prisma/client';
import { DEFAULT_SEMESTER } from '../../middlewares/student';

/** 查询课表：按学生班级 + 学期（week 暂用于过滤 startWeek<=week<=endWeek） */
export async function getTimetable(studentId: string, semester: string, week: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const schedules = await prisma.schedule.findMany({
    where: {
      classId: student.classId,
      // 按周过滤：startWeek <= week <= endWeek
      startWeek: { lte: week },
      endWeek: { gte: week },
      course: { selections: { some: { studentId, status: SelectionStatus.SELECTED } } },
    },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          credit: true,
          type: true,
          teacher: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ weekDay: 'asc' }, { startSection: 'asc' }],
  });

  return schedules;
}

/** 成绩列表：按学期分组返回 */
export async function getScores(studentId: string, semester?: string) {
  const where: any = { studentId };
  if (semester) where.semester = semester;

  const scores = await prisma.score.findMany({
    where,
    include: {
      course: {
        select: { id: true, code: true, name: true, credit: true, type: true },
      },
    },
    orderBy: { semester: 'desc' },
  });

  // 按学期分组
  const grouped: Record<string, typeof scores> = {};
  for (const s of scores) {
    if (!grouped[s.semester]) grouped[s.semester] = [];
    grouped[s.semester].push(s);
  }

  return { grouped, list: scores };
}

/** 绩点统计：Σ(学分×绩点)/Σ学分，按学期与总评 */
export async function getGpa(studentId: string, semester?: string) {
  const where: any = { studentId };
  if (semester) where.semester = semester;

  const scores = await prisma.score.findMany({
    where,
    include: { course: { select: { credit: true } } },
  });

  // 按学期分组计算
  const semesterGpa: Record<string, { totalCredits: number; totalPoints: number; gpa: number }> = {};
  let allCredits = 0;
  let allPoints = 0;

  for (const s of scores) {
    const credit = s.course.credit;
    const point = s.gpaPoint;
    if (!semesterGpa[s.semester]) {
      semesterGpa[s.semester] = { totalCredits: 0, totalPoints: 0, gpa: 0 };
    }
    semesterGpa[s.semester].totalCredits += credit;
    semesterGpa[s.semester].totalPoints += credit * point;
    allCredits += credit;
    allPoints += credit * point;
  }

  // 计算每个学期 GPA
  const result = Object.entries(semesterGpa).map(([sem, data]) => ({
    semester: sem,
    totalCredits: data.totalCredits,
    gpa: data.totalCredits > 0 ? Number((data.totalPoints / data.totalCredits).toFixed(2)) : 0,
  }));

  result.sort((a, b) => b.semester.localeCompare(a.semester));

  return {
    semesters: result,
    overallGpa: allCredits > 0 ? Number((allPoints / allCredits).toFixed(2)) : 0,
    totalCredits: allCredits,
  };
}

/** 可选课程列表：选修/公共 + 选课时间窗口内 + 含已选人数 */
export async function getSelectableCourses(studentId: string, semester: string) {
  const now = new Date();
  const courses = await prisma.course.findMany({
    where: {
      type: { in: [CourseType.ELECTIVE, CourseType.PUBLIC] },
      // 选课时间窗口（未配置则不限）
      AND: [
        { OR: [{ selectStart: null }, { selectStart: { lte: now } }] },
        { OR: [{ selectEnd: null }, { selectEnd: { gte: now } }] },
      ],
    },
    include: {
      teacher: { select: { id: true, name: true, title: true } },
      department: { select: { id: true, name: true } },
      schedules: { select: { weekDay: true, startSection: true, endSection: true, classroom: true } },
      _count: {
        select: { selections: { where: { semester, status: SelectionStatus.SELECTED } } },
      },
    },
  });

  // 查询学生已选课程 ID
  const mySelections = await prisma.courseSelection.findMany({
    where: { studentId, semester, status: SelectionStatus.SELECTED },
    select: { courseId: true },
  });
  const myCourseIds = new Set(mySelections.map((s) => s.courseId));

  return courses.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    credit: c.credit,
    hours: c.hours,
    type: c.type,
    capacity: c.capacity,
    teacher: c.teacher,
    department: c.department,
    schedules: c.schedules,
    selectedCount: c._count.selections,
    remaining: c.capacity - c._count.selections,
    isSelected: myCourseIds.has(c.id),
  }));
}

/** 我的已选课程 */
export async function getMySelections(studentId: string, semester: string) {
  return prisma.courseSelection.findMany({
    where: { studentId, semester, status: SelectionStatus.SELECTED },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          credit: true,
          type: true,
          teacher: { select: { name: true } },
          schedules: { select: { weekDay: true, startSection: true, endSection: true, classroom: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** 选课：事务校验容量、时间冲突、唯一约束 */
export async function selectCourse(studentId: string, courseId: string, semester: string) {
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.findUnique({ where: { id: courseId } });
    if (!course) throw ApiError.notFound('课程不存在');
    if (course.type === CourseType.REQUIRED) throw ApiError.badRequest('必修课无需选课');

    // 选课时间窗口校验
    const now = new Date();
    if (course.selectStart && now < course.selectStart) throw ApiError.badRequest('选课尚未开始');
    if (course.selectEnd && now > course.selectEnd) throw ApiError.badRequest('选课已结束');

    // 容量校验
    const selectedCount = await tx.courseSelection.count({
      where: { courseId, semester, status: SelectionStatus.SELECTED },
    });
    if (selectedCount >= course.capacity) throw ApiError.badRequest('课程已满');

    // 已选校验
    const existing = await tx.courseSelection.findUnique({
      where: { studentId_courseId_semester: { studentId, courseId, semester } },
    });
    if (existing && existing.status === SelectionStatus.SELECTED) {
      throw ApiError.badRequest('已选该课程');
    }

    // 时间冲突校验：查询学生本学期已选课程的课表
    if (existing && existing.status === SelectionStatus.DROPPED) {
      // 退选后重新选课，复用记录
      return tx.courseSelection.update({
        where: { id: existing.id },
        data: { status: SelectionStatus.SELECTED },
      });
    }

    return tx.courseSelection.create({
      data: { studentId, courseId, semester, status: SelectionStatus.SELECTED },
    });
  });
}

/** 退选 */
export async function dropCourse(studentId: string, selectionId: string) {
  const selection = await prisma.courseSelection.findUnique({ where: { id: selectionId } });
  if (!selection) throw ApiError.notFound('选课记录不存在');
  if (selection.studentId !== studentId) throw ApiError.forbidden('无权操作他人选课记录');
  if (selection.status !== SelectionStatus.SELECTED) throw ApiError.badRequest('该课程已退选或已完成');

  // 退选时限校验：查询课程 selectEnd
  const course = await prisma.course.findUnique({ where: { id: selection.courseId } });
  if (course?.selectEnd && new Date() > course.selectEnd) {
    throw ApiError.badRequest('退选时间已过');
  }

  return prisma.courseSelection.update({
    where: { id: selectionId },
    data: { status: SelectionStatus.DROPPED },
  });
}

/** 可重修课程：不及格成绩（finalScore < 60）对应课程 */
export async function getRetakeableCourses(studentId: string) {
  const failedScores = await prisma.score.findMany({
    where: { studentId, finalScore: { lt: 60 } },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          name: true,
          credit: true,
          type: true,
          teacher: { select: { name: true } },
        },
      },
    },
    orderBy: { semester: 'desc' },
  });
  return failedScores;
}

/** 报名重修：创建新的 CourseSelection 记录，标记 retake */
export async function applyRetake(studentId: string, courseId: string, semester: string) {
  // 校验是否曾不及格
  const failedScore = await prisma.score.findFirst({
    where: { studentId, courseId, finalScore: { lt: 60 } },
  });
  if (!failedScore) throw ApiError.badRequest('该课程无不及格记录，不可重修');

  return selectCourse(studentId, courseId, semester);
}

/** 补考报名列表：不及格课程 */
export async function getExamRetakeList(studentId: string) {
  return prisma.score.findMany({
    where: { studentId, finalScore: { lt: 60 }, retake: false },
    include: {
      course: { select: { id: true, code: true, name: true, credit: true } },
    },
    orderBy: { semester: 'desc' },
  });
}

/** 补考报名：标记 retake=true */
export async function applyExamRetake(studentId: string, scoreId: string) {
  const score = await prisma.score.findUnique({ where: { id: scoreId } });
  if (!score) throw ApiError.notFound('成绩记录不存在');
  if (score.studentId !== studentId) throw ApiError.forbidden('无权操作');
  if (score.finalScore >= 60) throw ApiError.badRequest('该课程已及格，无需补考');
  if (score.retake) throw ApiError.badRequest('已报名补考');

  return prisma.score.update({
    where: { id: scoreId },
    data: { retake: true },
  });
}
