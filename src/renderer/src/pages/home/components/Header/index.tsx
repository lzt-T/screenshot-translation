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
    <header className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">截图翻译</h2>
        <p className="mt-1 max-w-[58ch] text-sm leading-6 text-muted-foreground">
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
          className="h-10 cursor-pointer px-4"
          onClick={onScreenshot}
        >
          <ScanLine size={17} />
          开始截图
        </Button>
      </div>
    </header>
  )
}
