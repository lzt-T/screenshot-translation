import type { LearningAnalysis, TranslateResponse } from './base'

/** 学习内容类型 */
export type LearningItemKind = 'word' | 'sentence'

/** 学习内容来源 */
export type LearningItemSource = 'text' | 'screenshot'

/** 学习收藏唯一身份信息 */
export interface LearningItemIdentity {
  /* 学习内容类型 */
  kind: LearningItemKind
  /* 学习内容来源 */
  source: LearningItemSource
  /* 原始文本 */
  originalText: string
  /* 翻译文本 */
  translatedText: string
}

/** 保存学习收藏参数 */
export interface SaveLearningItemInput extends LearningItemIdentity {
  /* 完整翻译结果 */
  translationResult?: TranslateResponse | null
  /* 可选句子学习分析 */
  sentenceAnalysis?: LearningAnalysis | null
}

/** 学习收藏记录 */
export interface LearningItem extends LearningItemIdentity {
  /* 收藏记录 ID */
  id: string
  /* 完整翻译结果 */
  translationResult: TranslateResponse | null
  /* 句子学习分析 */
  sentenceAnalysis: LearningAnalysis | null
  /* 首次收藏时间 */
  createdAt: number
  /* 最近更新时间 */
  updatedAt: number
}

/** 学习收藏查询参数 */
export interface LearningItemQuery {
  /* 原文或译文搜索词 */
  query?: string
  /* 内容类型筛选 */
  kind?: LearningItemKind
}

/** 学习收藏列表数据 */
export interface LearningItemListData {
  /* 符合当前筛选的收藏 */
  items: LearningItem[]
  /* 全部收藏数量 */
  total: number
}

/** 学习收藏操作成功响应 */
export interface LearningSuccessResponse<TData> {
  /* 操作是否成功 */
  success: true
  /* 操作结果 */
  data: TData
}

/** 学习收藏操作失败响应 */
export interface LearningFailureResponse {
  /* 操作是否成功 */
  success: false
  /* 可展示的失败信息 */
  message: string
}

/** 学习收藏统一响应 */
export type LearningResponse<TData> = LearningSuccessResponse<TData> | LearningFailureResponse
