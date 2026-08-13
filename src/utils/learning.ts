import { Language, TextType, type LearningAnalysis, type TranslateResponse } from '../type/base'
import type { SaveLearningItemInput } from '../type/learning'

/** 主译文提取策略 */
const PRIMARY_ANALYSIS_TRANSLATION_RESOLVERS: Record<Language, (result: TranslateResponse) => string> = {
  [Language.ZH]: (result) => result.translation.find((item) => item.en?.trim())?.en?.trim() || '',
  [Language.EN]: (result) => result.translation.find((item) => item.zh?.trim())?.zh?.trim() || '',
  [Language.ZH_AND_EN]: () => ''
}

/**
 * 判断翻译结果是否支持句子学习分析
 * @param result 完整翻译结果
 * @returns 是否支持句子学习分析
 */
export function canAnalyzeSentenceLearning(result: TranslateResponse | null): boolean {
  return Boolean(
    result && result.textType === TextType.SENTENCE && result.sourceLanguage !== Language.ZH_AND_EN
  )
}

/**
 * 获取句子学习分析使用的首条主译文
 * @param result 完整翻译结果
 * @returns 首条可用主译文
 */
export function getPrimaryAnalysisTranslation(result: TranslateResponse): string {
  return PRIMARY_ANALYSIS_TRANSLATION_RESOLVERS[result.sourceLanguage](result)
}

/**
 * 提取翻译结果中的目标语言文本
 * @param result 完整翻译结果
 * @returns 用于收藏的译文
 */
export function getTranslatedText(result: TranslateResponse): string {
  if (result.textType === TextType.WORD) {
    // 去重后的单词释义
    const wordMeanings = [
      ...new Set(
        (result.exampleSentences || [])
          .map((item) => item.wordTranslation?.trim())
          .filter((meaning): meaning is string => Boolean(meaning))
      )
    ]
    return wordMeanings.join('；')
  }

  // 句子翻译文本列表
  const translatedSentences = result.translation
    .map((item) => {
      if (result.sourceLanguage === Language.ZH_AND_EN) {
        return [item.en, item.zh].filter(Boolean).join(' / ')
      }
      return result.targetLanguage === Language.ZH ? item.zh : item.en
    })
    .filter((text): text is string => Boolean(text?.trim()))
  return translatedSentences.join('\n')
}

/**
 * 将文本翻译结果转换为收藏参数
 * @param result 完整翻译结果
 * @param sentenceAnalysis 可选句子学习分析
 * @returns 文本学习收藏参数
 */
export function createTextLearningItemInput(
  result: TranslateResponse,
  sentenceAnalysis: LearningAnalysis | null
): SaveLearningItemInput {
  return {
    kind: result.textType === TextType.WORD ? 'word' : 'sentence',
    source: 'text',
    originalText: result.sourceWords,
    translatedText: getTranslatedText(result),
    translationResult: result,
    sentenceAnalysis
  }
}
