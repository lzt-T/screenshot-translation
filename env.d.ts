/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_GML_FREE_API_KEY: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
