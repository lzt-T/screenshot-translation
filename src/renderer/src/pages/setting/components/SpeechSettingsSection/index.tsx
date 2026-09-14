import type { SpeechProvider, SpeechProviderConfig, SpeechSettings, SpeechSource } from '@src/type/speech-settings'
import { SPEECH_SOURCES, SPEECH_PROVIDERS, SPEECH_FIELD_LABELS, getSpeechValidationMessage } from '@src/utils/speech-settings'
import { KOKORO_VOICES } from '@src/utils/kokoro-voices'
import { Button } from '@renderer/components/ui/button'
import { getSpeechPresetOptions } from '@src/utils/speech-presets'
import { SpeechPresetField } from '@renderer/pages/setting/components/SpeechSettingsSection/SpeechPresetField'
import { Label } from '@renderer/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { useSpeechPreview, SPEECH_PREVIEW_TEXT } from '@renderer/pages/setting/components/SpeechSettingsSection/useSpeechPreview'
import type { SaveStatus } from '@renderer/pages/setting/useData'

/** 语音设置分组属性 */
interface SpeechSettingsSectionProps {
  settings: SpeechSettings
  saveStatus: SaveStatus
  onChange: (settings: SpeechSettings) => Promise<boolean>
}

// 保存状态对应的反馈文案
const SAVE_LABELS: Record<SaveStatus, string> = {
  idle: '修改后自动保存', saving: '正在保存…', saved: '设置已保存', error: '保存失败，请重试'
}

/** 沿用设置页表面与控件，按来源展示必要字段 */
export default function SpeechSettingsSection({ settings, saveStatus, onChange }: SpeechSettingsSectionProps) {
  // 音色列表与试听状态
  const { voices, status, error, preview, stopPreview } = useSpeechPreview(settings)
  // 当前服务商定义
  const provider = SPEECH_PROVIDERS[settings.provider]
  // 当前服务商保存的字段
  const config = settings.providers[settings.provider]
  // 试听前可见的配置错误
  const validationMessage = getSpeechValidationMessage(settings)
  // 首个错误字段，供辅助技术将提示关联到对应输入
  const invalidField = validationMessage
    ? provider.fields.find((field) => !config[field]?.trim()) ?? (validationMessage.includes('地址') ? 'endpoint' : validationMessage.includes('不支持此音色') ? 'voice' : 'model')
    : undefined
  // 当前音色选项是否已失效
  const isMissingVoice = settings.browserVoice !== 'auto' && !voices.some((voice) => voice.voiceURI === settings.browserVoice)

  /** 更新来源偏好，同时保留其他来源配置 */
  function changeSetting<K extends keyof SpeechSettings>(key: K, value: SpeechSettings[K]): void {
    if (key === 'source' || key === 'provider') stopPreview()
    void onChange({ ...settings, [key]: value })
  }

  /** 仅修改当前服务商的字段 */
  function changeProviderField(field: keyof SpeechProviderConfig, value: string): void {
    void onChange({ ...settings, providers: { ...settings.providers, [settings.provider]: { ...config, [field]: value } } })
  }

  return (
    <section className="space-y-3" aria-labelledby="speech-settings-title">
      <div>
        <h2 className="text-base font-semibold text-foreground" id="speech-settings-title">语音播放</h2>
        <p className="mt-1 text-xs text-muted-foreground">用于翻译、学习与对话朗读，统一使用正常语速。</p>
      </div>
      <div className="lab-panel divide-y divide-border">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label htmlFor="speech-source">语音来源</Label>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">{SPEECH_SOURCES[settings.source].description}</p>
          </div>
          <Select value={settings.source} onValueChange={(value) => changeSetting('source', value as SpeechSource)}>
            <SelectTrigger id="speech-source" className="w-full sm:w-70"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SPEECH_SOURCES).map(([key, source]) => <SelectItem key={key} value={key}>{source.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {settings.source === 'browser' && (
          <div className="space-y-2 px-4 py-3.5">
            <Label htmlFor="browser-voice">音色</Label>
            <Select value={settings.browserVoice} onValueChange={(value) => changeSetting('browserVoice', value)}>
              <SelectTrigger id="browser-voice" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动（按文本语言）</SelectItem>
                {isMissingVoice && <SelectItem value={settings.browserVoice} disabled>已保存音色不可用，请重新选择</SelectItem>}
                {voices.map((voice) => <SelectItem key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</SelectItem>)}
              </SelectContent>
            </Select>
            {voices.length === 0 && <p className="text-xs text-muted-foreground" role="status">尚未发现可用音色。请检查系统语音设置；音色加载后列表会自动更新。</p>}
          </div>
        )}
        {settings.source === 'kokoro' && (
          <div className="space-y-2 px-4 py-3.5">
            <Label htmlFor="kokoro-voice">音色</Label>
            <Select value={settings.kokoroVoice} onValueChange={(value) => changeSetting('kokoroVoice', value)}>
              <SelectTrigger id="kokoro-voice" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动（按文本语言）</SelectItem>
                {KOKORO_VOICES.map((voice) => <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {settings.source === 'third-party' && (
          <div className="space-y-4 px-4 py-3.5">
            <div className="space-y-2">
              <Label htmlFor="speech-provider">服务商</Label>
              <Select value={settings.provider} onValueChange={(value) => changeSetting('provider', value as SpeechProvider)}>
                <SelectTrigger id="speech-provider" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SPEECH_PROVIDERS).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
              <p id="speech-provider-help" className="text-xs leading-relaxed text-muted-foreground">{provider.help}</p>
            </div>
            {provider.fields.map((field) => (
              <SpeechPresetField key={`${settings.provider}-${field}-${field === 'voice' ? config.model : ''}`}
                id={`speech-${field}`} label={SPEECH_FIELD_LABELS[field]} value={config[field]}
                options={getSpeechPresetOptions(settings.provider, field, config.model)} isSecret={field === 'apiKey'}
                isInvalid={invalidField === field}
                describedBy={invalidField === field ? 'speech-provider-help speech-config-error' : 'speech-provider-help'}
                onChange={(value) => changeProviderField(field, value)} />
            ))}
            {validationMessage && <p id="speech-config-error" className="text-xs text-destructive" role="status">{validationMessage}</p>}
          </div>
        )}
        <div className="space-y-3 px-4 py-3.5">
          <p className="text-sm leading-relaxed text-muted-foreground" lang="en">{SPEECH_PREVIEW_TEXT}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" disabled={status === 'idle' && Boolean(validationMessage)} onClick={status === 'idle' ? preview : stopPreview}>{status === 'idle' ? '试听' : '停止'}</Button>
            <span role="status" className="text-xs text-muted-foreground">{status === 'loading' ? '正在准备语音…' : status === 'playing' ? '正在播放…' : SAVE_LABELS[saveStatus]}</span>
            {saveStatus === 'error' && <Button type="button" variant="ghost" onClick={() => void onChange(settings)}>重试保存</Button>}
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  )
}
