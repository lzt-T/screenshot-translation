import { z } from 'zod'

/** 句子翻译项 */
export const sentenceTranslationItemSchema = z.object({
  // 中文译文
  zh: z.string().nullable(),
  // 英文译文
  en: z.string().nullable()
})

/** 单词例句项 */
export const exampleSentenceItemSchema = z.object({
  // 词性
  partOfSpeech: z.string().nullable(),
  // 该词性对应词义
  wordTranslation: z.string().nullable(),
  // 中文例句
  zh: z.string().nullable(),
  // 英文例句
  en: z.string().nullable()
})

/** 文本翻译结构 */
export const textTranslationSchema = z.object({
  // 翻译文本
  translation: z.string()
})

/** 截图块翻译项结构 */
export const screenshotTranslationItemSchema = z.object({
  // 文本块 ID
  id: z.string(),
  // 文本块译文
  translation: z.string()
})

/** 截图块翻译结构 */
export const screenshotTranslationSchema = z.object({
  // 翻译结果项
  items: z.array(screenshotTranslationItemSchema)
})

/** 英汉互译结构 */
export const englishChineseTranslationSchema = z.object({
  // 句子翻译数组
  translation: z.array(sentenceTranslationItemSchema).default([]),
  // 单词例句数组
  exampleSentences: z.array(exampleSentenceItemSchema).nullable().default(null)
})

export type TextTranslation = z.infer<typeof textTranslationSchema>
export type ScreenshotTranslation = z.infer<typeof screenshotTranslationSchema>
export type EnglishChineseTranslation = z.infer<typeof englishChineseTranslationSchema>
