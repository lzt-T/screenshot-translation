import React, { useEffect, useState } from 'react'
import { ArrowDown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@renderer/components/ui/button'
import { SendEnum } from '@src/type/ipc-constants'
import type { UpdateAvailableInfo, UpdateProgress } from '@src/type/update'

// 更新组件所处阶段
type UpdatePhase = 'idle' | 'downloading' | 'ready'

// 环形进度条画布尺寸
const RING_SIZE = 20
// 环形进度条圆心坐标
const RING_CENTER = 10
// 环形进度条半径
const RING_RADIUS = 8
// 环形进度条描边宽度
const RING_STROKE_WIDTH = 2
// 环形进度条周长
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** 通知主进程重启并安装更新 */
function restartAndInstall(): void {
  window.electron.ipcRenderer.send(SendEnum.RESTART_UPDATE_AND_INSTALL)
}

/**
 * 渲染顶栏环形更新进度与重启安装图标按钮
 * @returns {React.JSX.Element | null} 更新状态节点
 */
export default function UpdateDialog(): React.JSX.Element | null {
  // 当前更新阶段
  const [phase, setPhase] = useState<UpdatePhase>('idle')
  // 当前下载百分比
  const [progressPercent, setProgressPercent] = useState(0)
  // 正在更新的目标版本号
  const [version, setVersion] = useState('')

  // 归一化到 0~100 的整数进度百分比
  const clampedPercent = Math.min(100, Math.max(0, Math.floor(progressPercent)))
  // 环形进度条当前描边偏移量
  const ringOffset = RING_CIRCUMFERENCE * (1 - clampedPercent / 100)
  // 拼接版本号后缀
  const versionSuffix = version ? ` v${version}` : ''
  // 下载中无障碍与悬停提示文案
  const downloadingLabel = `正在下载新版本${versionSuffix}（${clampedPercent}%）`
  // 就绪态无障碍与悬停提示文案
  const readyLabel = `新版本${versionSuffix}已就绪，点击重启安装`

  /** 监听主进程更新状态与下载进度 */
  useEffect(() => {
    const removeUpdateAvailableListener = window.electron.ipcRenderer.on(
      SendEnum.UPDATE_AVAILABLE,
      (_event, updateInfo: UpdateAvailableInfo) => {
        setVersion(updateInfo.version)
        setProgressPercent(0)
        setPhase('downloading')
        toast.info(`发现新版本 ${updateInfo.version}，正在下载`)
      }
    )

    const removeDownloadProgressListener = window.electron.ipcRenderer.on(
      SendEnum.DOWNLOAD_PROGRESS,
      (_event, progressInfo: UpdateProgress) => {
        setPhase('downloading')
        setProgressPercent(progressInfo.percent || 0)
      }
    )

    const removeDownloadCompleteListener = window.electron.ipcRenderer.on(
      SendEnum.UPDATE_DOWNLOAD_COMPLETE,
      () => {
        setProgressPercent(100)
        setPhase('ready')
        toast.info('新版本已准备就绪', {
          description: '重启应用即可完成安装',
          duration: 6000,
          action: {
            label: '重启安装',
            onClick: restartAndInstall
          }
        })
      }
    )

    const removeDownloadFailListener = window.electron.ipcRenderer.on(
      SendEnum.DOWNLOAD_FAIL,
      (_event, errorMessage: string) => {
        setPhase('idle')
        setProgressPercent(0)
        setVersion('')
        toast.error('更新下载失败', {
          description: errorMessage || '请检查网络连接后重试'
        })
      }
    )

    return () => {
      removeUpdateAvailableListener()
      removeDownloadProgressListener()
      removeDownloadCompleteListener()
      removeDownloadFailListener()
    }
  }, [])

  if (phase === 'idle') {
    return null
  }

  if (phase === 'ready') {
    return (
      <Button
        aria-label={readyLabel}
        className="size-7.5 shrink-0 cursor-pointer rounded-md shadow-xs"
        onClick={restartAndInstall}
        size="icon"
        title={readyLabel}
      >
        <RefreshCw size={14} />
      </Button>
    )
  }

  return (
    <div
      aria-label={downloadingLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clampedPercent}
      className="relative inline-flex size-7.5 shrink-0 items-center justify-center rounded-md text-foreground"
      role="progressbar"
      title={downloadingLabel}
    >
      <svg className="-rotate-90" height={RING_SIZE} viewBox="0 0 20 20" width={RING_SIZE}>
        <circle
          className="text-foreground/15"
          cx={RING_CENTER}
          cy={RING_CENTER}
          fill="none"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth={RING_STROKE_WIDTH}
        />
        <circle
          className="text-primary transition-[stroke-dashoffset] duration-300 ease-out"
          cx={RING_CENTER}
          cy={RING_CENTER}
          fill="none"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={ringOffset}
          strokeLinecap="round"
          strokeWidth={RING_STROKE_WIDTH}
        />
      </svg>
      <ArrowDown
        aria-hidden="true"
        className="pointer-events-none absolute text-foreground/80"
        size={10}
        strokeWidth={2.2}
      />
    </div>
  )
}
