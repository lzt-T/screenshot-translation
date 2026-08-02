import React from 'react'
import { ScanLine } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

/** 首页头部属性 */
interface HeaderProps {
  /* 截图回调 */
  onScreenshot: () => void
}

/**
 * 渲染截图翻译主操作区
 * @param {HeaderProps} props 组件属性
 * @returns {React.JSX.Element} 主操作区
 */
export default function Header({ onScreenshot }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex w-full flex-col gap-6 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-xl">
        <h2 className="font-display text-4xl tracking-[-0.03em] text-foreground">截图翻译</h2>
        <p className="mt-3 max-w-[58ch] text-sm leading-6 text-muted-foreground">
          按 F2 或点击「开始截图」，框选屏幕区域后自动识别并翻译。
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span>快捷键</span>
          <kbd className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground">
            F2
          </kbd>
        </div>
        <Button
          className="h-11 cursor-pointer rounded-xl px-5 shadow-[0_10px_24px_-16px_var(--action-shadow)] active:translate-y-px"
          onClick={onScreenshot}
          size="lg"
        >
          <ScanLine size={18} />
          开始截图
        </Button>
      </div>
    </header>
  )
}
