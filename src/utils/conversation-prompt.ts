import type { ConversationRequest } from '../type/conversation'

// 模型可接收的最大上下文消息数
const MAX_CONTEXT_MESSAGE_COUNT = 12

// 提示词内最多保留的近期开场白数量
const MAX_RECENT_OPENING_COUNT = 4

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
  // 新会话的开场要求
  const openingInstruction = request.isOpening
    ? `这是新会话。像自然的聊天伙伴一样自主选择一个轻松、具体、容易回答的切入点，不必先寒暄，也不要按照固定话题类别轮换。避免询问用户今天过得怎么样，不要假设用户经历过某件事或具有某种偏好。以下是最近使用过的开场白，不要复用相同主题、句式或问题：\n${recentOpeningsText || '无'}\ncorrection 必须为 null。`
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
