import React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@renderer/lib/utils'
import { ThemeMode } from '@renderer/components/ThemeProvider'

/** 主题选项配置 */
const THEME_OPTIONS: ReadonlyArray<{
  value: ThemeMode
  label: string
  icon: React.ComponentType<{ size?: number }>
}> = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon }
]

/**
 * 渲染主题模式分发表
 * @returns {React.JSX.Element} 主题选择控件
 */
export default function ThemeSelector(): React.JSX.Element {
  // 当前主题与主题更新方法
  const { theme, setTheme } = useTheme()
  // 当前有效的主题模式
  const activeTheme = (theme || 'system') as ThemeMode

  return (
    <div
      className="flex w-full rounded-lg border border-border bg-muted/70 p-1 sm:w-auto"
      role="radiogroup"
      aria-label="界面主题"
    >
      {THEME_OPTIONS.map((option) => {
        // 当前选项图标
        const ThemeIcon = option.icon
        // 当前选项是否激活
        const isActive = activeTheme === option.value

        return (
          <button
            aria-checked={isActive}
            className={cn(
              'flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-none',
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card/55 hover:text-foreground'
            )}
            key={option.value}
            onClick={() => setTheme(option.value)}
            role="radio"
            type="button"
          >
            <ThemeIcon size={14} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
