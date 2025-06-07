//只能在主线程中使用
import { ZhipuAI } from 'zhipuai-sdk-nodejs-v4'
import { getEnglishChineseTranslationPrompt, getTranslatePrompt } from '../../utils/ai'
import { TargetLanguage } from '../../type/model'

let zhipuClients: null | ZhipuAI = null

/** 设置智谱 AI (GLM) 客户端 */
function setZhipuClient(apiKey: string): void {
  zhipuClients = new ZhipuAI({ apiKey });
}

/** 获取智谱 AI (GLM) 客户端 */
function getZhipuClient(apiKey: string): ZhipuAI {
  if (zhipuClients !== null) {
    return zhipuClients
  }

  const client = new ZhipuAI({ apiKey });
  zhipuClients = client;
  return client;
}

/** 
 * @description 基本使用
 * @param {string} modelName 模型名称
 * @param {string} apiKey API密钥
 * @param {string} contents 内容
 * @returns {Promise<string>} 回答
*/
const glmChat = async (modelName: string, apiKey: string, contents: string) => {
  try {
    const ai = getZhipuClient(apiKey);

    const result = await ai.createCompletions({
      model: modelName,
      messages: [{ role: 'user', content: contents }],
      stream: false
    })

    const answer = (result as any).choices?.[0]?.message?.content?.trim() || '';
    return answer
  } catch (error) {
    throw error
  }
}


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

    const contents = `${getTranslatePrompt(targetLanguage)}:\n\n${text}`
    const answer = await glmChat(modelName, apiKey, contents)

    return {
      success: true,
      translation: answer,
      msg: 'translateText success'
    }
  } catch (error) {
    throw error
  }
}

/**英汉互译 */
export const EnglishChineseTranslation = async (modelName: string, apiKey: string, text: string) => {
  try {
    const contents = `"${text}"${getEnglishChineseTranslationPrompt()}`
    const answer = await glmChat(modelName, apiKey, contents)
    return {
      success: true,
      translation: answer,
      msg: 'EnglishChineseTranslation success'
    };
  } catch (error) {
    throw error
  }
}


// 导出函数
export { translateText, setZhipuClient, getZhipuClient,glmChat }
