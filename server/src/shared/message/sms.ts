import { prisma } from '../utils/prisma';
import { logger } from '../logger/logger';
import { LRUCache } from 'lru-cache';

export interface SmsResult {
  success: boolean;
  providerMsgId?: string;
  error?: string;
}

export interface SmsProvider {
  send(phone: string, templateCode: string, params: Record<string, string>): Promise<SmsResult>;
}

/** Mock 短信：开发环境打印日志 */
export class MockSmsProvider implements SmsProvider {
  async send(phone: string, templateCode: string, params: Record<string, string>): Promise<SmsResult> {
    logger.info(`[MockSMS] -> ${phone} | 模板 ${templateCode} | 参数 ${JSON.stringify(params)}`);
    return { success: true, providerMsgId: `mock-${Date.now()}` };
  }
}

/** 阿里云短信实现占位（启用真实短信时实现） */
export class AliyunSmsProvider implements SmsProvider {
  async send(phone: string, templateCode: string, params: Record<string, string>): Promise<SmsResult> {
    // 实际项目：
    // import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
    // import * as $OpenApi from '@alicloud/openapi-client';
    // import * as $Util from '@alicloud/tea-util';
    // const config = new $OpenApi.Config({ accessKeyId, accessKeySecret });
    // const client = new Dysmsapi20170525.default(config);
    // const req = new $Dysmsapi20170525.SendSmsRequest({
    //   phoneNumbers: phone,
    //   signName: process.env.ALIYUN_SMS_SIGN_NAME,
    //   templateCode,
    //   templateParam: JSON.stringify(params),
    // });
    // const resp = await client.sendSmsWithOptions(req, new $Util.RuntimeOptions({}));
    logger.warn('阿里云短信未实现，请配置 SDK', { phone, templateCode });
    return { success: false, error: '阿里云短信未实现' };
  }
}

export function getSmsProvider(): SmsProvider {
  const type = process.env.SMS_PROVIDER || 'mock';
  return type === 'aliyun' ? new AliyunSmsProvider() : new MockSmsProvider();
}

export const smsProvider = getSmsProvider();

// 频率限制：同手机号 1 分钟 1 条
const rateLimit = new LRUCache<string, number>({ max: 10000, ttl: 60 * 1000 });

/** 发送短信 + 记录日志 + 频率限制 */
export async function sendSms(
  phone: string,
  params: Record<string, string>,
  templateCode = 'SMS_DEFAULT',
): Promise<SmsResult> {
  // 频率限制
  if (rateLimit.has(phone)) {
    logger.warn('短信发送被限流', { phone });
    return { success: false, error: '发送过于频繁，请稍后再试' };
  }
  rateLimit.set(phone, 1);

  const result = await smsProvider.send(phone, templateCode, params);

  await prisma.smsLog.create({
    data: {
      phone,
      templateCode,
      params: params as any,
      status: result.success ? 'SUCCESS' : 'FAIL',
      providerMsgId: result.providerMsgId,
      error: result.error,
    },
  });

  return result;
}
