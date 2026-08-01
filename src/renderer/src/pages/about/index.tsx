import React, { useEffect, useState } from 'react'
import { ExternalLink, Github, RefreshCw, ScanLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { SendEnum } from '@src/type/ipc-constants'
import type { UpdateCheckCompleteResult } from '@src/type/update'

/**
 * 渲染产品信息与更新入口
 * @returns {React.JSX.Element} 关于页面
 */
export default function AboutPage(): React.JSX.Element {
  // 当前应用版本
  const [appVersion, setAppVersion] = useState('')
  // 是否正在检查更新
  const [isUpdating, setIsUpdating] = useState(false)

  /**
   * 检查应用更新
   * @returns {void} 无返回值
   */
  const handleCheckUpdate = (): void => {
    setIsUpdating(true)
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
  }

  /**
   * 打开项目地址
   * @returns {void} 无返回值
   */
  const handleOpenRepository = (): void => {
    window.electron.ipcRenderer.send(
      SendEnum.OPEN_EXTERNAL_URL,
      'https://github.com/lzt-T/screenshot-translation'
    )
  }

  /** 加载版本并监听更新结果 */
  useEffect(() => {
    window.electron.ipcRenderer.invoke(SendEnum.GET_APP_VERSION).then((version) => {
      setAppVersion(version)
    })

    // 检查完成事件的注销方法
    const removeCheckUpdateCompleteListener = window.electron.ipcRenderer.on(
      SendEnum.CHECK_UPDATE_COMPLETE,
      (_event, data: UpdateCheckCompleteResult) => {
        // 更新检查结果
        const { isUpdateAvailable, errorMessage } = data
        if (!isUpdateAvailable && !errorMessage) {
          toast.success('当前已是最新版本')
        }
        setIsUpdating(false)
      }
    )

    return () => {
      removeCheckUpdateCompleteListener()
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-10 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex min-h-72 flex-col justify-between rounded-2xl bg-foreground p-7 text-background">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ScanLine size={24} />
          </div>
          <div>
            <h1 className="font-display text-5xl tracking-[-0.04em]">Bai_Ze</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-background/70">
              让屏幕上的陌生文字就地变得清晰。截图、识别、翻译，不打断当前工作。
            </p>
            <p className="mt-5 font-mono text-xs text-background/55">VERSION {appVersion || '—'}</p>
          </div>
        </section>

        <section className="lab-panel divide-y divide-border self-start overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">检查更新</p>
              <p className="mt-1 text-xs text-muted-foreground">获取最新功能与修复。</p>
            </div>
            <Button disabled={isUpdating} onClick={handleCheckUpdate} variant="outline">
              <RefreshCw size={15} className={isUpdating ? 'animate-spin' : ''} />
              {isUpdating ? '检查中' : '检查'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <Github size={18} />
              <div>
                <p className="text-sm font-medium">开源仓库</p>
                <p className="mt-1 text-xs text-muted-foreground">查看源码与提交问题。</p>
              </div>
            </div>
            <Button aria-label="打开 GitHub 仓库" onClick={handleOpenRepository} size="icon" variant="ghost">
              <ExternalLink size={16} />
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
