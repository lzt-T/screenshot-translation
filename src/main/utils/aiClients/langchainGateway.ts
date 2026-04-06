import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'
import { ZodType } from 'zod'
import { parseJson } from '../../../utils/ai'
import { TranslationModelProfile } from '../../../type/model'

/** 统一 LLM 调用结果 */
export interface LlmInvokeResult {
  /* 调用是否成功 */
  success: boolean
  /* 输出文本 */
  text: string
  /* 结果提示 */
  msg?: string
}

/** 统一结构化调用结果 */
export interface LlmStructuredInvokeResult<TData> {
  /* 调用是否成功 */
  success: boolean
  /* 结构化输出数据 */
  data: TData
  /* 结果提示 */
  msg?: string
}

/** 可执行 LangChain 调用的客户端 */
interface LangchainRunnableClient {
  invoke: (input: string) => Promise<{ content: unknown }>
  withStructuredOutput?: (schema: unknown) => { invoke: (input: string) => Promise<unknown> }
}

/** 结构化输出策略 */
type StructuredInvokeStrategy = 'nativeStructured' | 'textParseStructured'

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
 * 选择结构化输出策略
 * @param {TranslationModelProfile} profile 模型配置
 * @returns {StructuredInvokeStrategy} 结构化输出策略
 */
const getStructuredInvokeStrategy = (
  profile: TranslationModelProfile
): StructuredInvokeStrategy => {
  // Gemini 兼容性策略：禁用原生 response_schema
  if (isGeminiModel(profile.model)) {
    return 'textParseStructured'
  }

  return 'nativeStructured'
}

/**
 * 判断是否是结构化解析错误
 * @param {unknown} error 错误对象
 * @returns {boolean} 是否是解析错误
 */
const isStructuredParseError = (error: unknown): boolean => {
  // 错误消息
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
  if (!errorMessage) {
    return false
  }

  return ['parse', 'json', 'schema', 'zod', 'structured'].some((keyword) => {
    return errorMessage.includes(keyword)
  })
}

/**
 * LangChain 统一网关
 */
class LangchainGateway {
  /**
   * 创建模型客户端
   * @param {TranslationModelProfile} profile 模型配置
   * @returns {LangchainRunnableClient} LangChain 客户端
   */
  private createClient(profile: TranslationModelProfile): LangchainRunnableClient {
    if (isGeminiModel(profile.model)) {
      return new ChatGoogleGenerativeAI({
        apiKey: profile.apiKey,
        model: profile.model
      }) as unknown as LangchainRunnableClient
    }

    // OpenAI 兼容 Base URL
    const openAiBaseUrl = profile.baseUrl || 'https://api.openai.com/v1'
    return new ChatOpenAI({
      apiKey: profile.apiKey,
      model: profile.model,
      configuration: { baseURL: openAiBaseUrl }
    }) as unknown as LangchainRunnableClient
  }

  /**
   * 调用结构化输出并解析
   * @template TData 结构化输出类型
   * @param {LangchainRunnableClient} client LangChain 客户端
   * @param {string} prompt 输入提示词
   * @param {ZodType<TData>} schema Zod 结构定义
   * @returns {Promise<TData>} 结构化输出数据
   */
  private async invokeWithSchema<TData>(
    client: LangchainRunnableClient,
    prompt: string,
    schema: ZodType<TData>,
    strategy: StructuredInvokeStrategy
  ): Promise<TData> {
    // 原生结构化输出策略
    if (strategy === 'nativeStructured' && typeof client.withStructuredOutput === 'function') {
      // 结构化运行器
      const structuredRunnable = client.withStructuredOutput(schema)
      // 结构化响应
      const structuredResponse = await structuredRunnable.invoke(prompt)
      return schema.parse(structuredResponse)
    }

    // 兼容无结构化能力时的解析路径
    const response = await client.invoke(prompt)
    // 原始文本
    const text = extractTextFromContent(response.content)
    // 解析后的 JSON
    const parsedJson = parseJson(text)
    return schema.parse(parsedJson)
  }

  /**
   * 统一调用不同供应商模型
   * @param {TranslationModelProfile} profile 模型配置
   * @param {string} prompt 输入提示词
   * @returns {Promise<LlmInvokeResult>} 调用结果
   */
  public async invoke(profile: TranslationModelProfile, prompt: string): Promise<LlmInvokeResult> {
    try {
      // LangChain 客户端
      const client = this.createClient(profile)
      // 模型响应
      const response = await client.invoke(prompt)
      // 文本内容
      const text = extractTextFromContent(response.content)
      return {
        success: true,
        text,
        msg: 'langchain invoke success'
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 调用结构化输出并执行解析失败重试
   * @template TData 结构化输出类型
   * @param {TranslationModelProfile} profile 模型配置
   * @param {string} prompt 输入提示词
   * @param {ZodType<TData>} schema Zod 结构定义
   * @param {number} maxRetryCount 最大重试次数
   * @returns {Promise<LlmStructuredInvokeResult<TData>>} 结构化调用结果
   */
  public async invokeStructured<TData>(
    profile: TranslationModelProfile,
    prompt: string,
    schema: ZodType<TData>,
    maxRetryCount: number = 1
  ): Promise<LlmStructuredInvokeResult<TData>> {
    // 最后一次错误
    let lastError: unknown = null

    // 最大尝试次数
    const maxAttemptCount = Math.max(1, maxRetryCount + 1)

    // 结构化调用策略
    const strategy = getStructuredInvokeStrategy(profile)

    for (let attemptIndex = 0; attemptIndex < maxAttemptCount; attemptIndex += 1) {
      try {
        // LangChain 客户端
        const client = this.createClient(profile)
        // 结构化数据
        const data = await this.invokeWithSchema(client, prompt, schema, strategy)

        return {
          success: true,
          data,
          msg: 'langchain invoke structured success'
        }
      } catch (error) {
        // 记录最后错误
        lastError = error
        // 当前错误是否可重试
        const shouldRetry = attemptIndex < maxAttemptCount - 1 && isStructuredParseError(error)
        if (shouldRetry) {
          continue
        }

        // 错误消息
        const rawMessage = error instanceof Error ? error.message : String(error)
        // 带上下文的错误消息
        const errorMessage = `langchain structured invoke failed: model=${profile.model}; strategy=${strategy}; parseError=${isStructuredParseError(error)}; message=${rawMessage}`
        throw new Error(errorMessage)
      }
    }

    // 理论兜底
    throw new Error(
      `langchain structured invoke failed: model=${profile.model}; strategy=${strategy}; parseError=${isStructuredParseError(lastError)}; message=unknown error`
    )
  }
}

export const langchainGateway = new LangchainGateway()
