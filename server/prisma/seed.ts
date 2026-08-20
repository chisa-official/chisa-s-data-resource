import 'dotenv/config';
import { PrismaClient, DataScope, MenuType, ConfigType, AdminStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_CONFIGS } from '../src/shared/config/config.service';

const prisma = new PrismaClient();

/** 预置角色：与任务书 02 第 2.1 节一致 */
const ROLES = [
  {
    name: '超级管理员',
    code: 'SUPER_ADMIN',
    dataScope: DataScope.ALL,
    menus: [] as string[],
    permissions: ['*'],
  },
  {
    name: '教务员',
    code: 'ACADEMIC_AFFAIRS',
    dataScope: DataScope.ALL,
    menus: [],
    permissions: [
      'course:list', 'course:create', 'course:update', 'course:delete',
      'schedule:list', 'schedule:create', 'schedule:publish',
      'score:import', 'score:update', 'score:audit',
      'selection:period', 'selection:list',
      'retake:manage', 'exam:retake:manage',
      'student:list', 'student:detail',
      'department:list', 'major:list', 'class:list', 'teacher:list',
    ],
  },
  {
    name: '辅导员',
    code: 'COUNSELOR',
    dataScope: DataScope.DEPARTMENT,
    menus: [],
    permissions: [
      'student:list', 'student:detail',
      'leave:list', 'leave:approve', 'leave:reject', 'leave:forward',
      'attendance:list', 'attendance:statistics', 'attendance:warning',
      'award:list', 'award:audit',
      'discipline:list', 'discipline:create',
    ],
  },
  {
    name: '学工老师',
    code: 'STUDENT_AFFAIRS',
    dataScope: DataScope.ALL,
    menus: [],
    permissions: [
      'student:list', 'student:detail',
      'leave:list', 'leave:approve', 'leave:reject',
      'award:project:manage', 'award:list', 'award:audit', 'award:publish',
      'discipline:list', 'discipline:create', 'discipline:update', 'discipline:delete',
      'honor:manage',
      'dorm:list', 'dorm:inspection', 'dorm:violation',
    ],
  },
  {
    name: '宿管',
    code: 'DORM_MANAGER',
    dataScope: DataScope.SELF,
    menus: [],
    permissions: [
      'dorm:list', 'dorm:create', 'dorm:update', 'dorm:delete',
      'dorm:assign', 'dorm:transfer', 'dorm:checkout',
      'dorm:inspection', 'dorm:violation',
      'repair:list', 'repair:handle',
    ],
  },
];

/** 预置字典：任务书 02 模块 2 */
const DICTS = [
  // 学籍状态
  { type: 'student_status', items: [
    { label: '在校', value: 'NORMAL', sort: 1 },
    { label: '休学', value: 'SUSPENDED', sort: 2 },
    { label: '复学', value: 'RESUMED', sort: 3 },
    { label: '退学', value: 'DROPPED', sort: 4 },
    { label: '留级', value: 'HELD_BACK', sort: 5 },
    { label: '毕业', value: 'GRADUATED', sort: 6 },
  ]},
  // 学籍异动类型
  { type: 'status_change_type', items: [
    { label: '休学', value: 'SUSPEND', sort: 1 },
    { label: '复学', value: 'RESUME', sort: 2 },
    { label: '转专业', value: 'TRANSFER_MAJOR', sort: 3 },
    { label: '退学', value: 'DROP_OUT', sort: 4 },
  ]},
  // 申请状态
  { type: 'apply_status', items: [
    { label: '待审批', value: 'PENDING', sort: 1 },
    { label: '通过', value: 'APPROVED', sort: 2 },
    { label: '驳回', value: 'REJECTED', sort: 3 },
  ]},
  // 请假类型
  { type: 'leave_type', items: [
    { label: '事假', value: 'PERSONAL', sort: 1 },
    { label: '病假', value: 'SICK', sort: 2 },
  ]},
  // 奖助类型
  { type: 'award_type', items: [
    { label: '奖学金', value: 'SCHOLARSHIP', sort: 1 },
    { label: '助学金', value: 'AID', sort: 2 },
    { label: '助学贷款', value: 'LOAN', sort: 3 },
    { label: '评优', value: 'HONOR', sort: 4 },
  ]},
  // 违纪类型
  { type: 'discipline_type', items: [
    { label: '警告', value: 'WARNING', sort: 1 },
    { label: '严重警告', value: 'SERIOUS_WARNING', sort: 2 },
    { label: '记过', value: 'DEMERIT', sort: 3 },
    { label: '开除', value: 'EXPEL', sort: 4 },
  ]},
  // 课程类型
  { type: 'course_type', items: [
    { label: '必修', value: 'REQUIRED', sort: 1 },
    { label: '选修', value: 'ELECTIVE', sort: 2 },
    { label: '公共', value: 'PUBLIC', sort: 3 },
  ]},
  // 通知范围
  { type: 'notice_scope', items: [
    { label: '全校', value: 'SCHOOL', sort: 1 },
    { label: '院系', value: 'DEPARTMENT', sort: 2 },
    { label: '班级', value: 'CLASS', sort: 3 },
  ]},
  // 报修类型
  { type: 'repair_type', items: [
    { label: '宿舍', value: 'DORM', sort: 1 },
    { label: '教室', value: 'CLASSROOM', sort: 2 },
  ]},
  // 报修状态
  { type: 'repair_status', items: [
    { label: '待处理', value: 'PENDING', sort: 1 },
    { label: '处理中', value: 'PROCESSING', sort: 2 },
    { label: '已完成', value: 'DONE', sort: 3 },
  ]},
  // 性别
  { type: 'gender', items: [
    { label: '男', value: 'MALE', sort: 1 },
    { label: '女', value: 'FEMALE', sort: 2 },
  ]},
  // 考勤状态
  { type: 'attendance_status', items: [
    { label: '出勤', value: 'PRESENT', sort: 1 },
    { label: '缺勤', value: 'ABSENT', sort: 2 },
    { label: '迟到', value: 'LATE', sort: 3 },
    { label: '请假', value: 'LEAVE', sort: 4 },
  ]},
];

/** 后台菜单预置（树形） */
const MENUS = [
  {
    name: '系统管理', path: '/system', icon: 'Setting', type: MenuType.DIRECTORY, sort: 1,
    children: [
      { name: '用户管理', path: 'user', component: 'system/user/index', type: MenuType.MENU, sort: 1, permission: 'user:list' },
      { name: '角色管理', path: 'role', component: 'system/role/index', type: MenuType.MENU, sort: 2, permission: 'role:list' },
      { name: '菜单管理', path: 'menu', component: 'system/menu/index', type: MenuType.MENU, sort: 3, permission: 'menu:list' },
      { name: '登录日志', path: 'log/login', component: 'system/log/login', type: MenuType.MENU, sort: 4 },
      { name: '操作日志', path: 'log/operation', component: 'system/log/operation', type: MenuType.MENU, sort: 5 },
    ],
  },
  {
    name: '基础数据', path: '/base', icon: 'Folder', type: MenuType.DIRECTORY, sort: 2,
    children: [
      { name: '院系管理', path: 'department', component: 'base/department/index', type: MenuType.MENU, sort: 1 },
      { name: '专业管理', path: 'major', component: 'base/major/index', type: MenuType.MENU, sort: 2 },
      { name: '班级管理', path: 'class', component: 'base/class/index', type: MenuType.MENU, sort: 3 },
      { name: '教师管理', path: 'teacher', component: 'base/teacher/index', type: MenuType.MENU, sort: 4 },
      { name: '课程维护', path: 'course', component: 'base/course/index', type: MenuType.MENU, sort: 5 },
      { name: '字典管理', path: 'dict', component: 'base/dict/index', type: MenuType.MENU, sort: 6 },
    ],
  },
  {
    name: '学籍管理', path: '/status', icon: 'User', type: MenuType.DIRECTORY, sort: 3,
    children: [
      { name: '学生档案', path: 'student', component: 'status/student/index', type: MenuType.MENU, sort: 1 },
      { name: '学籍异动', path: 'change', component: 'status/change/index', type: MenuType.MENU, sort: 2 },
      { name: '信息修改审批', path: 'info-edit', component: 'status/info-edit/index', type: MenuType.MENU, sort: 3 },
      { name: '证明申请', path: 'certificate', component: 'status/certificate/index', type: MenuType.MENU, sort: 4 },
      { name: '毕业审核', path: 'graduation', component: 'status/graduation/index', type: MenuType.MENU, sort: 5 },
    ],
  },
  {
    name: '教务管理', path: '/academic', icon: 'Reading', type: MenuType.DIRECTORY, sort: 4,
    children: [
      { name: '课程维护', path: 'course', component: 'academic/course/index', type: MenuType.MENU, sort: 1 },
      { name: '排课管理', path: 'schedule', component: 'academic/schedule/index', type: MenuType.MENU, sort: 2 },
      { name: '成绩录入', path: 'score/input', component: 'academic/score/input', type: MenuType.MENU, sort: 3 },
      { name: '成绩审核', path: 'score/audit', component: 'academic/score/audit', type: MenuType.MENU, sort: 4 },
      { name: '选课管理', path: 'selection', component: 'academic/selection/index', type: MenuType.MENU, sort: 5 },
      { name: '重修管理', path: 'retake', component: 'academic/retake/index', type: MenuType.MENU, sort: 6 },
    ],
  },
  {
    name: '学工管理', path: '/affairs', icon: 'Trophy', type: MenuType.DIRECTORY, sort: 5,
    children: [
      { name: '请假审批', path: 'leave', component: 'affairs/leave/index', type: MenuType.MENU, sort: 1 },
      { name: '奖助贷项目', path: 'award/project', component: 'affairs/award/project', type: MenuType.MENU, sort: 2 },
      { name: '奖助审核', path: 'award/audit', component: 'affairs/award/audit', type: MenuType.MENU, sort: 3 },
      { name: '名单公示', path: 'award/publish', component: 'affairs/award/publish', type: MenuType.MENU, sort: 4 },
      { name: '违纪管理', path: 'discipline', component: 'affairs/discipline/index', type: MenuType.MENU, sort: 5 },
      { name: '评优管理', path: 'honor', component: 'affairs/honor/index', type: MenuType.MENU, sort: 6 },
    ],
  },
  {
    name: '宿舍管理', path: '/dorm', icon: 'House', type: MenuType.DIRECTORY, sort: 6,
    children: [
      { name: '宿舍床位', path: 'room', component: 'dorm/room/index', type: MenuType.MENU, sort: 1 },
      { name: '入住办理', path: 'assign', component: 'dorm/assign/index', type: MenuType.MENU, sort: 2 },
      { name: '卫生检查', path: 'inspection', component: 'dorm/inspection/index', type: MenuType.MENU, sort: 3 },
      { name: '违纪登记', path: 'violation', component: 'dorm/violation/index', type: MenuType.MENU, sort: 4 },
      { name: '报修工单', path: 'repair', component: 'dorm/repair/index', type: MenuType.MENU, sort: 5 },
    ],
  },
  {
    name: '考勤管理', path: '/attendance', icon: 'Calendar', type: MenuType.DIRECTORY, sort: 7,
    children: [
      { name: '考勤录入', path: 'input', component: 'attendance/input', type: MenuType.MENU, sort: 1 },
      { name: '考勤记录', path: 'list', component: 'attendance/list', type: MenuType.MENU, sort: 2 },
      { name: '考勤统计', path: 'statistics', component: 'attendance/statistics', type: MenuType.MENU, sort: 3 },
      { name: '预警名单', path: 'warning', component: 'attendance/warning', type: MenuType.MENU, sort: 4 },
      { name: '预警规则', path: 'rule', component: 'attendance/rule', type: MenuType.MENU, sort: 5 },
    ],
  },
  {
    name: '通知公告', path: '/notice', icon: 'Bell', type: MenuType.DIRECTORY, sort: 8,
    children: [
      { name: '通知列表', path: 'list', component: 'notice/list', type: MenuType.MENU, sort: 1 },
      { name: '阅读统计', path: 'read-stats', component: 'notice/read-stats', type: MenuType.MENU, sort: 2 },
    ],
  },
  {
    name: '报表统计', path: '/report', icon: 'DataAnalysis', type: MenuType.DIRECTORY, sort: 9,
    children: [
      { name: '学生统计', path: 'student', component: 'report/student', type: MenuType.MENU, sort: 1 },
      { name: '学籍异动', path: 'status', component: 'report/status', type: MenuType.MENU, sort: 2 },
      { name: '考勤统计', path: 'attendance', component: 'report/attendance', type: MenuType.MENU, sort: 3 },
      { name: '奖助统计', path: 'award', component: 'report/award', type: MenuType.MENU, sort: 4 },
      { name: '违纪统计', path: 'discipline', component: 'report/discipline', type: MenuType.MENU, sort: 5 },
    ],
  },
];

/** 消息模板预置 */
const MESSAGE_TEMPLATES = [
  { code: 'APPROVAL_PASS', title: '审批通过通知', content: '您的 {{bizType}} 申请已通过审批。', channel: 'IN_APP' },
  { code: 'APPROVAL_REJECT', title: '审批驳回通知', content: '您的 {{bizType}} 申请被驳回，原因：{{reason}}。', channel: 'IN_APP' },
  { code: 'LEAVE_REMIND', title: '请假提醒', content: '学生 {{studentName}} 提交了请假申请，请及时审批。', channel: 'IN_APP' },
  { code: 'ATTENDANCE_WARNING', title: '考勤预警', content: '学生 {{studentName}} 已缺勤 {{count}} 次，达到预警阈值。', channel: 'BOTH' },
  { code: 'NOTICE_PUBLISH', title: '通知公告', content: '{{title}}', channel: 'IN_APP' },
  { code: 'REPAIR_UPDATE', title: '报修进度更新', content: '您的报修工单（{{location}}）状态已更新为：{{status}}。', channel: 'IN_APP' },
] as const;

async function main(): Promise<void> {
  console.log('开始种子数据初始化...');

  // 1. 角色
  console.log('创建预置角色...');
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { permissions: r.permissions as any },
      create: {
        name: r.name,
        code: r.code,
        dataScope: r.dataScope,
        menus: r.menus as any,
        permissions: r.permissions as any,
      },
    });
  }

  // 2. 超级管理员账号
  console.log('创建超级管理员账号 admin / admin123...');
  const superRole = await prisma.role.findUnique({ where: { code: 'SUPER_ADMIN' } });
  if (superRole) {
    const password = await bcrypt.hash('admin123', 10);
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password,
        realName: '系统管理员',
        roleId: superRole.id,
        status: AdminStatus.ACTIVE,
      },
    });
  }

  // 3. 菜单（递归创建）
  console.log('创建预置菜单...');
  const superAdmin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  async function createMenus(menus: any[], parentId?: string): Promise<void> {
    for (const m of menus) {
      const { children, ...data } = m;
      const created = await prisma.menu.create({
        data: { ...data, parentId: parentId || null } as any,
      });
      if (children && children.length > 0) {
        await createMenus(children, created.id);
      }
    }
  }
  // 先清空旧菜单（开发期重复 seed 友好）
  await prisma.menu.deleteMany({});
  await createMenus(MENUS);

  // 超管角色 menus 字段填充为所有菜单 ID
  if (superRole) {
    const allMenus = await prisma.menu.findMany();
    await prisma.role.update({
      where: { id: superRole.id },
      data: { menus: allMenus.map((m) => m.id) as any },
    });
  }

  // 4. 字典（使用 type+value 作为业务唯一键去重）
  console.log('创建预置字典...');
  for (const group of DICTS) {
    const existing = await prisma.dict.findMany({ where: { type: group.type } });
    const existingValues = new Set(existing.map((e) => e.value));
    for (const item of group.items) {
      if (!existingValues.has(item.value)) {
        await prisma.dict.create({
          data: { type: group.type, label: item.label, value: item.value, sort: item.sort },
        });
      }
    }
  }

  // 5. 系统配置
  console.log('创建预置系统配置...');
  for (const cfg of DEFAULT_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key: cfg.key } });
    if (!existing) {
      await prisma.systemConfig.create({ data: { ...cfg } as any });
    }
  }

  // 6. 消息模板
  console.log('创建预置消息模板...');
  for (const tpl of MESSAGE_TEMPLATES) {
    const existing = await prisma.messageTemplate.findUnique({ where: { code: tpl.code } });
    if (!existing) {
      await prisma.messageTemplate.create({
        data: {
          code: tpl.code,
          title: tpl.title,
          content: tpl.content,
          channel: tpl.channel as any,
        },
      });
    }
  }

  // 7. 注册用户的「待分配」虚拟院系/专业/班级（注册先挂靠到这里，后台审核后再分配真实院系/班级）
  console.log('创建「待分配」虚拟组织机构...');
  const pendingDept = await prisma.department.findFirst({ where: { code: 'PENDING' } }) || await prisma.department.create({
    data: { name: '待分配', code: 'PENDING', sort: 999 },
  });
  const pendingMajor = await prisma.major.findFirst({ where: { code: 'PENDING' } }) || await prisma.major.create({
    data: { name: '待分配', code: 'PENDING', departmentId: pendingDept.id, duration: 4 },
  });
  const pendingClass = await prisma.class.findFirst({ where: { name: '待分配' } }) || await prisma.class.create({
    data: { name: '待分配', departmentId: pendingDept.id, majorId: pendingMajor.id, grade: 0 },
  });

  // 7.1 测试学生账号（便于联调）
  console.log('创建测试学生账号 20240001 / 123456...');
  const dept = await prisma.department.findFirst({ where: { code: 'CS' } }) || await prisma.department.create({
    data: { name: '计算机学院', code: 'CS', sort: 1 },
  });
  const major = await prisma.major.findFirst({ where: { code: 'CS-SE' } }) || await prisma.major.create({
    data: { name: '软件工程', code: 'CS-SE', departmentId: dept.id, duration: 4 },
  });
  const cls = await prisma.class.findFirst({ where: { name: '软件2401' } }) || await prisma.class.create({
    data: { name: '软件2401', departmentId: dept.id, majorId: major.id, grade: 2024 },
  });
  const existingStudent = await prisma.student.findUnique({ where: { studentNo: '20240001' } });
  let studentId: string;
  if (!existingStudent) {
    const pwd = await bcrypt.hash('123456', 10);
    const created = await prisma.student.create({
      data: {
        studentNo: '20240001',
        password: pwd,
        name: '张三',
        gender: 'MALE',
        departmentId: dept.id,
        classId: cls.id,
        phone: '13800000001',
        email: 'zhangsan@example.com',
        status: 'NORMAL',
        enrollDate: new Date('2024-09-01'),
      },
    });
    studentId = created.id;
  } else {
    studentId = existingStudent.id;
  }

  // 8. 教师与课程数据（任务书01 模块3 联调用）
  console.log('创建教师与课程数据...');
  const teacher1 = await prisma.teacher.findFirst({ where: { teacherNo: 'T001' } }) ||
    await prisma.teacher.create({
      data: { teacherNo: 'T001', name: '王教授', gender: 'MALE', departmentId: dept.id, title: '教授', phone: '13900000001' },
    });
  const teacher2 = await prisma.teacher.findFirst({ where: { teacherNo: 'T002' } }) ||
    await prisma.teacher.create({
      data: { teacherNo: 'T002', name: '李老师', gender: 'FEMALE', departmentId: dept.id, title: '副教授', phone: '13900000002' },
    });
  const teacher3 = await prisma.teacher.findFirst({ where: { teacherNo: 'T003' } }) ||
    await prisma.teacher.create({
      data: { teacherNo: 'T003', name: '赵老师', gender: 'MALE', departmentId: dept.id, title: '讲师', phone: '13900000003' },
    });

  const SEMESTER = '2025-2026-1';
  const selectStart = new Date();
  const selectEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天后

  // 课程：必修2 + 选修2 + 公共1
  const courses = [
    { code: 'CS101', name: '数据结构', credit: 4, hours: 64, teacherId: teacher1.id, type: 'REQUIRED', capacity: 60 },
    { code: 'CS102', name: '操作系统', credit: 3, hours: 48, teacherId: teacher1.id, type: 'REQUIRED', capacity: 60 },
    { code: 'CS201', name: 'Web前端开发', credit: 2, hours: 32, teacherId: teacher2.id, type: 'ELECTIVE', capacity: 40 },
    { code: 'CS202', name: '人工智能导论', credit: 2, hours: 32, teacherId: teacher3.id, type: 'ELECTIVE', capacity: 30 },
    { code: 'PUB101', name: '大学英语', credit: 3, hours: 48, teacherId: teacher2.id, type: 'PUBLIC', capacity: 100 },
  ];

  const courseIds: Record<string, string> = {};
  for (const c of courses) {
    const existing = await prisma.course.findUnique({ where: { code: c.code } });
    if (existing) {
      courseIds[c.code] = existing.id;
    } else {
      const created = await prisma.course.create({
        data: {
          code: c.code,
          name: c.name,
          credit: c.credit,
          hours: c.hours,
          teacherId: c.teacherId,
          departmentId: dept.id,
          type: c.type as any,
          capacity: c.capacity,
          selectStart: c.type === 'ELECTIVE' || c.type === 'PUBLIC' ? selectStart : null,
          selectEnd: c.type === 'ELECTIVE' || c.type === 'PUBLIC' ? selectEnd : null,
        },
      });
      courseIds[c.code] = created.id;
    }
  }

  // 课表：每周 1-16 周
  const schedules = [
    { courseCode: 'CS101', weekDay: 1, startSection: 1, endSection: 2, classroom: 'A101' },
    { courseCode: 'CS102', weekDay: 2, startSection: 3, endSection: 4, classroom: 'A102' },
    { courseCode: 'CS201', weekDay: 3, startSection: 5, endSection: 6, classroom: 'B201' },
    { courseCode: 'CS202', weekDay: 4, startSection: 5, endSection: 6, classroom: 'B202' },
    { courseCode: 'PUB101', weekDay: 5, startSection: 1, endSection: 2, classroom: 'C301' },
  ];

  for (const s of schedules) {
    const existing = await prisma.schedule.findFirst({
      where: { courseId: courseIds[s.courseCode], weekDay: s.weekDay, startSection: s.startSection },
    });
    if (!existing) {
      await prisma.schedule.create({
        data: {
          courseId: courseIds[s.courseCode],
          classId: cls.id,
          weekDay: s.weekDay,
          startSection: s.startSection,
          endSection: s.endSection,
          startWeek: 1,
          endWeek: 16,
          classroom: s.classroom,
        },
      });
    }
  }

  // 选课：学生已选必修课 + 一门选修
  const selections = [
    { courseCode: 'CS101', status: 'SELECTED' },
    { courseCode: 'CS102', status: 'SELECTED' },
    { courseCode: 'CS201', status: 'SELECTED' },
    { courseCode: 'PUB101', status: 'SELECTED' },
  ];

  for (const sel of selections) {
    const existing = await prisma.courseSelection.findUnique({
      where: {
        studentId_courseId_semester: {
          studentId,
          courseId: courseIds[sel.courseCode],
          semester: SEMESTER,
        },
      },
    });
    if (!existing) {
      await prisma.courseSelection.create({
        data: {
          studentId,
          courseId: courseIds[sel.courseCode],
          semester: SEMESTER,
          status: sel.status as any,
        },
      });
    }
  }

  // 成绩：上一学期成绩（含一门不及格用于重修/补考测试）
  const LAST_SEMESTER = '2024-2025-2';
  const scores = [
    { courseCode: 'CS101', usualScore: 85, examScore: 80, finalScore: 82, gpaPoint: 3.7, retake: false },
    { courseCode: 'CS102', usualScore: 70, examScore: 65, finalScore: 67, gpaPoint: 1.7, retake: false },
    { courseCode: 'PUB101', usualScore: 90, examScore: 88, finalScore: 89, gpaPoint: 4.0, retake: false },
    // 一门不及格：用于重修/补考测试
    { courseCode: 'CS202', usualScore: 50, examScore: 45, finalScore: 47, gpaPoint: 0, retake: false },
  ];

  for (const sc of scores) {
    const existing = await prisma.score.findFirst({
      where: { studentId, courseId: courseIds[sc.courseCode], semester: LAST_SEMESTER },
    });
    if (!existing) {
      await prisma.score.create({
        data: {
          studentId,
          courseId: courseIds[sc.courseCode],
          semester: LAST_SEMESTER,
          usualScore: sc.usualScore,
          examScore: sc.examScore,
          finalScore: sc.finalScore,
          gpaPoint: sc.gpaPoint,
          retake: sc.retake,
          audited: true,
        },
      });
    }
  }

  // 9. 奖助记录（任务书01 模块4 联调用）
  console.log('创建奖助记录测试数据...');
  const AWARD_SEMESTER = '2024-2025-2';
  const awards = [
    { type: 'SCHOLARSHIP', name: '国家奖学金', amount: 8000, status: 'APPROVED', result: '评审通过，予以发放' },
    { type: 'AID', name: '国家助学金', amount: 3000, status: 'APPROVED', result: '评审通过，予以发放' },
    { type: 'LOAN', name: '生源地助学贷款', amount: 5000, status: 'PENDING', result: null },
    { type: 'HONOR', name: '三好学生', amount: null, status: 'APPROVED', result: '评审通过' },
  ];
  for (const a of awards) {
    const existing = await prisma.award.findFirst({
      where: { studentId, type: a.type as any, name: a.name, semester: AWARD_SEMESTER },
    });
    if (!existing) {
      await prisma.award.create({
        data: {
          studentId,
          type: a.type as any,
          name: a.name,
          amount: a.amount,
          semester: AWARD_SEMESTER,
          status: a.status as any,
          result: a.result,
        },
      });
    }
  }

  // 10. 违纪记录
  console.log('创建违纪记录测试数据...');
  const disciplines = [
    { type: 'WARNING', reason: '上课多次迟到', occurredAt: new Date('2025-03-15') },
    { type: 'DEMERIT', reason: '考试违纪', occurredAt: new Date('2025-06-20') },
  ];
  for (const d of disciplines) {
    const existing = await prisma.discipline.findFirst({
      where: { studentId, type: d.type as any, reason: d.reason },
    });
    if (!existing) {
      await prisma.discipline.create({
        data: {
          studentId,
          type: d.type as any,
          reason: d.reason,
          occurredAt: d.occurredAt,
        },
      });
    }
  }

  // 11. 请假记录
  console.log('创建请假记录测试数据...');
  const leaveApplies = [
    {
      type: 'PERSONAL',
      startDate: new Date('2025-10-10'),
      endDate: new Date('2025-10-11'),
      reason: '家中有事需回家处理',
      attachmentUrl: null,
      status: 'PENDING',
      reviewedAt: null,
    },
    {
      type: 'SICK',
      startDate: new Date('2025-09-20'),
      endDate: new Date('2025-09-22'),
      reason: '感冒发烧，需就医休养',
      attachmentUrl: '/uploads/sick-cert-20250920.pdf',
      status: 'APPROVED',
      reviewedAt: new Date('2025-09-19'),
    },
    {
      type: 'PERSONAL',
      startDate: new Date('2025-09-05'),
      endDate: new Date('2025-09-06'),
      reason: '外出办理个人事务',
      attachmentUrl: null,
      status: 'REJECTED',
      reviewedAt: new Date('2025-09-04'),
    },
  ];
  for (const l of leaveApplies) {
    const existing = await prisma.leaveApply.findFirst({
      where: { studentId, type: l.type as any, startDate: l.startDate, endDate: l.endDate },
    });
    if (!existing) {
      await prisma.leaveApply.create({
        data: {
          studentId,
          type: l.type as any,
          startDate: l.startDate,
          endDate: l.endDate,
          reason: l.reason,
          attachmentUrl: l.attachmentUrl,
          status: l.status as any,
          currentStep: l.status === 'PENDING' ? 0 : 1,
          reviewedAt: l.reviewedAt,
        },
      });
    }
  }

  // 12. 考勤记录 + 考勤规则
  console.log('创建考勤记录测试数据...');
  const classSchedules = await prisma.schedule.findMany({
    where: { classId: cls.id },
    include: { course: { select: { id: true } } },
    orderBy: [{ weekDay: 'asc' }, { startSection: 'asc' }],
  });

  // 生成 4 周 x 5 节课 = 20 条考勤记录
  // 状态分布：PRESENT 14 / ABSENT 3 / LATE 2 / LEAVE 1
  const weekStatus: string[][] = [
    ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'PRESENT'],
    ['PRESENT', 'PRESENT', 'PRESENT', 'ABSENT', 'LATE'],
    ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'ABSENT'],
    ['PRESENT', 'PRESENT', 'ABSENT', 'LATE', 'LEAVE'],
  ];
  const semesterStart = new Date('2025-09-01T08:00:00Z'); // 学期第1周周一
  for (let week = 0; week < 4; week++) {
    for (let i = 0; i < classSchedules.length; i++) {
      const sch = classSchedules[i];
      const status = weekStatus[week][i];
      const date = new Date(semesterStart);
      date.setDate(date.getDate() + week * 7 + (sch.weekDay - 1));
      const existing = await prisma.attendanceRecord.findFirst({
        where: { studentId, scheduleId: sch.id, date },
      });
      if (!existing) {
        await prisma.attendanceRecord.create({
          data: {
            studentId,
            courseId: sch.courseId,
            scheduleId: sch.id,
            date,
            status: status as any,
          },
        });
      }
    }
  }

  // 考勤预警规则
  const existingRule = await prisma.attendanceRule.findFirst({ where: { notifyRole: 'COUNSELOR' } });
  if (!existingRule) {
    await prisma.attendanceRule.create({
      data: { threshold: 3, notifyRole: 'COUNSELOR' },
    });
  }

  // 13. 宿舍数据（任务书01 模块6 联调用）
  console.log('创建宿舍数据...');
  const dorm = await prisma.dorm.findFirst({ where: { building: '3号楼', roomNo: '301' } }) ||
    await prisma.dorm.create({
      data: {
        building: '3号楼',
        roomNo: '301',
        capacity: 4,
        gender: 'MALE',
        beds: JSON.stringify(['1', '2', '3', '4']),
      },
    });

  // 分配学生到床位1
  const existingAssign = await prisma.dormAssignment.findUnique({ where: { studentId } });
  if (!existingAssign) {
    await prisma.dormAssignment.create({
      data: {
        studentId,
        dormId: dorm.id,
        bedNo: '1',
        moveInDate: new Date('2024-09-01'),
        status: 'ACTIVE',
      },
    });
  }

  // 卫生检查记录
  const inspections = [
    { score: 92, issues: null, inspectedAt: new Date('2025-09-15') },
    { score: 85, issues: '地面有灰尘，需加强清洁', inspectedAt: new Date('2025-10-15') },
    { score: 95, issues: null, inspectedAt: new Date('2025-11-15') },
  ];
  for (const ins of inspections) {
    const existing = await prisma.dormInspection.findFirst({
      where: { dormId: dorm.id, inspectedAt: ins.inspectedAt },
    });
    if (!existing) {
      await prisma.dormInspection.create({
        data: { dormId: dorm.id, score: ins.score, issues: ins.issues, inspectedAt: ins.inspectedAt, inspectorId: superAdmin!.id },
      });
    }
  }

  // 宿舍违纪记录
  const dormViolations = [
    { type: '违规电器', description: '检查发现使用大功率电器（热得快）', occurredAt: new Date('2025-10-08') },
    { type: '晚归', description: '夜间23:30后返回宿舍', occurredAt: new Date('2025-11-02') },
  ];
  for (const v of dormViolations) {
    const existing = await prisma.dormViolation.findFirst({
      where: { dormId: dorm.id, type: v.type, occurredAt: v.occurredAt },
    });
    if (!existing) {
      await prisma.dormViolation.create({
        data: { dormId: dorm.id, studentId, type: v.type, description: v.description, occurredAt: v.occurredAt },
      });
    }
  }

  // 14. 通知公告（任务书01 模块7 联调用）
  console.log('创建通知公告数据...');
  const notices = [
    {
      title: '关于2025-2026学年第一学期选课的通知',
      content: '<p>各位同学：</p><p>2025-2026学年第一学期选课将于2025年9月1日开始，请同学们在规定时间内完成选课。</p><p>选课时间：2025-09-01 08:00 至 2025-09-07 18:00</p><p>如有疑问，请联系教务处。</p>',
      scope: 'SCHOOL',
      targetId: null,
      publishAt: new Date('2025-08-28'),
    },
    {
      title: '计算机学院关于举办编程大赛的通知',
      content: '<p>计算机学院将举办第十届编程大赛，欢迎同学们踊跃报名参加。</p><p>报名时间：即日起至2025年10月15日</p><p>比赛时间：2025年10月25日</p>',
      scope: 'DEPARTMENT',
      targetId: dept.id,
      publishAt: new Date('2025-09-20'),
    },
    {
      title: '软件2401班关于召开主题班会的通知',
      content: '<p>软件2401班将于本周五下午2点在A301教室召开主题班会，请全体同学准时参加。</p><p>主题：学风建设与考勤管理</p>',
      scope: 'CLASS',
      targetId: cls.id,
      publishAt: new Date('2025-10-10'),
    },
    {
      title: '关于校园安全教育的通知',
      content: '<p>为加强校园安全管理，学校将组织安全教育讲座。</p><p>时间：2025年11月5日 14:00</p><p>地点：大礼堂</p>',
      scope: 'SCHOOL',
      targetId: null,
      publishAt: new Date('2025-11-01'),
    },
  ];
  const noticeIds: string[] = [];
  for (const n of notices) {
    const existing = await prisma.notice.findFirst({
      where: { title: n.title, scope: n.scope as any },
    });
    if (existing) {
      noticeIds.push(existing.id);
    } else {
      const created = await prisma.notice.create({
        data: {
          title: n.title,
          content: n.content,
          scope: n.scope as any,
          targetId: n.targetId,
          publishAt: n.publishAt,
          published: true,
          publisherId: superAdmin!.id,
        },
      });
      noticeIds.push(created.id);
    }
  }

  // 标记前2条通知为已读
  for (let i = 0; i < 2 && i < noticeIds.length; i++) {
    const existing = await prisma.noticeRead.findUnique({
      where: { noticeId_studentId: { noticeId: noticeIds[i], studentId } },
    });
    if (!existing) {
      await prisma.noticeRead.create({
        data: { noticeId: noticeIds[i], studentId },
      });
    }
  }

  // 15. 报修记录（任务书01 模块8 联调用）
  console.log('创建报修与反馈数据...');
  const repairs = [
    { type: 'DORM', location: '3号楼301室', description: '窗户把手损坏，无法关窗', status: 'DONE', result: '已更换窗户把手', images: [] as string[] },
    { type: 'DORM', location: '3号楼301室', description: '水龙头漏水', status: 'PROCESSING', result: null, images: [] as string[] },
    { type: 'CLASSROOM', location: 'A101教室', description: '投影仪无法开机', status: 'PENDING', result: null, images: [] as string[] },
  ];
  for (const r of repairs) {
    const existing = await prisma.repair.findFirst({
      where: { studentId, type: r.type as any, description: r.description },
    });
    if (!existing) {
      await prisma.repair.create({
        data: {
          studentId,
          type: r.type as any,
          location: r.location,
          description: r.description,
          status: r.status as any,
          result: r.result,
          images: r.images,
        },
      });
    }
  }

  // 反馈记录
  const feedbacks = [
    { type: 'SUGGESTION', content: '建议图书馆延长开放时间至22:30', status: 'APPROVED', reply: '感谢您的建议，已转交图书馆管理处评估。' },
    { type: 'COMPLAINT', content: '食堂饭菜质量有待提高，希望增加菜品种类', status: 'PENDING', reply: null },
  ];
  for (const f of feedbacks) {
    const existing = await prisma.feedback.findFirst({
      where: { studentId, type: f.type as any, content: f.content },
    });
    if (!existing) {
      await prisma.feedback.create({
        data: {
          studentId,
          type: f.type as any,
          content: f.content,
          status: f.status as any,
          reply: f.reply,
        },
      });
    }
  }

  // 统计输出
  const awardCount = await prisma.award.count({ where: { studentId } });
  const disciplineCount = await prisma.discipline.count({ where: { studentId } });
  const leaveCount = await prisma.leaveApply.count({ where: { studentId } });
  const attendanceCount = await prisma.attendanceRecord.count({ where: { studentId } });
  const dormCount = await prisma.dormAssignment.count({ where: { studentId } });
  const noticeCount = await prisma.notice.count();
  const repairCount = await prisma.repair.count({ where: { studentId } });
  const feedbackCount = await prisma.feedback.count({ where: { studentId } });

  console.log('种子数据初始化完成。');
  console.log('  超级管理员: admin / admin123');
  console.log('  测试学生:   20240001 / 123456');
  console.log('  课程数据:   5 门课程（必修2 + 选修2 + 公共1），含课表/选课/成绩');
  console.log(`  奖惩资助:   奖助 ${awardCount} 条，违纪 ${disciplineCount} 条`);
  console.log(`  考勤请假:   请假 ${leaveCount} 条，考勤 ${attendanceCount} 条`);
  console.log(`  宿舍管理:   入住 ${dormCount} 条，含卫生检查与违纪记录`);
  console.log(`  通知公告:   ${noticeCount} 条（含全校/院系/班级范围）`);
  console.log(`  反馈报修:   报修 ${repairCount} 条，反馈 ${feedbackCount} 条`);
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
