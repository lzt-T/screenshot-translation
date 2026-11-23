import type { SpeechProvider, SpeechProviderConfig, SpeechSettings, SpeechSource } from '@src/type/speech-settings'
import type { LocalModelState } from '@src/type/local-model'
import { formatModelBytes } from '@src/utils/local-models'
import { SPEECH_SOURCES, SPEECH_PROVIDERS, SPEECH_FIELD_LABELS, getSpeechValidationMessage } from '@src/utils/speech-settings'
import { getGroupedKokoroVoices } from '@src/utils/kokoro-voices'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { getSpeechPresetOptions } from '@src/utils/speech-presets'
import { SpeechPresetField } from '@renderer/pages/setting/components/SpeechSettingsSection/SpeechPresetField'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useSpeechPreview, SPEECH_PREVIEW_TEXT } from '@renderer/pages/setting/components/SpeechSettingsSection/useSpeechPreview'
import type { SaveStatus } from '@renderer/pages/setting/useData'

/** 语音设置分组属性 */
interface SpeechSettingsSectionProps {
  settings: SpeechSettings
  saveStatus: SaveStatus
  kokoroState: LocalModelState
  onDownloadKokoro: () => void
  onCancelKokoroDownload: () => void
  onChange: (settings: SpeechSettings) => Promise<boolean>
}

// 保存状态对应的反馈文案
const SAVE_LABELS: Record<SaveStatus, string> = {
  idle: '修改后自动保存',
  saving: '正在保存…',
  saved: '语音设置已保存',
  error: '保存失败，请重试'
}

// 按语种与性别分组后的 Kokoro 音色目录
const GROUPED_KOKORO_VOICES = getGroupedKokoroVoices()

/**
 * 渲染语音来源、分组音色与在线试听设置区块
 * @param props 语音设置属性
 * @returns 语音设置区块节点
 */
export default function SpeechSettingsSection({
  settings,
  saveStatus,
  kokoroState,
  onDownloadKokoro,
  onCancelKokoroDownload,
  onChange
}: SpeechSettingsSectionProps) {
  const { voices, status, error, preview, stopPreview } = useSpeechPreview(settings)
  const provider = SPEECH_PROVIDERS[settings.provider]
  const config = settings.providers[settings.provider]
  const validationMessage = getSpeechValidationMessage(settings)
  const isKokoroReady = kokoroState.status === 'installed'
  const isKokoroBusy = kokoroState.status === 'downloading' || kokoroState.status === 'extracting'
  const invalidField = validationMessage
    ? provider.fields.find((field) => !config[field]?.trim()) ??
      (validationMessage.includes('地址')
        ? 'endpoint'
        : validationMessage.includes('不支持此音色')
          ? 'voice'
          : 'model')
    : undefined
  const isMissingVoice =
    settings.browserVoice !== 'auto' && !voices.some((voice) => voice.voiceURI === settings.browserVoice)

  /** 更新来源偏好，同时保留其他来源配置 */
  function changeSetting<K extends keyof SpeechSettings>(key: K, value: SpeechSettings[K]): void {
    if (key === 'source' || key === 'provider') {
      stopPreview()
    }
    void onChange({ ...settings, [key]: value })
  }

  /** 仅修改当前服务商的字段 */
  function changeProviderField(field: keyof SpeechProviderConfig, value: string): void {
    void onChange({
      ...settings,
      providers: {
        ...settings.providers,
        [settings.provider]: { ...config, [field]: value }
      }
    })
  }

  return (
    <section className="space-y-3" aria-labelledby="speech-settings-title">
      <div>
        <h2 className="text-base font-semibold text-foreground" id="speech-settings-title">
          语音播放
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          用于翻译结果、学习收藏与口语对话的英文/中文朗读。
        </p>
      </div>

      <div className="lexicon-panel divide-y divide-border">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label htmlFor="speech-source">语音来源</Label>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {SPEECH_SOURCES[settings.source].description}
            </p>
          </div>
          <Select
            value={settings.source}
            onValueChange={(value) => changeSetting('source', value as SpeechSource)}
          >
            <SelectTrigger id="speech-source" className="w-full cursor-pointer sm:w-70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SPEECH_SOURCES).map(([key, source]) => (
                <SelectItem className="cursor-pointer" key={key} value={key}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {settings.source === 'browser' && (
          <div className="space-y-2 px-4 py-3.5">
            <Label htmlFor="browser-voice">系统音色</Label>
            <Select
              value={settings.browserVoice}
              onValueChange={(value) => changeSetting('browserVoice', value)}
            >
              <SelectTrigger id="browser-voice" className="w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="cursor-pointer" value="auto">
                  自动（按文本语言）
                </SelectItem>
                {isMissingVoice && (
                  <SelectItem value={settings.browserVoice} disabled>
                    已保存音色不可用，请重新选择
                  </SelectItem>
                )}
                {voices.map((voice) => (
                  <SelectItem className="cursor-pointer" key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} · {voice.lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voices.length === 0 && (
              <p className="text-xs text-muted-foreground" role="status">
                尚未发现可用音色。请检查系统语音设置；音色加载后列表会自动更新。
              </p>
            )}
            {kokoroState.status === 'not-installed' && (
              <p className="text-xs text-muted-foreground">
                如需更自然的离线英文发音，可在下方「离线语音与识别模型」下载 Kokoro 本地模型。
              </p>
            )}
          </div>
        )}

        {settings.source === 'kokoro' && (
          <div className="space-y-3 px-4 py-3.5">
            {!isKokoroReady && (
              <div className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {isKokoroBusy
                        ? kokoroState.status === 'extracting'
                          ? '正在解压并校验 Kokoro 模型…'
                          : '正在下载 Kokoro 本地语音模型…'
                        : 'Kokoro 本地语音模型尚未下载（约 205 MB）'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      下载完成后即可离线朗读英文与中文，或先切换为浏览器语音使用。
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isKokoroBusy ? (
                      <Button
                        className="cursor-pointer"
                        onClick={onCancelKokoroDownload}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        取消下载
                      </Button>
                    ) : (
                      <Button
                        className="cursor-pointer"
                        onClick={onDownloadKokoro}
                        size="sm"
                        type="button"
                      >
                        {kokoroState.status === 'error' ? '重试下载' : '下载模型'}
                      </Button>
                    )}
                    <Button
                      className="cursor-pointer"
                      onClick={() => changeSetting('source', 'browser')}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      改用浏览器语音
                    </Button>
                  </div>
                </div>
                {isKokoroBusy && (
                  <div className="space-y-1">
                    <Progress value={kokoroState.progress} />
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {kokoroState.status === 'extracting'
                        ? '正在解压并校验文件…'
                        : kokoroState.totalBytes > 0
                          ? `${formatModelBytes(kokoroState.downloadedBytes)} / ${formatModelBytes(kokoroState.totalBytes)}（${kokoroState.progress}%）`
                          : `已下载 ${formatModelBytes(kokoroState.downloadedBytes)}…`}
                    </p>
                  </div>
                )}
                {kokoroState.status === 'error' && kokoroState.error && (
                  <p className="text-xs text-destructive" role="alert">
                    {kokoroState.error}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="kokoro-voice">本地 Kokoro 音色</Label>
              <Select
                value={settings.kokoroVoice}
                onValueChange={(value) => changeSetting('kokoroVoice', value)}
              >
                <SelectTrigger id="kokoro-voice" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>默认推荐</SelectLabel>
                    <SelectItem className="cursor-pointer" value="auto">
                      自动（英文推荐 Maple · 中文自动适配）
                    </SelectItem>
                  </SelectGroup>
                  {GROUPED_KOKORO_VOICES.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.items.map((voice) => (
                        <SelectItem className="cursor-pointer" key={voice.id} value={voice.id}>
                          {voice.displayLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {settings.source === 'third-party' && (
          <div className="grid grid-cols-1 gap-4 px-4 py-3.5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="speech-provider">服务商</Label>
              <Select
                value={settings.provider}
                onValueChange={(value) => changeSetting('provider', value as SpeechProvider)}
              >
                <SelectTrigger id="speech-provider" className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SPEECH_PROVIDERS).map(([key, item]) => (
                    <SelectItem className="cursor-pointer" key={key} value={key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="speech-provider-help" className="text-xs leading-relaxed text-muted-foreground">
                {provider.help}
              </p>
            </div>
            {provider.fields.map((field) => {
              const isFullWidthField = field === 'endpoint' || field === 'apiKey'
              return (
                <div
                  className={isFullWidthField ? 'sm:col-span-2' : undefined}
                  key={`${settings.provider}-${field}-${field === 'voice' ? config.model : ''}`}
                >
                  <SpeechPresetField
                    id={`speech-${field}`}
                    label={SPEECH_FIELD_LABELS[field]}
                    value={config[field]}
                    options={getSpeechPresetOptions(settings.provider, field, config.model)}
                    isSecret={field === 'apiKey'}
                    isInvalid={invalidField === field}
                    describedBy={
                      invalidField === field
                        ? 'speech-provider-help speech-config-error'
                        : 'speech-provider-help'
                    }
                    onChange={(value) => changeProviderField(field, value)}
                  />
                </div>
              )
            })}
            {validationMessage && (
              <p id="speech-config-error" className="text-xs text-destructive sm:col-span-2" role="status">
                {validationMessage}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-muted-foreground" lang="en">
            {SPEECH_PREVIEW_TEXT}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="cursor-pointer"
              type="button"
              variant="outline"
              disabled={
                status === 'idle' &&
                (Boolean(validationMessage) || (settings.source === 'kokoro' && !isKokoroReady))
              }
              onClick={status === 'idle' ? preview : stopPreview}
            >
              {status === 'idle' ? '试听' : '停止'}
            </Button>
            <span role="status" className="text-xs text-muted-foreground">
              {status === 'loading'
                ? '正在准备语音…'
                : status === 'playing'
                  ? '正在播放…'
                  : SAVE_LABELS[saveStatus]}
            </span>
            {saveStatus === 'error' && (
              <Button
                className="cursor-pointer"
                type="button"
                variant="ghost"
                onClick={() => void onChange(settings)}
              >
                重试保存
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
