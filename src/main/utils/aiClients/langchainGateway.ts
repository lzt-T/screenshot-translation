import { GoogleGenAI } from '@google/genai'
import { ChatOpenAI } from '@langchain/openai'
import type { ZodType, ZodTypeDef } from 'zod'
import { TranslationModelProfile } from '../../../type/model'
import { isGeminiModel } from '../../../utils/modelProfiles'
import { formatModelInvokeError, isStructuredParseError, sanitizeErrorMessage } from './modelError'

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

// OpenAI 兼容模型前缀对应的结构化输出方式
const STRUCTURED_OUTPUT_METHOD_BY_MODEL_PREFIX: Readonly<Record<string, StructuredOutputMethod>> = {
  'deepseek-': 'jsonMode',
  'glm-': 'jsonMode',
  qwen: 'jsonMode',
  'claude-': 'textJson',
  'anthropic/claude-': 'textJson'
}

/**
 * 去除模型输出外层可能附带的 Markdown JSON 代码围栏
 * @param {string} text 模型原始输出文本
 * @returns {string} 清洗后的 JSON 文本
 */
const stripJsonCodeFence = (text: string): string => {
  const trimmed = text.trim()
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenceMatch ? fenceMatch[1].trim() : trimmed
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
 * AI 模型统一网关（Gemini 走官方 @google/genai SDK，其余模型走 LangChain OpenAI 兼容协议）
 */
class LangchainGateway {
  /**
   * 创建 OpenAI 兼容模型客户端
   * @param {TranslationModelProfile} profile 模型配置
   * @param {number} temperature 模型采样温度
   * @returns {LangchainRunnableClient} LangChain 客户端
   */
  private createOpenAiClient(
    profile: TranslationModelProfile,
    temperature?: number
  ): LangchainRunnableClient {
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
   * 使用 Google 官方 @google/genai SDK（Interactions API）调用 Gemini 模型
   * @param {TranslationModelProfile} profile 模型配置
   * @param {string} prompt 输入提示词
   * @param {boolean} expectJson 是否启用原生 JSON 响应格式
   * @returns {Promise<string>} 去除首尾空白后的模型文本输出
   */
  private async invokeGemini(
    profile: TranslationModelProfile,
    prompt: string,
    expectJson = false
  ): Promise<string> {
    // 官方 Gemini 客户端（默认使用 GA v1 接口）
    const ai = new GoogleGenAI({ apiKey: profile.apiKey })
    // 调用 Interactions API；关闭服务端持久化以保护桌面翻译隐私
    const interaction = await ai.interactions.create(
      {
        model: profile.model,
        input: prompt,
        store: false,
        ...(expectJson
          ? {
              response_format: {
                type: 'text' as const,
                mime_type: 'application/json' as const
              }
            }
          : {})
      },
      { timeout: MODEL_REQUEST_TIMEOUT_MS }
    )
    return (interaction.output_text ?? '').trim()
  }

  /**
   * 调用 OpenAI 兼容模型结构化输出并解析
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
      // 严格 JSON 输出提示词
      const jsonPrompt = `${prompt}\n只返回一个可被 JSON.parse 直接解析的 JSON 对象，不要使用 Markdown 代码块，不要添加解释。`
      // 文本响应
      const response = await client.invoke(jsonPrompt, { signal: requestSignal })
      // 返回的 JSON 文本
      const text = extractTextFromContent(response.content)
      // 严格解析后的原始数据
      const parsedData: unknown = JSON.parse(stripJsonCodeFence(text))
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
    // 是否为 Gemini 模型
    const isGemini = isGeminiModel(profile.model)

    try {
      if (isGemini) {
        const text = await this.invokeGemini(profile, prompt, false)
        return {
          success: true,
          text,
          msg: 'gemini invoke success'
        }
      }

      // LangChain 客户端
      const client = this.createOpenAiClient(profile)
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
      // 脱敏后的调试错误消息
      const rawMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[langchainGateway.invoke] model=${profile.model}; message=${sanitizeErrorMessage(rawMessage, profile.apiKey)}`,
        error
      )
      throw formatModelInvokeError(error, { isGemini })
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
    // 是否为 Gemini 模型
    const isGemini = isGeminiModel(profile.model)
    // 当前模型的结构化输出方式
    const method = isGemini ? 'geminiJson' : getStructuredOutputMethod(profile)

    for (let attemptIndex = 0; attemptIndex < maxAttemptCount; attemptIndex += 1) {
      try {
        if (isGemini) {
          // Gemini 原生 JSON 响应提示词
          const jsonPrompt = `${prompt}\n只返回一个可被 JSON.parse 直接解析的 JSON 对象，不要使用 Markdown 代码块，不要添加解释。`
          // Gemini 响应文本
          const rawText = await this.invokeGemini(profile, jsonPrompt, true)
          // 严格解析后的原始数据
          const parsedData: unknown = JSON.parse(stripJsonCodeFence(rawText))
          return {
            success: true,
            data: schema.parse(parsedData),
            msg: 'gemini invoke structured success'
          }
        }

        // LangChain OpenAI 兼容客户端
        const client = this.createOpenAiClient(profile, options.temperature)
        // 结构化数据
        const data = await this.invokeWithSchema(
          client,
          prompt,
          schema,
          method as StructuredOutputMethod
        )

        return {
          success: true,
          data,
          msg: 'langchain invoke structured success'
        }
      } catch (error) {
        // 记录最后错误
        lastError = error
        // 当前错误是否可重试
        const parseError = isStructuredParseError(error)
        const shouldRetry = attemptIndex < maxAttemptCount - 1 && parseError
        if (shouldRetry) {
          continue
        }

        // 脱敏后的调试错误消息
        const rawMessage = error instanceof Error ? error.message : String(error)
        console.error(
          `[langchainGateway.invokeStructured] model=${profile.model}; method=${method}; parseError=${parseError}; message=${sanitizeErrorMessage(rawMessage, profile.apiKey)}`,
          error
        )
        throw formatModelInvokeError(error, { isGemini, isStructured: true })
      }
    }

    // 理论兜底
    throw formatModelInvokeError(lastError, { isGemini, isStructured: true })
  }
}

// LangChain 统一网关实例
export const langchainGateway = new LangchainGateway()
