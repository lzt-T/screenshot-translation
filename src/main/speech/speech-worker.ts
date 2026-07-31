import { parentPort, workerData } from 'node:worker_threads'
import path from 'node:path'
import { GenerationConfig, OfflineTts } from 'sherpa-onnx-node'
import type { SpeechWorkerRequest, SpeechWorkerResponse } from '../../type/speech'

/** Worker 启动数据 */
interface SpeechWorkerData {
  /** Kokoro 模型目录 */
  modelDirectory: string
}

/** Kokoro 生成音频 */
interface GeneratedAudio {
  /** 浮点音频采样 */
  samples: Float32Array
  /** 音频采样率 */
  sampleRate: number
}

// Worker 消息端口
const messagePort = parentPort
// Worker 启动配置
const speechWorkerData = workerData as SpeechWorkerData
// 英文与中文默认音色映射
const SPEAKER_ID_BY_LANGUAGE: Readonly<Record<'en' | 'zh', number>> = {
  en: 0,
  zh: 48
}
// 模型不支持标点到半角标点的规范化映射
const PUNCTUATION_NORMALIZATION_MAP: Readonly<Record<string, string>> = {
  '，': ',',
  '。': '.',
  '！': '!',
  '？': '?',
  '❓': '?',
  '；': ';',
  '：': ':'
}
// 当前有效请求编号
let activeRequestId: number | null = null
// 已取消的请求编号
const cancelledRequestIds = new Set<number>()
// Kokoro 实例初始化任务
let offlineTtsPromise: Promise<OfflineTts> | null = null
// 串行语音合成任务
let synthesisQueue: Promise<void> = Promise.resolve()

/**
 * 异步创建并复用 Kokoro 语音模型
 * @returns {Promise<OfflineTts>} 离线语音模型
 */
function getOfflineTts(): Promise<OfflineTts> {
  if (!offlineTtsPromise) {
    // Kokoro 模型路径
    const modelPath = path.join(speechWorkerData.modelDirectory, 'model.int8.onnx')
    // Kokoro 音色路径
    const voicesPath = path.join(speechWorkerData.modelDirectory, 'voices.bin')
    // Kokoro 标记路径
    const tokensPath = path.join(speechWorkerData.modelDirectory, 'tokens.txt')
    // Kokoro 语言数据路径
    const dataDirectory = path.join(speechWorkerData.modelDirectory, 'espeak-ng-data')
    // Kokoro 中英文词典路径
    const lexiconPaths = [
      path.join(speechWorkerData.modelDirectory, 'lexicon-us-en.txt'),
      path.join(speechWorkerData.modelDirectory, 'lexicon-zh.txt')
    ].join(',')

    offlineTtsPromise = OfflineTts.createAsync({
      model: {
        kokoro: {
          model: modelPath,
          voices: voicesPath,
          tokens: tokensPath,
          dataDir: dataDirectory,
          lexicon: lexiconPaths
        }
      },
      maxNumSentences: 1,
      numThreads: 2,
      provider: 'cpu'
    })
  }

  return offlineTtsPromise
}

/**
 * 根据文本选择默认音色
 * @param {string} text 待朗读文本
 * @returns {number} Kokoro 音色编号
 */
function getSpeakerId(text: string): number {
  // 文本是否包含中文字符
  const hasChineseText = /[\u3400-\u9fff]/u.test(text)
  // 当前文本语言
  const language = hasChineseText ? 'zh' : 'en'
  return SPEAKER_ID_BY_LANGUAGE[language]
}

/**
 * 将模型不支持的标点转换为支持的半角标点
 * @param {string} text 待规范化文本
 * @returns {string} 规范化后的文本
 */
function normalizeSpeechText(text: string): string {
  return text.replace(/[，。！？❓；：]/gu, (punctuation) => {
    return PUNCTUATION_NORMALIZATION_MAP[punctuation]
  })
}

/**
 * 将浮点音频编码为单声道 16 位 WAV
 * @param {Float32Array} samples 浮点音频采样
 * @param {number} sampleRate 音频采样率
 * @returns {ArrayBuffer} WAV 音频数据
 */
function createWaveBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  // WAV 文件头长度
  const headerLength = 44
  // 单个采样字节数
  const bytesPerSample = 2
  // WAV 数据缓冲区
  const waveBuffer = new ArrayBuffer(headerLength + samples.length * bytesPerSample)
  // WAV 数据视图
  const waveView = new DataView(waveBuffer)

  /**
   * 写入 WAV ASCII 字段
   * @param {number} offset 写入偏移
   * @param {string} value ASCII 文本
   * @returns {void} 无返回值
   */
  function writeAscii(offset: number, value: string): void {
    // 当前 ASCII 字符索引
    for (let index = 0; index < value.length; index += 1) {
      waveView.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeAscii(0, 'RIFF')
  waveView.setUint32(4, waveBuffer.byteLength - 8, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  waveView.setUint32(16, 16, true)
  waveView.setUint16(20, 1, true)
  waveView.setUint16(22, 1, true)
  waveView.setUint32(24, sampleRate, true)
  waveView.setUint32(28, sampleRate * bytesPerSample, true)
  waveView.setUint16(32, bytesPerSample, true)
  waveView.setUint16(34, 16, true)
  writeAscii(36, 'data')
  waveView.setUint32(40, samples.length * bytesPerSample, true)

  samples.forEach((sample, index) => {
    // 限制后的采样值
    const normalizedSample = Math.max(-1, Math.min(1, sample))
    // 16 位整数采样
    const integerSample = normalizedSample < 0 ? normalizedSample * 0x8000 : normalizedSample * 0x7fff
    waveView.setInt16(headerLength + index * bytesPerSample, integerSample, true)
  })

  return waveBuffer
}

/**
 * 向主线程发送 Worker 响应
 * @param {SpeechWorkerResponse} response 响应数据
 * @returns {void} 无返回值
 */
function postResponse(response: SpeechWorkerResponse): void {
  if (response.audioBuffer) {
    messagePort?.postMessage(response, [response.audioBuffer])
    return
  }

  messagePort?.postMessage(response)
}

/**
 * 合成单段语音
 * @param {number} requestId 请求编号
 * @param {string} text 待朗读文本
 * @returns {Promise<void>} 无返回值
 */
async function synthesizeSpeech(requestId: number, text: string): Promise<void> {
  if (cancelledRequestIds.delete(requestId)) {
    return
  }

  activeRequestId = requestId

  try {
    // Kokoro 语音模型
    const offlineTts = await getOfflineTts()
    if (activeRequestId !== requestId) {
      return
    }

    // 语音生成配置
    const generationConfig = new GenerationConfig({
      sid: getSpeakerId(text),
      speed: 1,
      silenceScale: 0.2
    })
    // 模型支持的规范化文本
    const normalizedText = normalizeSpeechText(text)
    // Kokoro 生成结果
    const generatedAudio = (await offlineTts.generateAsync({
      text: normalizedText,
      enableExternalBuffer: false,
      generationConfig,
      onProgress: () => activeRequestId === requestId
    })) as GeneratedAudio

    if (activeRequestId !== requestId) {
      return
    }

    // WAV 音频数据
    const audioBuffer = createWaveBuffer(generatedAudio.samples, generatedAudio.sampleRate)
    postResponse({ requestId, success: true, audioBuffer })
  } catch (error) {
    // 语音生成错误文本
    const errorMessage = error instanceof Error ? error.message : String(error)
    postResponse({ requestId, success: false, error: errorMessage })
  } finally {
    cancelledRequestIds.delete(requestId)
    if (activeRequestId === requestId) {
      activeRequestId = null
    }
  }
}

/**
 * 处理主线程发送的语音消息
 * @param {SpeechWorkerRequest} message 语音消息
 * @returns {void} 无返回值
 */
function handleSpeechMessage(message: SpeechWorkerRequest): void {
  if (message.type === 'cancel') {
    cancelledRequestIds.add(message.requestId)
    if (activeRequestId === message.requestId) {
      activeRequestId = null
    }
    return
  }

  synthesisQueue = synthesisQueue.then(() => synthesizeSpeech(message.requestId, message.text))
}

messagePort?.on('message', handleSpeechMessage)
