import React from 'react'
import { Button } from '@renderer/components/ui/button'
import { Languages, Camera } from 'lucide-react'

interface HeaderProps {
  onScreenshot: () => void
}

export default function Header({ onScreenshot }: HeaderProps) {
  return (
    <div className="w-full max-w-3xl mb-4">
      <div className="flex flex-col items-center mb-3">
        <div className="flex items-center justify-center mb-3 text-primary">
          <Languages size={32} className="mr-2" />
          <Camera size={28} />
        </div>
        <p className="text-sm text-muted-foreground">截取屏幕内容，即时翻译</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          className="w-full sm:w-auto cursor-pointer bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"
          size="lg"
          onClick={onScreenshot}
        >
          开始截图
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 sm:mt-0">
          <span>或按</span>
          <kbd className="px-2 py-1 bg-muted rounded border border-border shadow-sm text-xs font-mono">
            F2
          </kbd>
          <span>快捷键</span>
        </div>
      </div>
    </div>
  )
}
