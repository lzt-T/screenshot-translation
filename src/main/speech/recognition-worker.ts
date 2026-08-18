import { parentPort, workerData } from 'node:worker_threads'
import path from 'node:path'
import { CircularBuffer, LinearResampler, OfflineRecognizer, Vad } from 'sherpa-onnx-node'
import type { RecognitionWorkerRequest, RecognitionWorkerResponse } from '../../type/conversation'

/** 识别 Worker 启动数据 */
interface RecognitionWorkerData {
  /** Whisper 英文识别模型目录 */
  modelDirectory: string
  /** Silero VAD 模型路径 */
  vadModelPath: string
}

// Whisper 与 VAD 的目标采样率
const TARGET_SAMPLE_RATE = 16000
// Silero VAD 单次处理窗口
const VAD_WINDOW_SIZE = 512
// VAD 内部最长缓冲时长
const VAD_BUFFER_SIZE_SECONDS = 60
// 输入窗口对齐缓冲时长
const AUDIO_BUFFER_SIZE_SECONDS = 5
// Worker 消息端口
const messagePort = parentPort
// Worker 启动配置
const recognitionWorkerData = workerData as RecognitionWorkerData
// 可复用的 Whisper 初始化任务
let recognizerPromise: Promise<OfflineRecognizer> | null = null
// 当前语音活动检测器
let voiceActivityDetector: Vad | null = null
// 当前窗口对齐缓冲区
let audioBuffer: CircularBuffer | null = null
// 非 16 kHz 输入使用的重采样器
let inputResampler: LinearResampler | null = null
// 当前重采样器的输入采样率
let inputSampleRate = TARGET_SAMPLE_RATE
// 当前识别会话编号
let recognitionSessionId = 0
// 当前识别资源是否可以接收音频
let isRecognitionReady = false
// 当前是否正在执行 Whisper 推理
let isRecognizing = false

/**
 * 向主线程发送识别响应
 * @param response 识别响应
 * @returns 无返回值
 */
function postResponse(response: RecognitionWorkerResponse): void {
  messagePort?.postMessage(response)
}

/**
 * 异步创建并复用 Whisper 英文识别器
 * @returns Whisper 识别器
 */
function getRecognizer(): Promise<OfflineRecognizer> {
  if (!recognizerPromise) {
    // Whisper 模型目录
    const modelDirectory = recognitionWorkerData.modelDirectory
    // 当前模型初始化任务
    const initializationPromise = OfflineRecognizer.createAsync({
      featConfig: {
        sampleRate: TARGET_SAMPLE_RATE,
        featureDim: 80
      },
      modelConfig: {
        whisper: {
          encoder: path.join(modelDirectory, 'base.en-encoder.int8.onnx'),
          decoder: path.join(modelDirectory, 'base.en-decoder.int8.onnx'),
          language: 'en',
          task: 'transcribe'
        },
        tokens: path.join(modelDirectory, 'base.en-tokens.txt'),
        numThreads: 2,
        provider: 'cpu',
        debug: false
      }
    })
    recognizerPromise = initializationPromise
    void initializationPromise.catch(() => {
      if (recognizerPromise === initializationPromise) {
        recognizerPromise = null
      }
    })
  }

  return recognizerPromise
}

/** 创建当前会话使用的语音活动检测器 */
function createVoiceActivityDetector(): Vad {
  return new Vad(
    {
      sileroVad: {
        model: recognitionWorkerData.vadModelPath,
        threshold: 0.5,
        minSpeechDuration: 0.25,
        minSilenceDuration: 1.2,
        windowSize: VAD_WINDOW_SIZE,
        maxSpeechDuration: 40
      },
      sampleRate: TARGET_SAMPLE_RATE,
      numThreads: 1,
      provider: 'cpu',
      debug: false
    },
    VAD_BUFFER_SIZE_SECONDS
  )
}

/** 清理当前识别会话的音频资源 */
function clearRecognitionResources(): void {
  voiceActivityDetector?.clear()
  voiceActivityDetector = null
  audioBuffer = null
  inputResampler = null
  inputSampleRate = TARGET_SAMPLE_RATE
  isRecognitionReady = false
  isRecognizing = false
}

/** 启动一轮 Whisper 识别 */
async function startRecognition(): Promise<void> {
  recognitionSessionId += 1
  // 当前启动对应的会话编号
  const sessionId = recognitionSessionId
  clearRecognitionResources()

  try {
    await getRecognizer()
    if (sessionId !== recognitionSessionId) {
      return
    }

    voiceActivityDetector = createVoiceActivityDetector()
    audioBuffer = new CircularBuffer(AUDIO_BUFFER_SIZE_SECONDS * TARGET_SAMPLE_RATE)
    isRecognitionReady = true
    postResponse({ type: 'ready' })
  } catch (error) {
    if (sessionId !== recognitionSessionId) {
      return
    }
    // 可展示的模型初始化错误
    const errorMessage = error instanceof Error ? error.message : String(error)
    clearRecognitionResources()
    postResponse({ type: 'error', message: errorMessage })
  }
}

/** 停止并作废当前识别会话 */
function stopRecognition(): void {
  recognitionSessionId += 1
  clearRecognitionResources()
}

/**
 * 将输入音频转换为 VAD 使用的 16 kHz 采样
 * @param samples 输入 PCM 采样
 * @param sampleRate 输入采样率
 * @returns 16 kHz PCM 采样
 */
function resampleAudio(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === TARGET_SAMPLE_RATE) {
    return samples
  }

  if (!inputResampler || inputSampleRate !== sampleRate) {
    inputResampler = new LinearResampler(sampleRate, TARGET_SAMPLE_RATE)
    inputSampleRate = sampleRate
  }
  return inputResampler.resample(samples)
}

/**
 * 异步识别一段完整语音
 * @param samples 完整语音采样
 * @param sessionId 语音所属会话编号
 * @returns 识别完成任务
 */
async function recognizeSegment(samples: Float32Array, sessionId: number): Promise<void> {
  try {
    // 可复用的 Whisper 识别器
    const recognizer = await getRecognizer()
    if (sessionId !== recognitionSessionId) {
      return
    }

    // 当前离线识别流
    const recognitionStream = recognizer.createStream()
    recognitionStream.acceptWaveform({ samples, sampleRate: TARGET_SAMPLE_RATE })
    // 当前 Whisper 识别结果
    const result = await recognizer.decodeAsync(recognitionStream)
    if (sessionId !== recognitionSessionId) {
      return
    }

    isRecognizing = false
    postResponse({ type: 'final', text: result.text.trim() })
  } catch (error) {
    if (sessionId !== recognitionSessionId) {
      return
    }
    // 可展示的语音识别错误
    const errorMessage = error instanceof Error ? error.message : String(error)
    clearRecognitionResources()
    postResponse({ type: 'error', message: errorMessage })
  }
}

/** 检查并识别 VAD 已切分的语音段 */
function processDetectedSegment(): void {
  if (!voiceActivityDetector || voiceActivityDetector.isEmpty() || isRecognizing) {
    return
  }

  // 复制后的完整语音段
  const segment = voiceActivityDetector.front(false)
  voiceActivityDetector.pop()
  isRecognizing = true
  isRecognitionReady = false
  postResponse({ type: 'processing' })
  void recognizeSegment(segment.samples, recognitionSessionId)
}

/**
 * 接收音频并推进 VAD 切句
 * @param samples PCM 采样数据
 * @param sampleRate 输入采样率
 * @returns 无返回值
 */
function acceptAudio(samples: Float32Array, sampleRate: number): void {
  if (!isRecognitionReady || isRecognizing || !voiceActivityDetector || !audioBuffer) {
    return
  }

  // VAD 目标采样率的当前音频块
  const resampledSamples = resampleAudio(samples, sampleRate)
  audioBuffer.push(resampledSamples)
  while (audioBuffer.size() >= VAD_WINDOW_SIZE) {
    // 当前 VAD 输入窗口
    const windowSamples = audioBuffer.get(audioBuffer.head(), VAD_WINDOW_SIZE, false)
    audioBuffer.pop(VAD_WINDOW_SIZE)
    voiceActivityDetector.acceptWaveform(windowSamples)
    processDetectedSegment()
    if (isRecognizing) {
      return
    }
  }
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
      start: () => {
        void startRecognition()
      },
      audio: () => {
        if (message.type === 'audio') {
          acceptAudio(message.samples, message.sampleRate)
        }
      },
      stop: stopRecognition
    }
    messageHandlers[message.type]()
  } catch (error) {
    // 可展示的同步识别错误
    const errorMessage = error instanceof Error ? error.message : String(error)
    stopRecognition()
    postResponse({ type: 'error', message: errorMessage })
  }
}

messagePort?.on('message', handleRecognitionMessage)
