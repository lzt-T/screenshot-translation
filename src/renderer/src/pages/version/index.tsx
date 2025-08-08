import { useEffect, useState } from 'react'
import { SendEnum } from '../../../../type/ipc-constants'
import { Button } from '@renderer/components/ui/button'
import { toast } from 'sonner'

export default function Index() {
  /* 应用版本 */
  const [appVersion, setAppVersion] = useState('')
  /* 是否正在更新 */
  const [isUpdating, setIsUpdating] = useState(false)

  /* 检查更新 */
  const onCheckUpdate = () => {
    setIsUpdating(true)
    window.electron.ipcRenderer.send(SendEnum.CHECK_UPDATE)
  }

  useEffect(() => {
    window.electron.ipcRenderer.invoke(SendEnum.GET_APP_VERSION).then((version) => {
      setAppVersion(version)
    })

    window.electron.ipcRenderer.on(SendEnum.CHECK_UPDATE_COMPLETE, (_event, data) => {
      const { isUpdateAvailable, versionInfo } = data
      if (!isUpdateAvailable) {
        toast.success('当前已是最新版本')
      }
      setIsUpdating(false)
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.CHECK_UPDATE_COMPLETE)
      window.electron.ipcRenderer.removeAllListeners(SendEnum.GET_APP_VERSION)
    }
  }, [])

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">版本信息</h1>
      <div className="flex justify-between items-center">
        <p className="text-base text-muted-foreground">
          应用版本: <span className="text-foreground">{appVersion}</span>
        </p>
        <Button
          onClick={onCheckUpdate}
          disabled={isUpdating}
          className={`${isUpdating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUpdating ? '检查中...' : '检查更新'}
        </Button>
      </div>
    </div>
  )
}
