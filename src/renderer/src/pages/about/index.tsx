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
    <div className="mx-auto max-w-[1180px] px-5 py-5 lg:px-7 lg:py-6">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">关于</h1>
        <p className="mt-1 text-sm text-muted-foreground">产品信息、版本与项目入口。</p>
      </header>

      <section className="lab-panel mt-5 max-w-3xl overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border px-5 py-5">
          <div className="brand-aperture flex size-10 shrink-0 items-center justify-center rounded-lg">
            <ScanLine size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">Bai Ze</h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                VERSION {appVersion || '--'}
              </p>
            </div>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              从看懂到开口，让英语学习自然融入日常。截图翻译、句子分析、口语陪练，一处完成。
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-medium">检查更新</p>
            <p className="mt-1 text-xs text-muted-foreground">获取最新功能与修复。</p>
          </div>
          <Button disabled={isUpdating} onClick={handleCheckUpdate} size="sm" variant="outline">
            <RefreshCw size={15} className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? '检查中' : '检查'}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Github className="text-muted-foreground" size={18} />
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
  )
}
