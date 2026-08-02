import { z } from 'zod'
import type { ConversationCoachResponse } from '../../../type/conversation'

/** 用户表达纠正结构 */
const conversationCorrectionSchema = z.object({
  // 更自然的英文表达
  suggestedText: z.string().min(1).describe('更自然、完整的英文表达'),
  // 中文纠错说明
  explanation: z.string().min(1).describe('简洁的简体中文纠错说明')
})

/** 口语教练结构化响应 */
export const conversationCoachResponseSchema: z.ZodType<ConversationCoachResponse> = z.object({
  // AI 英文回复
  reply: z.string().min(1).describe('1 至 3 句自然英语回复'),
  // 回复中文释义
  translation: z.string().min(1).describe('英文回复的简体中文释义'),
  // 可选表达纠正
  correction: conversationCorrectionSchema.nullable().describe('无需纠正时为 null')
})
