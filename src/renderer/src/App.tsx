import React, { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Info,
  LibraryBig,
  MessageCircleMore,
  Monitor,
  Moon,
  Settings,
  Sun
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { SendEnum } from '@src/type/ipc-constants'
import SelectionTranslator from '@renderer/components/SelectionTranslator'
import UpdateDialog from '@renderer/components/UpdateDialog'
import { ThemeMode } from '@renderer/components/ThemeProvider'
import { AppSettingsProvider, useAppSettings } from '@renderer/contexts/AppSettingsContext'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import appLogo from '@renderer/assets/logo.png'

/** 顶栏主工作区导航项 */
const WORKSPACE_NAV_ITEMS = [
  { path: '/home', label: '翻译台', icon: BookOpen },
  { path: '/conversation', label: '对话练习', icon: MessageCircleMore },
  { path: '/collection', label: '学习收藏', icon: LibraryBig }
] as const

/** 支持选区划词翻译的内容页面路径 */
const TRANSLATABLE_PATHS = new Set(['/home', '/conversation', '/collection'])

/** 主题循环切换顺序 */
const NEXT_THEME_MAP: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system'
}

/** 主题展示文案与图标映射 */
const THEME_META_MAP: Record<ThemeMode, { label: string; icon: typeof Monitor }> = {
  system: { label: '主题：跟随系统（点击切换）', icon: Monitor },
  light: { label: '主题：浅色（点击切换）', icon: Sun },
  dark: { label: '主题：深色（点击切换）', icon: Moon }
}

/**
 * 渲染融合标题栏与顶栏工作区外壳
 * @returns {React.JSX.Element} 主应用壳体
 */
function AppShell(): React.JSX.Element {
  // 路由导航方法
  const navigate = useNavigate()
  // 当前路由位置
  const location = useLocation()
  // 全局共享模型与设置
  const { activeModel } = useAppSettings()
  // 当前主题状态与切换器
  const { theme, setTheme } = useTheme()
  // 归一化后的当前路径
  const activePath = location.pathname === '/' ? '/home' : location.pathname
  // 当前内容区是否启用划词翻译
  const enablesSelectionTranslator = TRANSLATABLE_PATHS.has(activePath)
  // 当前模型简称
  const activeModelLabel = activeModel?.displayName || activeModel?.model || '未选择模型'
  // 当前主题配置
  const currentTheme = ((theme || 'system') in THEME_META_MAP ? theme : 'system') as ThemeMode
  // 当前主题元信息
  const currentThemeMeta = THEME_META_MAP[currentTheme]
  // 当前主题图标
  const ThemeIcon = currentThemeMeta.icon

  /** 首次加载时检查应用更新 */
  useEffect(() => {
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
    }
  }, [])

  /** 切换浅色/深色/跟随系统主题 */
  const handleCycleTheme = (): void => {
    setTheme(NEXT_THEME_MAP[currentTheme])
  }

  return (
    <div className="app-shell flex h-dvh w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="titlebar-drag grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border bg-shell pl-4 pr-[144px] text-shell-foreground">
        <button
          className="titlebar-no-drag flex shrink-0 cursor-pointer items-center gap-2 justify-self-start rounded-md px-1.5 py-1 transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
          onClick={() => navigate('/home')}
          title="Bai_Ze · 从看懂到开口"
          type="button"
        >
          <img
            alt="Bai_Ze Logo"
            className="size-7 shrink-0 select-none object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]"
            draggable={false}
            src={appLogo}
          />
          <span className="font-display text-lg tracking-[-0.02em] text-foreground">
            Bai_Ze
          </span>
        </button>

        <nav
          aria-label="主导航"
          className="titlebar-no-drag flex items-center gap-0.5 justify-self-center rounded-lg border border-border/80 bg-background/75 p-0.5"
        >
          {WORKSPACE_NAV_ITEMS.map((item) => {
            const NavigationIcon = item.icon
            const isActive = activePath === item.path
            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-7.5 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
                  isActive
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'
                )}
                key={item.path}
                onClick={() => navigate(item.path)}
                type="button"
              >
                <NavigationIcon
                  className={cn(isActive ? 'text-foreground' : 'text-muted-foreground')}
                  size={14}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="titlebar-no-drag flex shrink-0 items-center gap-1.5 justify-self-end">
          <UpdateDialog />

          <button
            className="hidden h-7.5 max-w-36 cursor-pointer items-center gap-2 rounded-md border border-border/80 bg-card/75 px-2.5 text-xs text-muted-foreground transition-colors hover:border-input hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 md:flex"
            onClick={() => navigate('/setting?tab=model')}
            title={`当前引擎：${activeModelLabel}（点击配置模型）`}
            type="button"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                activeModel ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-500'
              )}
            />
            <span className="truncate">{activeModelLabel}</span>
          </button>

          <span aria-hidden="true" className="mx-0.5 hidden h-4 w-px bg-border md:block" />

          <Button
            aria-label={currentThemeMeta.label}
            className="size-7.5 cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={handleCycleTheme}
            size="icon"
            title={currentThemeMeta.label}
            variant="ghost"
          >
            <ThemeIcon size={15} />
          </Button>

          <Button
            aria-current={activePath === '/setting' ? 'page' : undefined}
            aria-label="设置"
            className={cn(
              'size-7.5 cursor-pointer text-muted-foreground hover:text-foreground',
              activePath === '/setting' && 'bg-card text-foreground shadow-xs'
            )}
            onClick={() => navigate('/setting')}
            size="icon"
            title="设置"
            variant="ghost"
          >
            <Settings size={15} />
          </Button>

          <Button
            aria-current={activePath === '/about' ? 'page' : undefined}
            aria-label="关于 Bai_Ze"
            className={cn(
              'size-7.5 cursor-pointer text-muted-foreground hover:text-foreground',
              activePath === '/about' && 'bg-card text-foreground shadow-xs'
            )}
            onClick={() => navigate('/about')}
            size="icon"
            title="关于 Bai_Ze"
            variant="ghost"
          >
            <Info size={15} />
          </Button>
        </div>
      </header>

      <main
        className={cn(
          'min-h-0 min-w-0 flex-1 overflow-x-hidden bg-background',
          activePath === '/conversation'
            ? 'overflow-y-hidden'
            : activePath === '/home'
              ? 'overflow-y-auto min-[780px]:overflow-y-hidden'
              : 'custom-scrollbar overflow-y-auto'
        )}
      >
        {enablesSelectionTranslator ? (
          <SelectionTranslator
            className={cn(
              activePath === '/conversation' && 'h-full min-h-0',
              activePath === '/home' && 'min-[780px]:h-full min-[780px]:min-h-0'
            )}
          >
            <Outlet />
          </SelectionTranslator>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  )
}

/**
 * 渲染 Bai_Ze 主窗口工作台
 * @returns {React.JSX.Element} 应用外壳
 */
function App(): React.JSX.Element {
  return (
    <AppSettingsProvider>
      <AppShell />
    </AppSettingsProvider>
  )
}

export default App
