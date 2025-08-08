import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { useEffect, useState } from 'react'
import { SendEnum } from '../../../type/ipc-constants'
import { UpdateProgress } from '../../../type/update'
import { Progress } from '@renderer/components/ui/progress'

export default function UpdateDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [updateData, setUpdateData] = useState<UpdateProgress | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  /* 立即下载 */
  const onDownload = () => {
    window.electron.ipcRenderer.send(SendEnum.DOWNLOAD_UPDATE)

    setIsUpdating(true)

    const updateProgress = () => {
      requestAnimationFrame(async () => {
        const progressInfo = await window.electron.ipcRenderer.invoke(SendEnum.DOWNLOAD_PROGRESS)
        setUpdateData(progressInfo)
        if (progressInfo.percent === 100) {
          setIsUpdating(false)
          return
        }
        updateProgress()
      })
    }
    updateProgress()
  }

  /* 下次再说 */
  const onNextTime = () => {
    setIsOpen(false)
  }

  /* 监听更新结果 */
  useEffect(() => {
    window.electron.ipcRenderer.on(SendEnum.CHECK_UPDATE_RESULT, (_event, result) => {
      const { isUpdateAvailable, versionInfo } = result
      if (isUpdateAvailable) {
        setUpdateData(versionInfo)
        setIsOpen(true)
      }
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_RESULT)
    }
  }, [])

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-slate-50" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold text-slate-800">
            更新提示
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
