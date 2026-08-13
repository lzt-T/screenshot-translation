import { ipcMain } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { aiManage } from "../utils/aiManage"
import { getErrorMessage } from "../utils/error"
import {
  ExampleSentence,
  Language,
  SentenceAnalysisRequest,
  TextType,
  TranslateResponse
} from "../../type/base"
import { getTextType, getLanguageType, getTargetLanguage } from "../../utils/ai"
import lemmatize from 'wink-lemmatizer'

// 英文单词提取规则
const ENGLISH_WORD_PATTERN = /[a-z]+/gi

// 词形还原策略列表
const WORD_FORM_RESOLVERS = [lemmatize.noun, lemmatize.verb, lemmatize.adjective]

/**
 * 获取英文单词可用的原形
 * @param {string} word 英文单词
 * @returns {Set<string>} 单词原形集合
 */
const getWordForms = (word: string): Set<string> => {
  // 小写单词
  const normalizedWord = word.toLowerCase()
  // 单词原形集合
  const wordForms = new Set<string>([normalizedWord])

  WORD_FORM_RESOLVERS.forEach((resolveWordForm) => {
    wordForms.add(resolveWordForm(normalizedWord))
  })

  return wordForms
}

/**
 * 判断英文例句是否包含查询词的词形
 * @param {string | null} sentence 英文例句
 * @param {string} queriedWord 查询词
 * @returns {boolean} 是否包含查询词词形
 */
const hasQueriedWordForm = (sentence: string | null, queriedWord: string): boolean => {
  if (!sentence) {
    return false
  }

  // 查询词原形
  const queriedWordForms = getWordForms(queriedWord)
  // 例句中的英文单词
  const sentenceWords = sentence.match(ENGLISH_WORD_PATTERN) || []

  return sentenceWords.some((sentenceWord) => {
    // 当前例句单词原形
    const sentenceWordForms = getWordForms(sentenceWord)
    return [...sentenceWordForms].some((wordForm) => queriedWordForms.has(wordForm))
  })
}

/**
 * 过滤不包含查询词词形的例句
 * @param {ExampleSentence[] | null} exampleSentences 模型返回的例句
 * @param {string} queriedWord 查询词
 * @returns {ExampleSentence[]} 有效例句
 */
const filterExampleSentences = (
  exampleSentences: ExampleSentence[] | null,
  queriedWord: string
): ExampleSentence[] => {
  return (exampleSentences || []).filter((exampleSentence) =>
    hasQueriedWordForm(exampleSentence.en, queriedWord)
  )
}

/**
 * 执行英汉互译并组装统一结果
 * @param {string} text 待翻译文本
 * @returns {Promise<TranslateResponse>} 翻译结果
 */
const translateEnglishChineseText = async (text: string): Promise<TranslateResponse> => {
  // 返回给渲染进程的翻译结果
  const resultData: TranslateResponse = {
    textType: getTextType(text),
    sourceLanguage: getLanguageType(text),
    targetLanguage: getTargetLanguage(text),
    sourceWords: text,
    translation: [],
    exampleSentences: null
  }
  // 结构化模型调用结果
  const translateResult = await aiManage.englishChineseTranslation(text)
  if (!translateResult.success || !translateResult.data) {
    throw new Error(translateResult.msg || '英汉互译失败')
  }

  // 结构化英汉翻译数据
  const data = translateResult.data

  if (resultData.textType === TextType.SENTENCE) {
    if ([Language.ZH_AND_EN, Language.EN].includes(resultData.targetLanguage)) {
      // 已出现的英文译文
      const translatedEnglishTexts: string[] = []
      data.translation = data.translation.map(
        (item: { en: string | null; zh: string | null }) => {
          if (item.en && !translatedEnglishTexts.includes(item.en)) {
            translatedEnglishTexts.push(item.en)
            return item
          }
          return { en: null, zh: null }
        }
      )

      data.translation = data.translation.filter(
        (item: { en: string | null; zh: string | null }) => item.en !== null
      )
    }
  }

  resultData.exampleSentences =
    resultData.textType === TextType.WORD
      ? filterExampleSentences(data.exampleSentences, text)
      : data.exampleSentences || []
  resultData.translation = data.translation || []

  return resultData
}

/** 注册翻译 IPC 事件 */
export const registerTranslationIpcEvents = () => {

  /** 英汉互译 */
  ipcMain.on(SendEnum.ENGLISH_CHINESE_TRANSLATION, async (event, text) => {
    try {
      // 英汉互译结果
      const resultData = await translateEnglishChineseText(text)
      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, resultData)
    } catch (error) {
      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, getErrorMessage(error))
    }
  })

  /** 划词翻译 */
  ipcMain.handle(SendEnum.SELECTION_TRANSLATION, async (_event, text: string) => {
    try {
      return await translateEnglishChineseText(text)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  })

  /** 句子学习分析 */
  ipcMain.handle(
    SendEnum.SENTENCE_ANALYSIS,
    async (_event, request: SentenceAnalysisRequest) => {
      try {
        // 当前实际原文语言
        const sourceLanguage = getLanguageType(request.sourceText)
        if (
          sourceLanguage !== request.sourceLanguage ||
          ![Language.EN, Language.ZH].includes(sourceLanguage) ||
          getTextType(request.sourceText) !== TextType.SENTENCE
        ) {
          throw new Error('仅支持分析中文或英文句子')
        }

        // 结构化分析调用结果
        const analysisResult = await aiManage.analyzeSentenceLearning(
          request.sourceLanguage,
          request.sourceText,
          request.translatedText
        )
        if (!analysisResult.success || !analysisResult.data) {
          throw new Error(analysisResult.msg || '句子学习分析失败')
        }

        return analysisResult.data
      } catch (error) {
        throw new Error(getErrorMessage(error))
      }
    }
  )

}
