import { parentPort, workerData } from 'node:worker_threads'
import path from 'node:path'
import { OnlineRecognizer } from 'sherpa-onnx-node'
import type { RecognitionWorkerRequest, RecognitionWorkerResponse } from '../../type/conversation'

/** 识别 Worker 启动数据 */
interface RecognitionWorkerData {
  /** 英文识别模型目录 */
  modelDirectory: string
}

// Worker 消息端口
const messagePort = parentPort
// Worker 启动配置
const recognitionWorkerData = workerData as RecognitionWorkerData
// 当前在线识别器
let recognizer: OnlineRecognizer | null = null
// 当前在线识别流
let recognitionStream: ReturnType<OnlineRecognizer['createStream']> | null = null
// 上一次发送的部分文本
let lastPartialText = ''

/**
 * 向主线程发送识别响应
 * @param response 识别响应
 * @returns 无返回值
 */
function postResponse(response: RecognitionWorkerResponse): void {
  messagePort?.postMessage(response)
}

/**
 * 创建并复用英文在线识别器
 * @returns 在线识别器
 */
function getRecognizer(): OnlineRecognizer {
  if (recognizer) {
    return recognizer
  }

  // 英文识别模型目录
  const modelDirectory = recognitionWorkerData.modelDirectory
  recognizer = new OnlineRecognizer({
    featConfig: {
      sampleRate: 16000,
      featureDim: 80
    },
    modelConfig: {
      transducer: {
        encoder: path.join(modelDirectory, 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx'),
        decoder: path.join(modelDirectory, 'decoder-epoch-99-avg-1-chunk-16-left-128.onnx'),
        joiner: path.join(modelDirectory, 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx')
      },
      tokens: path.join(modelDirectory, 'tokens.txt'),
      numThreads: 2,
      provider: 'cpu'
    },
    decodingMethod: 'greedy_search',
    maxActivePaths: 4,
    enableEndpoint: true,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 20
  })
  return recognizer
}

/** 启动一轮实时识别 */
function startRecognition(): void {
  // 可复用的在线识别器
  const onlineRecognizer = getRecognizer()
  recognitionStream = onlineRecognizer.createStream()
  lastPartialText = ''
  postResponse({ type: 'ready' })
}

/** 停止当前实时识别 */
function stopRecognition(): void {
  recognitionStream = null
  lastPartialText = ''
}

/**
 * 接收音频并推进实时识别
 * @param samples PCM 采样数据
 * @param sampleRate 输入采样率
 * @returns 无返回值
 */
function acceptAudio(samples: Float32Array, sampleRate: number): void {
  if (!recognizer || !recognitionStream) {
    return
  }

  recognitionStream.acceptWaveform({ samples, sampleRate })
  while (recognizer.isReady(recognitionStream)) {
    recognizer.decode(recognitionStream)
  }

  // 当前增量识别文本
  const currentText = recognizer.getResult(recognitionStream).text.trim()
  if (currentText && currentText !== lastPartialText) {
    lastPartialText = currentText
    postResponse({ type: 'partial', text: currentText })
  }

  if (!recognizer.isEndpoint(recognitionStream)) {
    return
  }

  postResponse({ type: 'final', text: currentText })
  recognitionStream = recognizer.createStream()
  lastPartialText = ''
}

/**
 * 处理主线程识别消息
 * @param message 识别请求
 * @returns 无返回值
 */
function handleRecognitionMessage(message: RecognitionWorkerRequest): void {
  try {
    // 固定消息类型对应的处理策略
    const messageHandlers: Record<RecognitionWorkerRequest['type'], () => void> = {
      start: startRecognition,
      audio: () => {
        if (message.type === 'audio') {
          acceptAudio(message.samples, message.sampleRate)
        }
      },
      stop: stopRecognition
    }
    messageHandlers[message.type]()
  } catch (error) {
    // 可展示的识别错误信息
    const errorMessage = error instanceof Error ? error.message : String(error)
    stopRecognition()
    postResponse({ type: 'error', message: errorMessage })
  }
}

messagePort?.on('message', handleRecognitionMessage)
