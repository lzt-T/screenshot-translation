import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatOpenAI } from '@langchain/openai'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'
import { TranslationModelProfile } from '../../../type/model'
import { isGeminiModel } from '../../../utils/modelProfiles'

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

/** 结构化模型调用配置 */
export interface LlmStructuredInvokeOptions {
  /* 最大重试次数 */
  maxRetryCount?: number
  /* 模型采样温度 */
  temperature?: number
}

/** 可执行 LangChain 调用的客户端 */
interface LangchainRunnableClient {
  invoke: (input: string, config?: { signal?: AbortSignal }) => Promise<{ content: unknown }>
  withStructuredOutput?: (
    schema: unknown,
    config?: { method?: 'jsonMode' }
  ) => { invoke: (input: string, config?: { signal?: AbortSignal }) => Promise<unknown> }
}

/** 结构化输出方式 */
type StructuredOutputMethod = 'default' | 'jsonMode' | 'textJson'

// 模型请求超时时间
const MODEL_REQUEST_TIMEOUT_MS = 60_000

// 模型前缀对应的结构化输出方式
const STRUCTURED_OUTPUT_METHOD_BY_MODEL_PREFIX: Readonly<Record<string, StructuredOutputMethod>> = {
  'gemini-': 'textJson',
  'deepseek-': 'jsonMode',
  'glm-': 'jsonMode',
  qwen: 'jsonMode',
  'claude-': 'textJson',
  'anthropic/claude-': 'textJson'
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
 * 获取结构化输出方式
 * @param {TranslationModelProfile} profile 模型配置
 * @returns {StructuredOutputMethod} 结构化输出方式
 */
const getStructuredOutputMethod = (profile: TranslationModelProfile): StructuredOutputMethod => {
  // 标准化后的模型名称
  const normalizedModelName = profile.model.toLowerCase()
  // 命中的模型前缀策略
  const matchedMethod = Object.entries(STRUCTURED_OUTPUT_METHOD_BY_MODEL_PREFIX).find(
    ([modelPrefix]) => normalizedModelName.startsWith(modelPrefix)
  )
  return matchedMethod?.[1] || 'default'
}

/**
 * 判断是否是结构化解析错误
 * @param {unknown} error 错误对象
 * @returns {boolean} 是否是解析错误
 */
const isStructuredParseError = (error: unknown): boolean => {
  if (error instanceof ZodError) {
    return true
  }

  // 错误消息
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
  if (!errorMessage) {
    return false
  }

  return ['parse', 'json', 'schema', 'zod'].some((keyword) => {
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
   * @param {number} temperature 模型采样温度
   * @returns {LangchainRunnableClient} LangChain 客户端
   */
  private createClient(
    profile: TranslationModelProfile,
    temperature?: number
  ): LangchainRunnableClient {
    if (isGeminiModel(profile.model)) {
      return new ChatGoogleGenerativeAI({
        apiKey: profile.apiKey,
        model: profile.model,
        temperature
      }) as unknown as LangchainRunnableClient
    }

    // OpenAI 兼容 Base URL
    const openAiBaseUrl = profile.baseUrl || 'https://api.openai.com/v1'
    return new ChatOpenAI({
      apiKey: profile.apiKey,
      model: profile.model,
      temperature,
      configuration: { baseURL: openAiBaseUrl }
    }) as unknown as LangchainRunnableClient
  }

  /**
   * 调用结构化输出并解析
   * @template TData 结构化输出类型
   * @param {LangchainRunnableClient} client LangChain 客户端
   * @param {string} prompt 输入提示词
   * @param {ZodType<TData>} schema Zod 结构定义
   * @param {StructuredOutputMethod} method 结构化输出方式
   * @returns {Promise<TData>} 结构化输出数据
   */
  private async invokeWithSchema<TData>(
    client: LangchainRunnableClient,
    prompt: string,
    schema: ZodType<TData, ZodTypeDef, unknown>,
    method: StructuredOutputMethod
  ): Promise<TData> {
    // 当前模型请求中止信号
    const requestSignal = AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS)

    if (method === 'textJson') {
      // Gemini 严格 JSON 输出提示词
      const jsonPrompt = `${prompt}\n只返回一个可被 JSON.parse 直接解析的 JSON 对象，不要使用 Markdown 代码块，不要添加解释。`
      // Gemini 文本响应
      const response = await client.invoke(jsonPrompt, { signal: requestSignal })
      // Gemini 返回的 JSON 文本
      const text = extractTextFromContent(response.content)
      // 严格解析后的原始数据
      const parsedData: unknown = JSON.parse(text)
      return schema.parse(parsedData)
    }

    if (typeof client.withStructuredOutput !== 'function') {
      throw new Error('当前模型不支持 withStructuredOutput')
    }

    // 结构化运行器
    const structuredRunnable =
      method === 'jsonMode'
        ? client.withStructuredOutput(schema, { method: 'jsonMode' })
        : client.withStructuredOutput(schema)
    // 结构化响应
    const structuredResponse = await structuredRunnable.invoke(prompt, { signal: requestSignal })
    return schema.parse(structuredResponse)
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
      // 当前模型请求中止信号
      const requestSignal = AbortSignal.timeout(MODEL_REQUEST_TIMEOUT_MS)
      // 模型响应
      const response = await client.invoke(prompt, { signal: requestSignal })
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
   * @param {LlmStructuredInvokeOptions} options 结构化调用配置
   * @returns {Promise<LlmStructuredInvokeResult<TData>>} 结构化调用结果
   */
  public async invokeStructured<TData>(
    profile: TranslationModelProfile,
    prompt: string,
    schema: ZodType<TData, ZodTypeDef, unknown>,
    options: LlmStructuredInvokeOptions = {}
  ): Promise<LlmStructuredInvokeResult<TData>> {
    // 最后一次错误
    let lastError: unknown = null

    // 最大重试次数
    const maxRetryCount = options.maxRetryCount ?? 1
    // 最大尝试次数
    const maxAttemptCount = Math.max(1, maxRetryCount + 1)
    // 当前模型的结构化输出方式
    const method = getStructuredOutputMethod(profile)

    for (let attemptIndex = 0; attemptIndex < maxAttemptCount; attemptIndex += 1) {
      try {
        // LangChain 客户端
        const client = this.createClient(profile, options.temperature)
        // 结构化数据
        const data = await this.invokeWithSchema(client, prompt, schema, method)

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
        // 响应是否缺少 OpenAI Chat Completions 必需的数组字段
        const isInvalidOpenAiResponse =
          rawMessage === "Cannot read properties of undefined (reading 'map')"
        if (isInvalidOpenAiResponse) {
          throw new Error(
            '模型网关响应不符合 OpenAI Chat Completions 格式，请检查 Base URL 是否包含正确的 API 路径（常见为 /v1 或 /api/v1）',
            { cause: error }
          )
        }
        // 带上下文的错误消息
        const errorMessage = `langchain structured invoke failed: model=${profile.model}; method=${method}; parseError=${isStructuredParseError(error)}; message=${rawMessage}`
        throw new Error(errorMessage)
      }
    }

    // 理论兜底
    throw new Error(
      `langchain structured invoke failed: model=${profile.model}; method=${method}; parseError=${isStructuredParseError(lastError)}; message=unknown error`
    )
  }
}

// LangChain 统一网关实例
export const langchainGateway = new LangchainGateway()
