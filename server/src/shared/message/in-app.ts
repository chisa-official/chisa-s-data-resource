import { prisma } from '../utils/prisma';
import { UserType, MessageChannel, MessageType } from '@prisma/client';
import { renderTemplate } from './template';
import { sendSms } from './sms';
import { emitMessage } from './websocket';
import { logger } from '../logger/logger';

export interface SendMessageParams {
  receiverId: string;
  receiverType: UserType;
  title: string;
  content: string;
  type?: MessageType;
  channel?: MessageChannel;
  bizType?: string;
  bizId?: string;
  /** 短信接收手机号（channel 含 SMS 时必填） */
  phone?: string;
  /** 短信模板参数 */
  smsParams?: Record<string, string>;
}

/** 发送单条消息 */
export async function sendMessage(params: SendMessageParams): Promise<void> {
  const channel = params.channel ?? MessageChannel.IN_APP;
  const type = params.type ?? MessageType.SYSTEM;

  // 1. 站内消息入库
  if (channel === MessageChannel.IN_APP || channel === MessageChannel.BOTH) {
    const msg = await prisma.message.create({
      data: {
        receiverId: params.receiverId,
        receiverType: params.receiverType,
        title: params.title,
        content: params.content,
        type,
        bizType: params.bizType,
        bizId: params.bizId,
        channel,
      },
    });
    // WebSocket 实时推送
    emitMessage(params.receiverId, params.receiverType, {
      id: msg.id,
      title: msg.title,
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
    });
  }

  // 2. 短信发送
  if (channel === MessageChannel.SMS || channel === MessageChannel.BOTH) {
    if (!params.phone) {
      logger.warn('短信发送跳过：缺少手机号', { receiverId: params.receiverId });
      return;
    }
    await sendSms(params.phone, params.smsParams || {});
  }
}

/** 批量发送（如通知公告推送给全院学生） */
export async function sendBatchMessage(
  list: SendMessageParams[],
): Promise<{ success: number; fail: number }> {
  let success = 0;
  let fail = 0;
  // 串行避免瞬时压力，生产可改并发控制
  for (const params of list) {
    try {
      await sendMessage(params);
      success++;
    } catch (e) {
      fail++;
      logger.error('批量消息发送失败', { params, error: e });
    }
  }
  return { success, fail };
}

/** 按模板编码发送 */
export async function sendByTemplate(
  code: string,
  params: {
    receiverId: string;
    receiverType: UserType;
    phone?: string;
    smsParams?: Record<string, string>;
    placeholderValues: Record<string, string>;
    bizType?: string;
    bizId?: string;
    channel?: MessageChannel;
    type?: MessageType;
  },
): Promise<void> {
  const rendered = await renderTemplate(code, params.placeholderValues);
  await sendMessage({
    receiverId: params.receiverId,
    receiverType: params.receiverType,
    title: rendered.title,
    content: rendered.content,
    type: params.type,
    channel: params.channel,
    bizType: params.bizType,
    bizId: params.bizId,
    phone: params.phone,
    smsParams: params.smsParams,
  });
}

/** 标记已读 */
export async function markRead(messageId: string, userId: string): Promise<void> {
  await prisma.message.updateMany({
    where: { id: messageId, receiverId: userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

/** 全部已读 */
export async function markAllRead(userId: string, userType: UserType): Promise<void> {
  await prisma.message.updateMany({
    where: { receiverId: userId, receiverType: userType, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

/** 未读数 */
export async function getUnreadCount(userId: string, userType: UserType): Promise<number> {
  return prisma.message.count({
    where: { receiverId: userId, receiverType: userType, isRead: false },
  });
}
