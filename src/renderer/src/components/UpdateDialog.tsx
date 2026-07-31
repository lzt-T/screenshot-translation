import React, { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { SendEnum } from '@src/type/ipc-constants'
import { UpdateProgress } from '@src/type/update'

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
    window.electron.ipcRenderer.on(SendEnum.DOWNLOAD_FAIL, () => {
      setIsUpdating(false)
    })

    window.electron.ipcRenderer.on(SendEnum.UPDATE_DOWNLOAD_COMPLETE, () => {
      setUpdateData({
        total: 100,
        delta: 100,
        transferred: 100,
        percent: 100,
        bytesPerSecond: 100
      })
      setIsUpdating(false)
      setIsDownloadComplete(true)
    })

    window.electron.ipcRenderer.on(SendEnum.DOWNLOAD_PROGRESS, (_event, progressInfo) => {
      setIsUpdating(true)
      setUpdateData(progressInfo)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DOWNLOAD_PROGRESS)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.UPDATE_DOWNLOAD_COMPLETE)
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
    <div className="flex items-center gap-2 px-2">
      <Progress value={updateData?.percent} />
      <span className="font-mono text-[10px] text-muted-foreground">
        {Math.floor(updateData?.percent || 0)}%
      </span>
    </div>
  )
}
