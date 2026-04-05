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
