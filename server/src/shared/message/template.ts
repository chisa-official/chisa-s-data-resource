import { prisma } from '../utils/prisma';
import { ApiError } from '../error/ApiError';

export interface RenderedTemplate {
  title: string;
  content: string;
}

/** 从模板编码读取模板并替换占位符 {{name}} */
export async function renderTemplate(
  code: string,
  values: Record<string, string>,
): Promise<RenderedTemplate> {
  const tpl = await prisma.messageTemplate.findUnique({ where: { code } });
  if (!tpl) throw ApiError.notFound(`消息模板不存在: ${code}`);
  if (!tpl.enabled) throw ApiError.badRequest(`消息模板已禁用: ${code}`);

  return {
    title: replacePlaceholders(tpl.title, values),
    content: replacePlaceholders(tpl.content, values),
  };
}

function replacePlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? '');
}

// 预置模板编码常量，供业务模块统一引用
export const TEMPLATE_CODES = {
  APPROVAL_PASS: 'APPROVAL_PASS',       // 审批通过
  APPROVAL_REJECT: 'APPROVAL_REJECT',   // 审批驳回
  LEAVE_REMIND: 'LEAVE_REMIND',         // 请假提醒
  ATTENDANCE_WARNING: 'ATTENDANCE_WARNING', // 考勤预警
  NOTICE_PUBLISH: 'NOTICE_PUBLISH',     // 通知公告
  REPAIR_UPDATE: 'REPAIR_UPDATE',       // 报修状态更新
} as const;
