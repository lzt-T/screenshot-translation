import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'
import { TranslationModelProfile } from '../../../type/model'

/** 统一 LLM 调用结果 */
export interface LlmInvokeResult {
  /* 调用是否成功 */
  success: boolean;
  /* 输出文本 */
  text: string;
  /* 结果提示 */
  msg?: string;
}

/**
 * 提取 LangChain 返回消息中的文本内容
 * @param {unknown} content LangChain 消息内容
 * @returns {string} 提取后的纯文本
 */
const extractTextFromContent = (content: unknown): string => {
  // 字符串内容
  if (typeof content === 'string') {
    return content.trim()
  }

  // 数组内容
  if (Array.isArray(content)) {
    // 拼接后的文本片段
    const text = content
      .map((item) => {
        // 数组项文本
        const itemText = (item as { text?: string })?.text
        return typeof itemText === 'string' ? itemText : ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
    return text
  }

  return ''
}

/**
 * 是否是 Gemini 模型
 * @param {string} modelName 模型名称
 * @returns {boolean} 是否是 Gemini 模型
 */
const isGeminiModel = (modelName: string): boolean => {
  return modelName.toLowerCase().startsWith('gemini-')
}

/**
 * LangChain 统一网关
 */
class LangchainGateway {
  /**
   * 统一调用不同供应商模型
   * @param {TranslationModelProfile} profile 模型配置
   * @param {string} prompt 输入提示词
   * @returns {Promise<LlmInvokeResult>} 调用结果
   */
  public async invoke(profile: TranslationModelProfile, prompt: string): Promise<LlmInvokeResult> {
    try {
      if (isGeminiModel(profile.model)) {
        // Gemini 客户端
        const geminiClient = new ChatGoogleGenerativeAI({
          apiKey: profile.apiKey,
          model: profile.model
        })
        // Gemini 响应
        const geminiResponse = await geminiClient.invoke(prompt)
        // Gemini 文本内容
        const geminiText = extractTextFromContent(geminiResponse.content)
        return {
          success: true,
          text: geminiText,
          msg: 'langchain invoke success'
        }
      }

      // OpenAI 兼容模型名
      const openAiModelName = profile.model
      // OpenAI 兼容 Base URL
      const openAiBaseUrl = profile.baseUrl || 'https://api.openai.com/v1'
      // OpenAI 兼容客户端
      const openAiClient = new ChatOpenAI({
        apiKey: profile.apiKey,
        model: openAiModelName,
        configuration: { baseURL: openAiBaseUrl }
      })
      // OpenAI 兼容响应
      const openAiResponse = await openAiClient.invoke(prompt)
      // OpenAI 兼容文本内容
      const openAiText = extractTextFromContent(openAiResponse.content)

      return {
        success: true,
        text: openAiText,
        msg: 'langchain invoke success'
      }
    } catch (error) {
      throw error
    }
  }
}

export const langchainGateway = new LangchainGateway()
