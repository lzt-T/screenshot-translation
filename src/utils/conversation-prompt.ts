import type { ConversationRequest } from '../type/conversation'
import { MAX_RECENT_OPENING_COUNT } from './conversation-opening'

// 模型可接收的最大上下文消息数
const MAX_CONTEXT_MESSAGE_COUNT = 12

/**
 * 构建英语口语教练提示词
 * @param request 当前对话请求
 * @returns 结构化口语教练提示词
 */
export function getConversationPrompt(request: ConversationRequest): string {
  // 最近的有效对话上下文
  const recentHistory = request.history.slice(-MAX_CONTEXT_MESSAGE_COUNT)
  // 便于模型读取的上下文文本
  const historyText = recentHistory
    .map((item) => `${item.role === 'user' ? 'Learner' : 'Coach'}: ${item.text}`)
    .join('\n')
  // 当前用户输入
  const userText = request.userText?.trim() || ''
  // 最近使用过的有效开场白
  const recentOpenings = (request.recentOpenings ?? [])
    .map((opening) => opening.trim())
    .filter(Boolean)
    .slice(-MAX_RECENT_OPENING_COUNT)
  // 便于模型比较的开场白文本
  const recentOpeningsText = recentOpenings
    .map((opening, index) => `${index + 1}. ${opening}`)
    .join('\n')
  // 当前开场使用的宽泛灵感
  const openingInspiration = request.openingInspiration?.trim() || '自然选择一个轻量切入点'
  // 重试时必须明确避开的冲突开场
  const conflictingOpening = request.conflictingOpening?.trim() || ''
  // 新会话的开场要求
  const openingInstruction = request.isOpening
    ? `这是新会话。围绕以下灵感自然发挥，不要把灵感说明直接复述给用户：${openingInspiration}
生成简洁、自然、容易回答的开场，不要假设用户已经经历过某件事。
以下是近期需要避开的开场，不要复用相同问题：
${recentOpeningsText || '无'}
${conflictingOpening ? `本次重试尤其不能复用：${conflictingOpening}\n` : ''}correction 必须为 null。`
    : ''

  return `
你是一位面向中文母语者的英语口语陪练。保持自然、友好、简洁的日常英语对话。
reply 必须使用自然英语，限制为 1 至 3 句，并尽量以一个容易回答的问题延续对话。
translation 必须是 reply 的准确简体中文释义。
只有当前用户表达存在实质语法错误或明显不地道时才返回 correction；不要纠正大小写、标点或语音识别造成的格式差异。
correction.suggestedText 使用更自然的完整英文；correction.explanation 使用简洁的简体中文说明。无需纠正时 correction 必须为 null。
${openingInstruction}
仅返回符合指定结构的 JSON，不要使用 Markdown，不要添加结构之外的内容。

最近对话：
${historyText || '无'}

当前用户表达：${userText || '无'}
`
}
