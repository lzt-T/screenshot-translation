//在主线程中调用
import { getEnglishChineseTranslationPrompt, getTranslatePrompt } from '../../../utils/ai'
import { DeepSeekModel, TargetLanguage } from '../../../type/model';
import OpenAI from "openai";

let openaiClients: null | OpenAI = null

/** 设置 DeepSeek 客户端 */
export function setDeepSeekClient(apiKey: string): void {
  openaiClients = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey
  });
}

function getOpenAIClient(apiKey: string): OpenAI {
  if (openaiClients !== null) {
    return openaiClients
  }

  const client = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey
  });
  openaiClients = client;
  return client;
}

/**
 * @description 基本使用
 * @param {string} modelName 模型名称
 * @param {string} apiKey API密钥
 * @param {string} contents 内容
 * @returns {Promise<string>} 回答
*/
export const deepseekChat = async (modelName: string, apiKey: string, contents: string) => {
  try {
    const modelApiNameMap: Record<DeepSeekModel, string> = {
      [DeepSeekModel.DEEP_SEEK_V3]: 'deepseek-chat'
    };
    const apiModelName = modelApiNameMap[modelName];
    const openai = getOpenAIClient(apiKey);
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: contents }],
      model: apiModelName,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || '';
    return answer
  } catch (error) {
    console.error(`[DeepSeek] ${modelName} translateText fail:`, error);
    throw error;
  }
}

/**
 * 翻译文本内容
 * @param {DeepSeekModel} modelName DeepSeek 模型名称
 * @param {string} text 需要翻译的文本
 * @param {string} apiKey API 密钥
 * @param {TargetLanguage} targetLanguage 目标语言
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(modelName: string, text: string, apiKey: string, targetLanguage: TargetLanguage) {
  try {
    const contents = `${getTranslatePrompt(text, targetLanguage)}`
    const answer = await deepseekChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'translateText success'
    };
  } catch (error) {
    console.error(`[DeepSeek] ${modelName} translateText fail:`, error);
    throw error;
  }
}

/**英汉互译 */
export const EnglishChineseTranslation = async (modelName: string, apiKey: string, text: string) => {
  try {
    const contents = `${getEnglishChineseTranslationPrompt(text)}`
    const answer = await deepseekChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'EnglishChineseTranslation success'
    };
  } catch (error) {
    throw error
  }
}

