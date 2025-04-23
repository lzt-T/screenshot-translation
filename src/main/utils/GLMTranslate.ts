import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4'
import { getPrompt } from './ai'

/**
 * 使用智谱 AI (GLM) 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, msg?: string}>} 翻译结果
 */
async function translateText(
  text: string,
  apiKey: string
): Promise<{ success: boolean; translation: string; msg?: string }> {
  try {
    const ai = new ZhipuAI({ apiKey: apiKey })

    const systemInstruction =getPrompt()
    const userContent = text

    const messages = [
      { role: 'system' as const, content: systemInstruction },
      { role: 'user' as const, content: userContent }
    ]

    const result = await ai.createCompletions({
      model: 'glm-4-flash-250414',
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
        console.log('[GLMTranslate] GLM 翻译响应结构不完整:', result) // Use console.log
      }
    } else {
      console.log('[GLMTranslate] GLM 翻译响应格式不符合预期 (非对象或无choices):', result) // Use console.log
    }

    console.log(`[GLMTranslate] 翻译结果 (GLM): ${translation}`) // Use console.log

    if (!translation) {
      throw new Error('翻译失败: GLM 返回空结果')
    }
    return {
      success: true,
      translation: translation,
      msg: '翻译成功'
    }
  } catch (error) {
    throw error
  }
}

// 导出函数
export { translateText }
