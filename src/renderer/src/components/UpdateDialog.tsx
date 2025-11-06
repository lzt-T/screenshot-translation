import { Button } from '@renderer/components/ui/button'
import { useEffect, useState } from 'react'
import { SendEnum } from '../../../type/ipc-constants'
import { UpdateProgress } from '../../../type/update'
import { Progress } from '@renderer/components/ui/progress'

export default function UpdateDialog() {
  const [updateData, setUpdateData] = useState<UpdateProgress | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  /* 是否下载完成 */
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)

  /* 重启 */
  const onRestart = () => {
    window.electron.ipcRenderer.send(SendEnum.RESTART_UPDATE_AND_INSTALL)
  }

  useEffect(() => {
    // 监听更新失败
    window.electron.ipcRenderer.on(SendEnum.DOWNLOAD_FAIL, (_event) => {
      setIsUpdating(false)
    })

    // 监听更新下载完成
    window.electron.ipcRenderer.on(SendEnum.UPDATE_DOWNLOAD_COMPLETE, (_event) => {
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
    // 监听下载进度
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

  return (
    <div>
      {isDownloadComplete ? (
        <div className="flex flex-col items-center justify-center shadow-lg p-4 rounded-md bg-slate-50">
          更新完成，是否重启安装新版本?
          <Button className="w-full mt-4 cursor-pointer" onClick={onRestart}>
            重启
          </Button>
        </div>
      ) : (
        <div className="flex items-center">
          <Progress value={updateData?.percent} />
          <span className="text-sm text-slate-700 ml-2">
            {Math.floor(updateData?.percent || 0)}%
          </span>
        </div>
      )}
    </div>
  )
}
