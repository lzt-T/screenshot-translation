import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrompt } from './ai'

/**
 * 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(text: string, apiKey: string) {
  try {
    console.log(`翻译文本 ：${text}`)
    const genAI = new GoogleGenerativeAI(apiKey)
    // 确保使用的模型 ID 正确，例如 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `${getPrompt()}:\n\n${text}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const translation = response.text ? response.text().trim() : '翻译API未返回文本'

    return {
      success: true,
      translation: translation,
      msg: '翻译成功'
    }
  } catch (error) {
    throw error
  }
}
