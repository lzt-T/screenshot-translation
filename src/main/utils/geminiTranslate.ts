import { GoogleGenAI } from '@google/genai';
import { getPrompt } from '../../utils/ai'
import { TargetLanguage } from '../../type/model';

let genAIclients: null | GoogleGenAI = null

/** 设置 Gemini AI 客户端 */
export function setGeminiClient(apiKey: string): void {
  genAIclients = new GoogleGenAI({ apiKey });
}

/** 获取 Gemini AI 客户端 */
function getGenAIClient(apiKey: string): GoogleGenAI {
  if (genAIclients !== null) {
    return genAIclients
  }

  const client = new GoogleGenAI({ apiKey });
  genAIclients = client;
  return client;
}

/**
 * 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(modelName: string, text: string, apiKey: string, targetLanguage: TargetLanguage) {
  try {
    console.log(`${modelName} translateText ：${text}`)
    const genAI = getGenAIClient(apiKey);

    const contents = `${getPrompt(targetLanguage)}:\n\n${text}`
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: contents
    })

    const translation = response.text ? response.text.trim() : 'The translation API did not return the text'

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
