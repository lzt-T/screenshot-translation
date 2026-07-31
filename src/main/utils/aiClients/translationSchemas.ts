import { z } from 'zod'
import { TextType } from '../../../type/base'

/** 句子翻译项 */
export const sentenceTranslationItemSchema = z
  .object({
    // 中文译文
    zh: z.string().nullable().describe('纯简体中文译文，无法生成时为 null'),
    // 英文译文
    en: z.string().nullable().describe('纯英文译文，无法生成时为 null')
  })
  .describe('同一原文的一组中英文翻译')

/** 单词例句项 */
export const exampleSentenceItemSchema = z
  .object({
    // 词性
    partOfSpeech: z.string().nullable().describe('英文单词的词性'),
    // 该词性对应词义
    wordTranslation: z.string().nullable().describe('该词性和语境下的简体中文词义'),
    // 中文例句
    zh: z.string().nullable().describe('体现该词义的中文例句'),
    // 英文例句
    en: z.string().nullable().describe('与中文例句语义一致的英文例句')
  })
  .describe('英文单词的一组词义和双语例句')

/** 文本翻译结构 */
export const textTranslationSchema = z
  .object({
    // 翻译文本
    translation: z.string().describe('翻译后的完整文本')
  })
  .describe('文本翻译结果')

/** 截图块翻译项结构 */
export const screenshotTranslationItemSchema = z
  .object({
    // 文本块 ID
    id: z.string().describe('输入文本块的原始 ID'),
    // 文本块译文
    translation: z.string().describe('该文本块的译文')
  })
  .describe('单个截图文本块的翻译结果')

/** 截图块翻译结构 */
export const screenshotTranslationSchema = z
  .object({
    // 翻译结果项
    items: z.array(screenshotTranslationItemSchema).describe('与输入文本块对应的翻译结果')
  })
  .describe('截图文本块批量翻译结果')

/** 句子英汉互译结构 */
export const sentenceEnglishChineseTranslationSchema = z
  .object({
    // 句子翻译数组
    translation: z
      .array(sentenceTranslationItemSchema)
      .min(1)
      .describe('句子的多组中英文翻译'),
    // 句子不返回单词例句
    exampleSentences: z.null().default(null).describe('句子翻译固定为 null')
  })
  .describe('句子英汉互译结果')

/** 单词英汉互译结构 */
export const wordEnglishChineseTranslationSchema = z
  .object({
    // 单词不返回句子翻译
    translation: z
      .array(sentenceTranslationItemSchema)
      .length(0)
      .default([])
      .describe('单词翻译固定为空数组'),
    // 单词例句数组
    exampleSentences: z
      .array(exampleSentenceItemSchema)
      .min(1)
      .nullable()
      .default(null)
      .describe('单词的常见词义和双语例句；无法生成时为 null')
  })
  .describe('单词英汉互译结果')

export type TextTranslation = z.infer<typeof textTranslationSchema>
export type ScreenshotTranslation = z.infer<typeof screenshotTranslationSchema>
export type EnglishChineseTranslation =
  | z.infer<typeof sentenceEnglishChineseTranslationSchema>
  | z.infer<typeof wordEnglishChineseTranslationSchema>

/** 文本类型对应的英汉互译结构 */
export const englishChineseTranslationSchemaMap: Record<
  TextType,
  z.ZodType<EnglishChineseTranslation>
> = {
  [TextType.WORD]: wordEnglishChineseTranslationSchema,
  [TextType.SENTENCE]: sentenceEnglishChineseTranslationSchema
}
