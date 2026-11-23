import React, { useState } from 'react'
import { Download, LoaderCircle, Trash2, X } from 'lucide-react'
import type {
  LocalModelDownloadMirror,
  LocalModelDownloadSourceSetting,
  LocalModelId,
  LocalModelState,
  LocalModelStatus
} from '@src/type/local-model'
import {
  formatModelBytes,
  LOCAL_MODEL_DEFINITIONS,
  LOCAL_MODEL_IDS,
  LOCAL_MODEL_MIRRORS,
  validateModelDownloadUrl
} from '@src/utils/local-models'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Progress } from '@renderer/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'

/** 本地模型管理区块属性 */
interface LocalModelsSectionProps {
  /** 外部定位容器引用 */
  sectionRef?: React.RefObject<HTMLElement | null>
  /** 是否处于外部定位高亮状态 */
  isHighlighted?: boolean
  /** 各模型实时状态 */
  modelsMap: Record<LocalModelId, LocalModelState>
  /** 是否正在首次读取状态 */
  isLoading: boolean
  /** 当前下载源配置 */
  sourceSetting: LocalModelDownloadSourceSetting
  /** 更新下载源配置 */
  onChangeSourceSetting: (nextSetting: LocalModelDownloadSourceSetting) => void
  /** 下载指定模型 */
  onDownload: (id: LocalModelId) => Promise<void>
  /** 取消下载 */
  onCancel: (id: LocalModelId) => Promise<void>
  /** 删除已安装模型 */
  onRemove: (id: LocalModelId) => Promise<void>
}

/** 各安装状态对应的徽标样式与文案 */
const STATUS_BADGE_MAP: Readonly<
  Record<
    LocalModelStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  >
> = {
  'not-installed': { label: '未下载', variant: 'outline' },
  downloading: { label: '下载中', variant: 'secondary' },
  extracting: { label: '解压校验中', variant: 'secondary' },
  installed: { label: '已就绪', variant: 'default' },
  error: { label: '下载失败', variant: 'destructive' }
}

/**
 * 渲染本地按需下载模型管理与下载源配置区块
 * @param props 区块属性
 * @returns 本地模型管理区块节点
 */
export default function LocalModelsSection({
  sectionRef,
  isHighlighted = false,
  modelsMap,
  isLoading,
  sourceSetting,
  onChangeSourceSetting,
  onDownload,
  onCancel,
  onRemove
}: LocalModelsSectionProps): React.JSX.Element {
  const [pendingDeleteModelId, setPendingDeleteModelId] = useState<LocalModelId | null>(null)
  const currentMirror = LOCAL_MODEL_MIRRORS[sourceSetting.mirror]

  /** 切换下载源模式 */
  function handleMirrorChange(nextMirror: LocalModelDownloadMirror): void {
    onChangeSourceSetting({
      ...sourceSetting,
      mirror: nextMirror
    })
  }

  /** 更新自定义模式下单个模型的下载地址 */
  function handleCustomUrlChange(modelId: LocalModelId, url: string): void {
    onChangeSourceSetting({
      ...sourceSetting,
      customUrls: {
        ...sourceSetting.customUrls,
        [modelId]: url
      }
    })
  }

  /** 确认删除已下载的模型 */
  function handleConfirmRemove(): void {
    if (!pendingDeleteModelId) {
      return
    }
    const targetId = pendingDeleteModelId
    setPendingDeleteModelId(null)
    void onRemove(targetId)
  }

  const pendingDeleteModelName = pendingDeleteModelId
    ? LOCAL_MODEL_DEFINITIONS[pendingDeleteModelId].name
    : ''

  return (
    <section
      aria-labelledby="local-models-title"
      className={`space-y-3 rounded-lg border border-transparent transition-[background-color,border-color,padding] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 ${isHighlighted ? 'border-primary/45 bg-primary/6 p-3' : ''}`}
      id="local-models-section"
      ref={sectionRef}
      tabIndex={-1}
    >
      <div>
        <h2 className="text-base font-semibold text-foreground" id="local-models-title">
          离线语音与识别模型
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Silero VAD（约 0.6 MB）已随应用内置；Kokoro 朗读与 Whisper 识别模型按需下载至用户数据目录，应用更新不会丢失。
        </p>
      </div>

      <div className="lexicon-panel divide-y divide-border overflow-hidden">
        <div className="space-y-3 px-4 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="local-model-mirror">模型下载源</Label>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {currentMirror.description}
              </p>
            </div>
            <Select
              value={sourceSetting.mirror}
              onValueChange={(value) => handleMirrorChange(value as LocalModelDownloadMirror)}
            >
              <SelectTrigger className="w-full cursor-pointer sm:w-70" id="local-model-mirror">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LOCAL_MODEL_MIRRORS).map(([key, item]) => (
                  <SelectItem className="cursor-pointer" key={key} value={key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceSetting.mirror === 'custom' && (
            <div className="grid gap-3 border-t border-border/60 pt-3">
              {LOCAL_MODEL_IDS.map((modelId) => {
                const definition = LOCAL_MODEL_DEFINITIONS[modelId]
                const customUrl = sourceSetting.customUrls[modelId] || ''
                const urlError = customUrl.trim() ? validateModelDownloadUrl(customUrl) : ''
                return (
                  <div className="space-y-1.5" key={modelId}>
                    <Label className="text-xs font-medium" htmlFor={`custom-model-url-${modelId}`}>
                      {definition.name}下载地址
                    </Label>
                    <Input
                      aria-invalid={Boolean(urlError)}
                      id={`custom-model-url-${modelId}`}
                      onChange={(event) => handleCustomUrlChange(modelId, event.target.value)}
                      placeholder={definition.officialUrl}
                      spellCheck={false}
                      value={customUrl}
                    />
                    {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {LOCAL_MODEL_IDS.map((modelId) => {
          const definition = LOCAL_MODEL_DEFINITIONS[modelId]
          const modelState = modelsMap[modelId]
          const isBusy = modelState.status === 'downloading' || modelState.status === 'extracting'
          const badgeConfig =
            modelState.status === 'installed' && modelState.sourceKind === 'bundled-compat'
              ? { label: '已就绪（本地资源）', variant: 'default' as const }
              : STATUS_BADGE_MAP[modelState.status]
          const customUrl = sourceSetting.customUrls[modelId] || ''
          const hasInvalidCustomUrl =
            sourceSetting.mirror === 'custom' &&
            Boolean(customUrl.trim()) &&
            Boolean(validateModelDownloadUrl(customUrl))
          const progressText =
            modelState.status === 'extracting'
              ? '正在解压并校验文件完整性…'
              : modelState.totalBytes > 0
                ? `${formatModelBytes(modelState.downloadedBytes)} / ${formatModelBytes(modelState.totalBytes)}（${modelState.progress}%）`
                : `已下载 ${formatModelBytes(modelState.downloadedBytes)}…`

          return (
            <div className="space-y-2.5 px-4 py-3.5" key={modelId}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{definition.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {definition.sizeLabel}
                    </span>
                    <Badge variant={badgeConfig.variant}>
                      {isBusy && <LoaderCircle className="animate-spin" size={12} />}
                      {badgeConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {definition.description}
                  </p>
                  {modelState.status === 'installed' && modelState.sourceKind === 'bundled-compat' && (
                    <p className="text-xs text-muted-foreground">
                      来自本地 resources 目录，如需切换版本也可直接重新下载至用户目录。
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {(modelState.status === 'not-installed' || modelState.status === 'error') && (
                    <Button
                      className="cursor-pointer"
                      disabled={isLoading || hasInvalidCustomUrl}
                      onClick={() => void onDownload(modelId)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Download size={14} />
                      {modelState.status === 'error' ? '重试' : '下载'}
                    </Button>
                  )}

                  {isBusy && (
                    <Button
                      className="cursor-pointer"
                      onClick={() => void onCancel(modelId)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <X size={14} />
                      取消
                    </Button>
                  )}

                  {modelState.status === 'installed' && modelState.sourceKind === 'user-data' && (
                    <Button
                      className="cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDeleteModelId(modelId)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 size={14} />
                      删除
                    </Button>
                  )}
                </div>
              </div>

              {isBusy && (
                <div className="space-y-1.5">
                  <Progress value={modelState.progress} />
                  <p className="text-xs tabular-nums text-muted-foreground">{progressText}</p>
                </div>
              )}

              {modelState.status === 'error' && modelState.error && (
                <p className="text-xs text-destructive" role="alert">
                  {modelState.error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <Dialog
        open={Boolean(pendingDeleteModelId)}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteModelId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>确认删除本地模型</DialogTitle>
            <DialogDescription>
              确定要删除“{pendingDeleteModelName}”吗？删除后将释放本地磁盘空间，之后可随时重新下载。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setPendingDeleteModelId(null)} type="button" variant="outline">
              取消
            </Button>
            <Button onClick={handleConfirmRemove} type="button" variant="destructive">
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
