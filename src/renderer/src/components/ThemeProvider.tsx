import React, { useEffect } from 'react'
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes'
import { SendEnum } from '@src/type/ipc-constants'

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
 * 将解析后的明暗主题同步给主窗口原生标题栏控件
 * @returns {null} 无渲染节点
 */
function WindowThemeSynchronizer(): null {
  // 当前生效的主题（light / dark）
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') {
      return
    }
    window.electron?.ipcRenderer?.send(SendEnum.SYNC_WINDOW_THEME, resolvedTheme)
  }, [resolvedTheme])

  return null
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
      <WindowThemeSynchronizer />
      {children}
    </NextThemeProvider>
  )
}
