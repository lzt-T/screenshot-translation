import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPrompt } from '../../utils/ai'

/**
 * 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(modelName: string, text: string, apiKey: string) {
  try {
    console.log(`${modelName} translateText ：${text}`)
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({ model: modelName })

    const prompt = `${getPrompt()}:\n\n${text}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const translation = response.text ? response.text().trim() : 'The translation API did not return the text'

    return {
      success: true,
      translation: translation,
      msg: 'translateText success'
    }
  } catch (error) {
    console.error(`${modelName} translateText fail:${error}`)
    throw error
  }
}
