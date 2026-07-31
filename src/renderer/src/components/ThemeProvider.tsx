import React from 'react'
import { ThemeProvider as NextThemeProvider } from 'next-themes'

/** 可选主题模式 */
export type ThemeMode = 'system' | 'light' | 'dark'

/** 主题持久化键 */
export const THEME_STORAGE_KEY = 'bai-ze-theme'

/** 主题提供器属性 */
interface ThemeProviderProps {
  /* 子节点 */
  children: React.ReactNode
}

/**
 * 为所有 Electron 渲染窗口提供一致主题
 * @param {ThemeProviderProps} props 组件属性
 * @returns {React.JSX.Element} 主题上下文节点
 */
export default function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemeProvider>
  )
}
