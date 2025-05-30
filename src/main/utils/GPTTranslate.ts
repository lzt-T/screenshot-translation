import { getPrompt } from '../../utils/ai'
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
 * 翻译文本内容
 * @param {string} text 需要翻译的文本
 * @returns {Promise<{success: boolean, translation: string, error?: string}>} 翻译结果
 */
export async function translateText(modelName: string, text: string, apiKey: string, targetLanguage: TargetLanguage) {
  try {
    console.log(`${modelName} translateText ：${text}`)

    const contents = `${getPrompt(targetLanguage)}:\n\n${text}`

    const client = getOpenAIClient(apiKey);
    const response = await client.responses.create({
      model: modelName,
      input: contents,
    });

    const translation = response.output_text ? response.output_text.trim() : 'The translation API did not return the text'

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
