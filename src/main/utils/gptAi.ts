//在主线程中使用
import { getEnglishChineseTranslationPrompt, getTranslatePrompt } from '../../utils/ai'
import { TargetLanguage } from '../../type/model';
import OpenAI from "openai";


let openaiClients: null | OpenAI = null

/** 设置 OpenAI 客户端 */
export function setOpenaiClient(apiKey: string): void {
  openaiClients = new OpenAI({
    apiKey: apiKey
  });
}


function getOpenAIClient(apiKey: string): OpenAI {
  if (openaiClients !== null) {
    return openaiClients
  }

  const client = new OpenAI({
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
const gptChat = async (modelName: string, apiKey: string, contents: string) => {
  try{
    const client = getOpenAIClient(apiKey);
    const response = await client.responses.create({
      model: modelName,
      input: contents,
    });

    const answer = response.output_text ? response.output_text.trim() : ''
    return answer
  }catch(error){
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
    console.log(`${modelName} translateText ：${text}`)

    const contents = `${getTranslatePrompt(targetLanguage)}:\n\n${text}`

    const answer = await gptChat(modelName, apiKey, contents)

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
    const contents = `${getEnglishChineseTranslationPrompt()}:\n\n${text}`
    const answer = await gptChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'EnglishChineseTranslation success'
    }
  } catch (error) {
    throw error
  }
}