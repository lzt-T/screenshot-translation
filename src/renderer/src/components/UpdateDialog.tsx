import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { SendEnum } from '@src/type/ipc-constants'
import type { UpdateAvailableInfo, UpdateProgress } from '@src/type/update'

/**
 * 渲染侧栏更新进度与重启操作
 * @returns {React.JSX.Element | null} 更新状态节点
 */
export default function UpdateDialog(): React.JSX.Element | null {
  // 当前更新进度
  const [updateData, setUpdateData] = useState<UpdateProgress | null>(null)
  // 是否正在下载更新
  const [isUpdating, setIsUpdating] = useState(false)
  // 是否下载完成
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)

  /**
   * 重启并安装更新
   * @returns {void} 无返回值
   */
  const handleRestart = (): void => {
    window.electron.ipcRenderer.send(SendEnum.RESTART_UPDATE_AND_INSTALL)
  }

  /** 监听更新进度与完成状态 */
  useEffect(() => {
    // 可用更新事件的注销方法
    const removeUpdateAvailableListener = window.electron.ipcRenderer.on(
      SendEnum.UPDATE_AVAILABLE,
      (_event, updateInfo: UpdateAvailableInfo) => {
        setUpdateData(null)
        setIsUpdating(true)
        setIsDownloadComplete(false)
        toast.info(`发现新版本 ${updateInfo.version}，正在下载`)
      }
    )

    // 下载失败事件的注销方法
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

    // 下载完成事件的注销方法
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

    // 下载进度事件的注销方法
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
      <div className="rounded-xl border border-border bg-card p-3 text-xs text-card-foreground">
        <p className="leading-5">更新已下载，可以立即重启安装。</p>
        <Button className="mt-3 w-full cursor-pointer" onClick={handleRestart} size="sm">
          重启安装
        </Button>
      </div>
    )
  }

  return (
    <div aria-live="polite" className="flex items-center gap-2 px-2">
      <Progress value={updateData?.percent} />
      <span className="font-mono text-[10px] text-muted-foreground">
        {Math.floor(updateData?.percent || 0)}%
      </span>
    </div>
  )
}
