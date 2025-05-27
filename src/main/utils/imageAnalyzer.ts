import { TextBlock } from './imageOCR'
import { translateText as translateTextGemini } from './geminiTranslate'
import { translateText as translateTextGLM } from './GLMTranslate'
import { extractTextFromImage } from './imageOCR'
import { Model, ModelName, TargetLanguage } from '../../type/model'
import { getModelType } from '../../utils/ai'

export interface TranslateTextBlock extends TextBlock {
  translation: string
}

/**
 * 分析截图，提取文字并翻译
 * @param {string} imageDataUrl 图像的base64数据URL
 * @param {ModelName} modelName 选择的翻译模型名称
 * @returns {Promise<{success: boolean, textBlocks: TranslateTextBlock[], msg?: string}>} 分析和翻译结果，包含文本位置信息
 */
export async function analyzeScreenshot(imageDataUrl, modelName: ModelName, apiKey: string, targetLanguage: TargetLanguage) {
  try {
    // 1. 提取文字和位置
    const { success, textBlocks, msg } = await extractTextFromImage(imageDataUrl)

    if (!success) {
      return { success: false, textBlocks: [], msg: msg }
    }

    if (!textBlocks || textBlocks.length === 0) {
      return { success: false, textBlocks: [], msg: msg }
    }

    // 2. 合并所有有效文本块进行单次翻译
    console.log(`prepare to translate ${textBlocks.length} valid text blocks...`)
    const separator = '\n<translate_separator>\n'
    const combinedText = textBlocks.map((block) => block.text.trim()).join(separator)

    let combinedTranslation = ''

    const translateConfig = {
      [Model.GLM]: translateTextGLM,
      [Model.GEMINI]: translateTextGemini
    }

    const translateFunction = translateConfig[getModelType(modelName)]
    const translateResult = await translateFunction(modelName, combinedText, apiKey, targetLanguage)
    console.log(`translate result: ${translateResult.translation}`)

    if (!translateResult.success) {
      return { success: false, textBlocks: [], msg: translateResult.msg }
    }

    combinedTranslation = translateResult.translation

    // 6. 尝试拆分翻译结果并映射回原块
    let translatedSegments = combinedTranslation.split(
      /(?:\n\s*|\s*)<translate_separator>(?:\s*\n|\s*)/
    )

    // 去除空字符串
    translatedSegments = translatedSegments
      .map((segment) => segment.trim())
      .filter((segment) => segment !== '')

    console.log(`split into ${translatedSegments.length} translation segments.`)

    const finalBlocks: TranslateTextBlock[] = []
    if (translatedSegments.length === textBlocks.length) {
      console.log('translation segments number matches the original block number, start mapping...')
      for (let i = 0; i < textBlocks.length; i++) {
        finalBlocks.push({
          ...textBlocks[i],
          translation: translatedSegments[i].trim()
        })
      }
    } else {
      throw new Error('翻译结果段落数与原始块数不匹配')
    }
    return { success: true, textBlocks: finalBlocks, msg: 'analyze and translate success' }
  } catch (error: any) {
    throw error
  }
}
