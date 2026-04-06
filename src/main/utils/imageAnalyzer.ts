import { TextBlock, extractTextFromImage } from './imageOCR'
import { Language } from '../../type/base'
import { aiManage } from './aiManage'
import { parseJson } from '../../utils/ai'

// 截图块翻译结果项
interface ScreenshotTranslatedItem {
  id: string
  translation: string
}

// 截图块翻译结果
interface ScreenshotTranslatedResponse {
  items: ScreenshotTranslatedItem[]
}

export interface TranslateTextBlock extends TextBlock {
  id: string
  translation: string
  warning?: string
}

/**
 * 检查是否是合法翻译结果
 * @param {unknown} response 未知结构响应
 * @returns {response is ScreenshotTranslatedResponse} 是否合法
 */
function isValidScreenshotTranslatedResponse(
  response: unknown
): response is ScreenshotTranslatedResponse {
  if (!response || typeof response !== 'object') {
    return false
  }

  // 响应中的 items
  const responseItems = (response as ScreenshotTranslatedResponse).items
  if (!Array.isArray(responseItems)) {
    return false
  }

  return responseItems.every((item) => {
    return (
      item &&
      typeof item.id === 'string' &&
      typeof item.translation === 'string'
    )
  })
}

/**
 * 分析截图，提取文字并翻译
 * @param {string} imageDataUrl 图像的 base64 数据 URL
 * @param {Language} targetLanguage 目标语言
 * @returns {Promise<{success: boolean, textBlocks: TranslateTextBlock[], msg?: string}>} 分析结果
 */
export async function analyzeScreenshot(imageDataUrl: string, targetLanguage: Language) {
  try {
    // 1. 提取文字和位置
    const { success, textBlocks, msg } = await extractTextFromImage(imageDataUrl)

    if (!success) {
      return { success: false, textBlocks: [], msg }
    }

    if (!textBlocks || textBlocks.length === 0) {
      return { success: false, textBlocks: [], msg: '没有提取到文字' }
    }

    // 2. 构建带稳定 id 的文本块
    const normalizedBlocks = textBlocks
      .map((block, index) => ({
        id: `block-${index + 1}`,
        ...block,
        text: block.text?.trim() || ''
      }))
      .filter((block) => block.text.length > 0)

    if (normalizedBlocks.length === 0) {
      return { success: false, textBlocks: [], msg: '没有提取到有效文字' }
    }

    // 3. 构建批量翻译输入
    const promptItems = normalizedBlocks.map((block) => ({
      id: block.id,
      text: block.text
    }))

    console.log(`prepare to translate ${promptItems.length} valid text blocks...`)

    // 4. 批量结构化翻译
    const translateResult = await aiManage.translateScreenshotBlocks(promptItems, targetLanguage)
    if (!translateResult.success) {
      return { success: false, textBlocks: [], msg: translateResult.msg }
    }

    // 5. 解析模型返回 JSON
    const parsed = parseJson(translateResult.translation)
    if (!isValidScreenshotTranslatedResponse(parsed)) {
      return { success: false, textBlocks: [], msg: '截图翻译结果解析失败' }
    }

    // 6. 构建 id 到译文映射
    const translationMap = new Map(
      parsed.items.map((item) => [item.id, item.translation.trim()])
    )

    // 7. 回填并对缺项兜底
    const finalBlocks: TranslateTextBlock[] = normalizedBlocks.map((block) => {
      // 当前块翻译文本
      const translatedText = translationMap.get(block.id) || ''
      // 是否缺失或空翻译
      const shouldFallback = !translatedText

      if (shouldFallback) {
        return {
          ...block,
          translation: block.text,
          warning: 'translation-fallback'
        }
      }

      return {
        ...block,
        translation: translatedText
      }
    })

    return { success: true, textBlocks: finalBlocks, msg: 'analyze and translate success' }
  } catch (error) {
    throw error
  }
}
