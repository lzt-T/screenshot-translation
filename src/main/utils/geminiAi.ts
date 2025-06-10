//在主线程中使用
import { GoogleGenAI } from '@google/genai';
import { getEnglishChineseTranslationPrompt, getTranslatePrompt } from '../../utils/ai'
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


/** @description 基本使用
 * @param {string} modelName 模型名称
 * @param {string} apiKey API密钥
 * @param {string} contents 内容
 * @returns {Promise<string>} 回答
*/
export const geminiChat = async (modelName: string, apiKey: string, contents: string) => {
  try {
    const genAI = getGenAIClient(apiKey);

    const response = await genAI.models.generateContent({
      model: modelName,
      contents
    })

    const answer = response.text ? response.text.trim() : ''

    return answer
  } catch (error) {
    throw error
  }
}

/**
 * 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(modelName: string, text: string, apiKey: string, targetLanguage: TargetLanguage) {
  try {
    const contents = `${getTranslatePrompt(text, targetLanguage)}`
    const answer = await geminiChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'translateText success'
    }
  } catch (error) {
    console.error(`${modelName} translateText fail:${error}`)
    throw error
  }
}

/**英汉互译 */
export const EnglishChineseTranslation = async (modelName: string, apiKey: string, text: string) => {
  try {
    const contents = `${getEnglishChineseTranslationPrompt(text)}`
    const answer = await geminiChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'EnglishChineseTranslation success'
    };
  } catch (error) {
    throw error
  }
}