import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4'
import { getPrompt } from '../../utils/ai'
import { TargetLanguage } from '../../type/model'
/**
 * 使用智谱 AI (GLM) 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, msg?: string}>} 翻译结果
 */
async function translateText(
  modelName: string,
  text: string,
  apiKey: string,
  targetLanguage: TargetLanguage
): Promise<{ success: boolean; translation: string; msg?: string }> {
  try {
    const ai = new ZhipuAI({ apiKey: apiKey })
    console.log(`${modelName} translateText ：${text}`)

    const systemInstruction = getPrompt(targetLanguage)
    const userContent = text

    const messages = [
      { role: 'system' as const, content: systemInstruction },
      { role: 'user' as const, content: userContent }
    ]

    const result = await ai.createCompletions({
      model: modelName,
      messages: messages,
      stream: false
    })

    let translation = ''
    // Type guard to check if result has the expected structure for non-streaming response
    if (
      result &&
      typeof result === 'object' &&
      'choices' in result &&
      Array.isArray(result.choices) &&
      result.choices.length > 0
    ) {
      // Accessing properties after the type guard
      const choice = result.choices[0]
      if (
        choice &&
        typeof choice === 'object' &&
        'message' in choice &&
        choice.message &&
        typeof choice.message === 'object' &&
        'content' in choice.message &&
        typeof choice.message.content === 'string'
      ) {
        translation = choice.message.content.trim()
      } else {
        console.log('[GLMTranslate] GLM translateText response structure is incomplete:', result) // Use console.log
      }
    } else {
      console.log('[GLMTranslate] GLM translateText response format is not expected (not an object or no choices):', result) // Use console.log
    }

    console.log(`[GLMTranslate] translateText result (GLM): ${translation}`) // Use console.log

    if (!translation) {
      throw new Error('translateText fail: GLM return empty result')
    }
    return {
      success: true,
      translation: translation,
      msg: 'translateText success'
    }
  } catch (error) {
    throw error
  }
}

// 导出函数
export { translateText }
