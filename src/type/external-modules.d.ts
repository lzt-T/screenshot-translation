declare module '@langchain/google-genai' {
  export class ChatGoogleGenerativeAI {
    constructor(config: { apiKey: string; model: string; temperature?: number })
    invoke(input: string): Promise<{ content: unknown }>
  }
}

declare module '@langchain/openai' {
  export class ChatOpenAI {
    constructor(config: {
      apiKey: string;
      model: string;
      temperature?: number;
      configuration?: {
        baseURL?: string;
      };
    })
    invoke(input: string): Promise<{ content: unknown }>
  }
}

declare module '@tailwindcss/vite' {
  import type { PluginOption } from 'vite'
  const tailwindcss: (...args: unknown[]) => PluginOption
  export default tailwindcss
}

declare module 'sherpa-onnx-node' {
  export interface OfflineRecognizerResult {
    text: string
  }

  export interface OfflineStream {
    acceptWaveform(input: { samples: Float32Array; sampleRate: number }): void
  }

  export class OfflineRecognizer {
    static createAsync(config: unknown): Promise<OfflineRecognizer>
    createStream(): OfflineStream
    decodeAsync(stream: OfflineStream): Promise<OfflineRecognizerResult>
  }

  export interface SpeechSegment {
    start: number
    samples: Float32Array
  }

  export class Vad {
    constructor(config: unknown, bufferSizeInSeconds: number)
    acceptWaveform(samples: Float32Array): void
    isEmpty(): boolean
    pop(): void
    clear(): void
    front(enableExternalBuffer?: boolean): SpeechSegment
  }

  export class CircularBuffer {
    constructor(capacity: number)
    push(samples: Float32Array): void
    get(startIndex: number, sampleCount: number, enableExternalBuffer?: boolean): Float32Array
    pop(sampleCount: number): void
    size(): number
    head(): number
  }

  export class LinearResampler {
    constructor(inputSampleRate: number, outputSampleRate: number)
    resample(samples: Float32Array): Float32Array
  }

  export interface GeneratedAudio {
    samples: Float32Array
    sampleRate: number
  }

  export class GenerationConfig {
    constructor(config: { sid: number; speed: number; silenceScale: number })
  }

  export class OfflineTts {
    static createAsync(config: unknown): Promise<OfflineTts>
    generateAsync(config: {
      text: string
      enableExternalBuffer: boolean
      generationConfig: GenerationConfig
      onProgress: () => boolean
    }): Promise<GeneratedAudio>
  }
}
