import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { useCallback, useEffect, useState } from 'react'
import { SendEnum } from '../../../type/ipc-constants'
import { UpdateProgress } from '../../../type/update'
import { Progress } from '@renderer/components/ui/progress'
import { X } from 'lucide-react'

export default function UpdateDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [updateData, setUpdateData] = useState<UpdateProgress | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  /* 立即下载 */
  const onDownload = () => {
    setIsUpdating(true)
    window.electron.ipcRenderer.send(SendEnum.DOWNLOAD_UPDATE)
  }

  /* 下次再说 */
  const onNextTime = () => {
    setIsOpen(false)
  }

  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    // 监听检查更新的结果
    window.electron.ipcRenderer.on(SendEnum.CHECK_UPDATE_RESULT, (_event, result) => {
      const { isUpdateAvailable, versionInfo } = result
      if (isUpdateAvailable) {
        setUpdateData(versionInfo)
        setIsOpen(true)
      }
    })

    // 监听更新失败
    window.electron.ipcRenderer.on(SendEnum.DOWNLOAD_FAIL, (_event) => {
      setIsUpdating(false)
      setIsOpen(false)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
    }
  }, [])

  useEffect(() => {
    if (!isUpdating) {
      return
    }

    // 监听下载进度
    window.electron.ipcRenderer.on(SendEnum.DOWNLOAD_PROGRESS, (_event, progressInfo) => {
      setUpdateData(progressInfo)
      if (progressInfo.percent === 100) {
        setIsUpdating(false)
        setIsOpen(false)
      }
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DOWNLOAD_PROGRESS)
    }
  }, [isUpdating])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-slate-50" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-lg font-semibold text-slate-800">
            更新提示
            <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription asChild>
            <div>
              <p className="pt-4 text-base text-slate-700">
                {isUpdating ? '正在下载更新，请稍后...' : '发现新版本，是否需要立即下载?'}
              </p>
              {isUpdating && (
                <div className="flex items-center mt-2 ">
                  <Progress value={updateData?.percent} />
                  <span className="text-sm text-slate-700 ml-2">
                    {Math.floor(updateData?.percent || 0)}%
                  </span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onNextTime} disabled={isUpdating}>
            下次再说
          </Button>
          <Button onClick={onDownload} disabled={isUpdating}>
            {isUpdating ? '正在下载' : '立即下载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
