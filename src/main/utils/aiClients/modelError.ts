import { ZodError } from 'zod'

/** 模型调用友好化配置 */
export interface FormatModelInvokeErrorOptions {
  /* 是否为 Gemini 模型 */
  isGemini: boolean
  /* 是否为结构化输出调用 */
  isStructured?: boolean
}

/** 结构化输出解析错误 */
export class StructuredOutputParseError extends Error {
  /**
   * 创建结构化输出解析错误
   * @param {string} message 面向用户的错误提示
   * @param {unknown} cause 原始错误原因
   */
  constructor(message = '模型输出不符合 JSON 结构要求', cause?: unknown) {
    super(message, { cause })
    this.name = 'StructuredOutputParseError'
  }
}

/** HTTP 状态码到中文友好提示的映射 */
const HTTP_STATUS_ERROR_MAP: Readonly<Record<number, string>> = {
  400: '请求参数不被当前模型接受，请检查模型配置或稍后重试',
  401: 'API Key 无效或已过期，请前往设置检查模型配置',
  402: '模型账户余额不足或额度已用尽，请检查账单状态',
  403: '当前 API Key 无权访问该模型或受地区限制，请检查权限与代理设置',
  404: '未找到指定模型或接口路径，请检查模型名称与 Base URL',
  408: '模型响应超时，请检查网络或代理设置后重试',
  429: '请求过于频繁或已触发限流，请稍后重试',
  500: '模型服务内部异常，请稍后重试',
  502: '模型服务网关异常，请稍后重试',
  503: '模型服务当前繁忙，请稍后重试或切换其他模型',
  504: '模型服务响应超时，请稍后重试'
}

/** 无明确 HTTP 状态码时的错误消息特征匹配规则 */
const ERROR_PATTERN_RULES: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    pattern: /timeout|timed out|aborted/i,
    message: '模型请求超时，请检查网络或代理设置后重试'
  },
  {
    pattern: /fetch failed|network|econnrefused|econnreset|enotfound|etimedout|socket hang up|tls|certificate|proxy/i,
    message: '无法连接到模型服务，请检查网络连接或代理设置'
  },
  {
    pattern: /high demand|overloaded|service unavailable|temporarily unavailable/i,
    message: '模型服务当前繁忙，请稍后重试或切换其他模型'
  },
  {
    pattern: /rate limit|too many requests|quota|resource_exhausted|insufficient_quota/i,
    message: '请求过于频繁或额度已用尽，请稍后重试'
  },
  {
    pattern: /api[_\s-]?key|unauthorized|invalid.*key|authentication/i,
    message: 'API Key 无效或无权限，请前往设置检查模型配置'
  },
  {
    pattern: /model.*not found|does not exist|not supported for/i,
    message: '当前模型不可用或名称有误，请检查模型设置'
  }
]

/** 常见模型接口 HTTP 状态码文本匹配规则 */
const HTTP_STATUS_TEXT_PATTERN =
  /(?:^|\[\s*|\bstatus(?:\s*code)?\s*[:=]?\s*|\bhttp\s*[:/]?\s*)(400|401|402|403|404|408|429|500|502|503|504)\b/i

/** 结构化输出解析错误关键词 */
const STRUCTURED_PARSE_ERROR_KEYWORDS = ['parse', 'json', 'schema', 'zod']

/** OpenAI Chat Completions 响应缺少必需数组字段时的错误消息 */
const INVALID_OPENAI_RESPONSE_MESSAGE = "Cannot read properties of undefined (reading 'map')"

/**
 * 脱敏错误消息中的 API Key，避免日志或提示泄露敏感凭据
 * @param {string} message 原始错误消息
 * @param {string} apiKey 模型 API Key
 * @returns {string} 脱敏后的错误消息
 */
export const sanitizeErrorMessage = (message: string, apiKey?: string): string => {
  if (!apiKey) {
    return message
  }
  return message.replaceAll(apiKey, '***')
}

/**
 * 判断未知值是否为有效的 HTTP 错误状态码（400..599）
 * @param {unknown} value 待检查值
 * @returns {number | null} 合法状态码或 null
 */
const toValidHttpStatus = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599) {
    return value
  }
  return null
}

/**
 * 从错误对象或错误消息中提取 HTTP 状态码
 * @param {unknown} error 错误对象
 * @param {string} rawMessage 原始错误消息
 * @returns {number | null} HTTP 状态码或 null
 */
export const extractHttpStatus = (error: unknown, rawMessage: string): number | null => {
  if (typeof error === 'object' && error !== null) {
    const errorRecord = error as {
      status?: unknown
      statusCode?: unknown
      response?: { status?: unknown }
    }
    const objectStatus =
      toValidHttpStatus(errorRecord.status) ??
      toValidHttpStatus(errorRecord.statusCode) ??
      toValidHttpStatus(errorRecord.response?.status)
    if (objectStatus !== null) {
      return objectStatus
    }
  }

  const textMatch = rawMessage.match(HTTP_STATUS_TEXT_PATTERN)
  if (!textMatch) {
    return null
  }
  return toValidHttpStatus(Number(textMatch[1]))
}

/**
 * 判断是否是结构化解析错误
 * @param {unknown} error 错误对象
 * @returns {boolean} 是否是解析错误
 */
export const isStructuredParseError = (error: unknown): boolean => {
  if (
    error instanceof StructuredOutputParseError ||
    error instanceof ZodError ||
    error instanceof SyntaxError
  ) {
    return true
  }

  const rawMessage = error instanceof Error ? error.message : ''
  if (!rawMessage) {
    return false
  }

  // 带 HTTP 状态码的服务端/网关错误不按结构化解析错误重试
  if (extractHttpStatus(error, rawMessage) !== null) {
    return false
  }

  const lowerMessage = rawMessage.toLowerCase()
  return STRUCTURED_PARSE_ERROR_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))
}

/**
 * 将模型调用底层错误转换为面向用户的中文友好错误
 * @param {unknown} error 原始错误对象
 * @param {FormatModelInvokeErrorOptions} options 错误上下文配置
 * @returns {Error} 友好化后的错误对象
 */
export const formatModelInvokeError = (
  error: unknown,
  options: FormatModelInvokeErrorOptions
): Error => {
  if (error instanceof StructuredOutputParseError) {
    return error
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? 'unknown error')

  if (!options.isGemini && rawMessage === INVALID_OPENAI_RESPONSE_MESSAGE) {
    return new Error(
      '模型网关响应不符合 OpenAI Chat Completions 格式，请检查 Base URL 是否包含正确的 API 路径（常见为 /v1 或 /api/v1）',
      { cause: error }
    )
  }

  const httpStatus = extractHttpStatus(error, rawMessage)
  if (httpStatus !== null && HTTP_STATUS_ERROR_MAP[httpStatus]) {
    return new Error(HTTP_STATUS_ERROR_MAP[httpStatus], { cause: error })
  }

  if (options.isStructured && isStructuredParseError(error)) {
    return new StructuredOutputParseError('模型输出不符合 JSON 结构要求', error)
  }

  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new Error('模型请求超时，请检查网络或代理设置后重试', { cause: error })
  }

  const matchedRule = ERROR_PATTERN_RULES.find((rule) => rule.pattern.test(rawMessage))
  if (matchedRule) {
    return new Error(matchedRule.message, { cause: error })
  }

  return new Error('模型调用失败，请稍后重试或检查模型配置', { cause: error })
}
