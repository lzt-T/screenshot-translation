import React, { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

/** 就地反馈复制按钮属性 */
interface CopyIconButtonProps {
  /** 复制成功提示与执行回调 */
  onCopy: () => void
  /** 按钮无障碍名称 */
  ariaLabel: string
  /** 悬浮提示文案 */
  title?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 额外样式类名 */
  className?: string
  /** 图标大小 */
  iconSize?: number
}

/**
 * 渲染点击后原地切换为对勾反馈的复制图标按钮
 * @param props 按钮属性
 * @returns 复制图标按钮
 */
export default function CopyIconButton({
  onCopy,
  ariaLabel,
  title,
  disabled = false,
  className,
  iconSize = 14
}: CopyIconButtonProps): React.JSX.Element {
  // 是否处于已复制反馈状态
  const [isCopied, setIsCopied] = useState(false)
  // 反馈恢复定时器
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  /** 执行复制并触发原地成功态 */
  const handleClick = (): void => {
    onCopy()
    setIsCopied(true)
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = window.setTimeout(() => {
      setIsCopied(false)
      resetTimerRef.current = null
    }, 1500)
  }

  return (
    <Button
      aria-label={isCopied ? '已复制' : ariaLabel}
      className={cn(
        'size-7.5 cursor-pointer',
        disabled && 'cursor-not-allowed',
        isCopied && 'text-emerald-600 dark:text-emerald-400',
        className
      )}
      disabled={disabled}
      onClick={handleClick}
      size="icon"
      title={isCopied ? '已复制' : title || ariaLabel}
      type="button"
      variant="ghost"
    >
      {isCopied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
    </Button>
  )
}
