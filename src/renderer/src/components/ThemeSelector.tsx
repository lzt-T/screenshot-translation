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
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="界面主题">
      {THEME_OPTIONS.map((option) => {
        // 当前选项图标
        const ThemeIcon = option.icon
        // 当前选项是否激活
        const isActive = activeTheme === option.value

        return (
          <button
            aria-checked={isActive}
            className={cn(
              'flex min-h-20 cursor-pointer flex-col items-start justify-between rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
              isActive
                ? 'border-primary bg-primary/8 text-foreground shadow-[0_8px_24px_-18px_var(--action-shadow)]'
                : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:bg-accent/55'
            )}
            key={option.value}
            onClick={() => setTheme(option.value)}
            role="radio"
            type="button"
          >
            <ThemeIcon size={17} />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
