import { useEffect, useState } from 'react'
import { SendEnum } from '../../../../type/ipc-constants'
import { Button } from '@renderer/components/ui/button'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import img from '@renderer/assets/github.svg'

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
      <h1 className="mb-4 text-2xl font-semibold text-foreground">关于</h1>
      <div className="flex justify-between items-center">
        <p className="text-base text-muted-foreground">
          当前版本: <span className="text-foreground">{appVersion}</span>
        </p>
        <Button
          onClick={onCheckUpdate}
          disabled={isUpdating}
          className={cn('w-[120px]', isUpdating ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {isUpdating ? '检查中...' : '检查更新'}
        </Button>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-1 text-base text-muted-foreground">
          <img src={img} className="w-6 h-6" alt="" />
          地址
        </div>
        <Button
          className="w-[120px] cursor-pointer"
          onClick={() => {
            window.electron.ipcRenderer.send(
              SendEnum.OPEN_EXTERNAL_URL,
              'https://github.com/lzt-T/screenshot-translation'
            )
          }}
        >
          前往
        </Button>
      </div>
    </div>
  )
}
