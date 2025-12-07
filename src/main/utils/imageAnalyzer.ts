import { TextBlock } from './imageOCR'
import { extractTextFromImage } from './imageOCR'
import { Language } from '../../type/base'
import { aiManage } from './aiManage'

export interface TranslateTextBlock extends TextBlock {
  translation: string
}

/**
 * 分析截图，提取文字并翻译
 * @param {string} imageDataUrl 图像的base64数据URL
 * @param {Language} targetLanguage 目标语言
 * @returns {Promise<{success: boolean, textBlocks: TranslateTextBlock[], msg?: string}>} 分析和翻译结果，包含文本位置信息
 */
export async function analyzeScreenshot(imageDataUrl: string, targetLanguage: Language) {
  try {
    // 1. 提取文字和位置
    const { success, textBlocks, msg } = await extractTextFromImage(imageDataUrl)

    if (!success) {
      return { success: false, textBlocks: [], msg: msg }
    }

    if (!textBlocks || textBlocks.length === 0) {
      return { success: false, textBlocks: [], msg: "没有提取到文字" }
    }

    // 2. 合并所有有效文本块进行单次翻译
    console.log(`prepare to translate ${textBlocks.length} valid text blocks...`)
    const separator = '|'
    const combinedText = textBlocks.map((block) => block.text.trim()).join(separator)

    let combinedTranslation = ''
    const translateResult = await aiManage.translateText(combinedText, targetLanguage)
    console.log(`translate result: ${translateResult.translation}`)

    if (!translateResult.success) {
      return { success: false, textBlocks: [], msg: translateResult.msg }
    }

    combinedTranslation = translateResult.translation

    // 6. 尝试拆分翻译结果并映射回原块
    let translatedSegments = combinedTranslation.split(separator)

    // 去除空字符串
    translatedSegments = translatedSegments
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '')

    console.log(`split into ${translatedSegments.length} translation segments.`)

    const finalBlocks: TranslateTextBlock[] = []

    for (let i = 0; i < Math.min(translatedSegments.length, textBlocks.length); i++) {
      finalBlocks.push({
        ...textBlocks[i],
        translation: translatedSegments[i].trim()
      })
    }
    return { success: true, textBlocks: finalBlocks, msg: 'analyze and translate success' }
  } catch (error: any) {
    throw error
  }
}
