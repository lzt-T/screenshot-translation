import type {
  ConversationOpeningInspirationKey,
  ConversationOpeningRecord
} from '../type/conversation'

// 本地保留的近期成功开场数量
export const MAX_RECENT_OPENING_COUNT = 12

// 近期开场使用的本地存储键
export const RECENT_CONVERSATION_OPENINGS_STORAGE_KEY = 'recentConversationOpenings'

// 开场灵感键对应的生成方向
export const CONVERSATION_OPENING_INSPIRATION_MAP: Readonly<
  Record<ConversationOpeningInspirationKey, string>
> = {
  choice: '从一个轻量、没有标准答案的日常选择切入',
  imagination: '用一个容易想象且不要求真实经历的简单假设场景切入',
  observation: '邀请学习者观察或描述身边常见的事物或现象',
  recommendation: '邀请学习者给出一个低门槛的建议或推荐',
  description: '邀请学习者用简单语言描述一个熟悉的对象或概念',
  opinion: '询问一个轻松、不敏感且容易表达的个人观点',
  planning: '围绕一个普通的小计划或安排展开，但不要假设学习者已有计划',
  'problem-solving': '提出一个简短的日常小问题，邀请学习者想一个解决办法'
}

// 所有可用的开场灵感键
const CONVERSATION_OPENING_INSPIRATION_KEYS = Object.keys(
  CONVERSATION_OPENING_INSPIRATION_MAP
) as ConversationOpeningInspirationKey[]

/** 判断未知值是否为有效的近期开场记录 */
function isConversationOpeningRecord(value: unknown): value is ConversationOpeningRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  // 待校验的记录字段
  const record = value as Partial<ConversationOpeningRecord>
  return (
    typeof record.text === 'string' &&
    record.text.trim().length > 0 &&
    typeof record.inspirationKey === 'string' &&
    record.inspirationKey in CONVERSATION_OPENING_INSPIRATION_MAP
  )
}

/**
 * 从本地存储值中提取有效的近期开场记录
 * @param value 未知的本地存储值
 * @returns 最新的有效开场记录
 */
export function parseConversationOpeningRecords(value: unknown): ConversationOpeningRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isConversationOpeningRecord).slice(-MAX_RECENT_OPENING_COUNT)
}

/**
 * 选择一个优先避开近期记录和指定键的开场灵感
 * @param recentRecords 近期成功开场记录
 * @param excludedKey 本次必须更换的灵感键
 * @returns 随机选中的开场灵感键
 */
export function selectConversationOpeningInspiration(
  recentRecords: ConversationOpeningRecord[],
  excludedKey?: ConversationOpeningInspirationKey
): ConversationOpeningInspirationKey {
  // 近期已经使用过的灵感键
  const recentInspirationKeys = new Set(recentRecords.map((record) => record.inspirationKey))
  // 尚未使用且不与指定键冲突的优先候选
  const unusedCandidates = CONVERSATION_OPENING_INSPIRATION_KEYS.filter(
    (inspirationKey) =>
      !recentInspirationKeys.has(inspirationKey) && inspirationKey !== excludedKey
  )
  // 全部使用后仍确保更换灵感的回退候选
  const fallbackCandidates = CONVERSATION_OPENING_INSPIRATION_KEYS.filter(
    (inspirationKey) => inspirationKey !== excludedKey
  )
  // 本次实际参与随机选择的候选
  const candidates = unusedCandidates.length > 0 ? unusedCandidates : fallbackCandidates
  // 随机候选下标
  const candidateIndex = Math.floor(Math.random() * candidates.length)
  return candidates[candidateIndex]
}

/**
 * 将开场文本整理为可比较的稳定形式
 * @param text 原始英文开场
 * @returns 忽略大小写、标点和连续空白的文本
 */
export function normalizeConversationOpening(text: string): string {
  return text
    .toLocaleLowerCase('en-US')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/**
 * 判断开场是否与近期记录明显重复
 * @param text 待比较的英文开场
 * @param recentRecords 近期成功开场记录
 * @returns 是否命中规范化后的近期文本
 */
export function isRepeatedConversationOpening(
  text: string,
  recentRecords: ConversationOpeningRecord[]
): boolean {
  // 待比较开场的规范化文本
  const normalizedText = normalizeConversationOpening(text)
  return recentRecords.some(
    (record) => normalizeConversationOpening(record.text) === normalizedText
  )
}
