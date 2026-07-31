declare module '@langchain/google-genai' {
  export class ChatGoogleGenerativeAI {
    constructor(config: { apiKey: string; model: string })
    invoke(input: string): Promise<{ content: unknown }>
  }
}

declare module '@langchain/openai' {
  export class ChatOpenAI {
    constructor(config: {
      apiKey: string;
      model: string;
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
