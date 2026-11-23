import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { SendEnum } from '@src/type/ipc-constants'
import type { UpdateAvailableInfo, UpdateProgress } from '@src/type/update'

/**
 * 渲染顶栏紧凑更新进度或重启安装按钮
 * @returns {React.JSX.Element | null} 更新状态节点
 */
export default function UpdateDialog(): React.JSX.Element | null {
  // 当前更新进度
  const [updateData, setUpdateData] = useState<UpdateProgress | null>(null)
  // 是否正在下载更新
  const [isUpdating, setIsUpdating] = useState(false)
  // 是否下载完成
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)

  /** 重启并安装更新 */
  const handleRestart = (): void => {
    window.electron.ipcRenderer.send(SendEnum.RESTART_UPDATE_AND_INSTALL)
  }

  /** 监听更新进度与完成状态 */
  useEffect(() => {
    const removeUpdateAvailableListener = window.electron.ipcRenderer.on(
      SendEnum.UPDATE_AVAILABLE,
      (_event, updateInfo: UpdateAvailableInfo) => {
        setUpdateData(null)
        setIsUpdating(true)
        setIsDownloadComplete(false)
        toast.info(`发现新版本 ${updateInfo.version}，正在下载`)
      }
    )

    const removeDownloadFailListener = window.electron.ipcRenderer.on(
      SendEnum.DOWNLOAD_FAIL,
      (_event, errorMessage: string) => {
        setUpdateData(null)
        setIsUpdating(false)
        setIsDownloadComplete(false)
        toast.error('更新下载失败', {
          description: errorMessage || '请检查网络连接后重试'
        })
      }
    )

    const removeDownloadCompleteListener = window.electron.ipcRenderer.on(
      SendEnum.UPDATE_DOWNLOAD_COMPLETE,
      () => {
        setUpdateData({
          total: 100,
          delta: 100,
          transferred: 100,
          percent: 100,
          bytesPerSecond: 100
        })
        setIsUpdating(false)
        setIsDownloadComplete(true)
      }
    )

    const removeDownloadProgressListener = window.electron.ipcRenderer.on(
      SendEnum.DOWNLOAD_PROGRESS,
      (_event, progressInfo: UpdateProgress) => {
        setIsUpdating(true)
        setUpdateData(progressInfo)
      }
    )

    return () => {
      removeUpdateAvailableListener()
      removeDownloadFailListener()
      removeDownloadCompleteListener()
      removeDownloadProgressListener()
    }
  }, [])

  if (!isUpdating && !isDownloadComplete) {
    return null
  }

  if (isDownloadComplete) {
    return (
      <Button
        className="h-7 cursor-pointer rounded-md px-2.5 text-xs"
        onClick={handleRestart}
        size="sm"
        title="新版本已准备就绪，点击重启安装"
      >
        <RefreshCw size={13} />
        重启安装
      </Button>
    )
  }

  return (
    <div
      aria-live="polite"
      className="flex items-center gap-2 rounded-md border border-border bg-card/85 px-2.5 py-1"
      role="status"
      title="正在下载新版本"
    >
      <Progress className="w-14" value={updateData?.percent} />
      <span className="font-mono text-xs text-muted-foreground">
        {Math.floor(updateData?.percent || 0)}%
      </span>
    </div>
  )
}
