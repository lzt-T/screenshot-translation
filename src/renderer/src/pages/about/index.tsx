import React, { useEffect, useState } from 'react'
import { ExternalLink, Github, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import appLogo from '@renderer/assets/logo.png'
import { SendEnum } from '@src/type/ipc-constants'
import type { UpdateCheckCompleteResult } from '@src/type/update'

/**
 * 渲染产品信息与更新入口
 * @returns {React.JSX.Element} 关于页面
 */
export default function AboutPage(): React.JSX.Element {
  const [appVersion, setAppVersion] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  /** 检查应用更新 */
  const handleCheckUpdate = (): void => {
    setIsUpdating(true)
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
  }

  /** 打开项目地址 */
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

    const removeCheckUpdateCompleteListener = window.electron.ipcRenderer.on(
      SendEnum.CHECK_UPDATE_COMPLETE,
      (_event, data: UpdateCheckCompleteResult) => {
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
    <div className="mx-auto max-w-3xl px-5 py-4 lg:px-7 lg:py-5">
      <h1 className="sr-only">关于 Bai_Ze</h1>

      <section className="lexicon-sheet overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center">
          <img
            alt="Bai_Ze Logo"
            className="size-11 shrink-0 select-none object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            draggable={false}
            src={appLogo}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
                  Bai_Ze
                </h2>
                <span className="text-xs text-muted-foreground">The Enlightened Beast</span>
              </div>
              <Badge className="font-mono" variant="secondary">
                v{appVersion || '--'}
              </Badge>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              从看懂到开口，让英语学习自然融入桌面日常。截图取词、对页翻译、句法边注与 AI 口语陪练，一处完成。
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="shrink-0 text-muted-foreground" size={18} />
              <div>
                <p className="text-sm font-medium text-foreground">检查更新</p>
                <p className="mt-0.5 text-xs text-muted-foreground">获取最新功能改进与体验优化。</p>
              </div>
            </div>
            <Button
              className="cursor-pointer"
              disabled={isUpdating}
              onClick={handleCheckUpdate}
              size="sm"
              variant="outline"
            >
              <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
              {isUpdating ? '检查中' : '检查更新'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <Github className="shrink-0 text-muted-foreground" size={18} />
              <div>
                <p className="text-sm font-medium text-foreground">开源仓库</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  查看源码、更新日志与反馈建议。
                </p>
              </div>
            </div>
            <Button
              aria-label="打开 GitHub 仓库"
              className="cursor-pointer"
              onClick={handleOpenRepository}
              size="sm"
              variant="ghost"
            >
              <span>访问仓库</span>
              <ExternalLink size={14} />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
