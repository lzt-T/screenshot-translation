import React, { useEffect } from 'react';
import { SendEnum } from '@src/type/ipc-constants';
import { Button } from '@renderer/components/ui/button'

export default function Index() {
  const onScreenshot = () => {
    window.electron.ipcRenderer.send(SendEnum.SCREENSHOT_START)
  }

  return (
    // Replace PageContainer with div and Tailwind classes
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      {/* Replace Title with h1 and Tailwind classes */}
      <h1 className="text-3xl font-semibold text-foreground">
        欢迎使用截图翻译
      </h1>
      {/* Replace Description with p and Tailwind classes */}
      <p className="text-base text-muted-foreground">
        快速捕捉屏幕区域并进行翻译。
      </p>
      <Button size="lg" onClick={onScreenshot}>开始截图</Button>
      {/* Replace HintText with p and Tailwind classes */}
      <p className="text-sm text-muted-foreground">
        或者直接按 F2 快捷键
      </p>
    </div>
  )
}