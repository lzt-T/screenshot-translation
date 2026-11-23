import React, { useEffect, useRef, useState } from 'react'
import { Cpu, Globe, SlidersHorizontal, Volume2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Language } from '@src/type/base'
import type { ProxyMode } from '@src/type/proxy'
import { getLanguageText } from '@src/utils/ai'
import { validateModelProfile } from '@src/utils/modelProfiles'
import { getProxyValidationMessage } from '@src/utils/proxy'
import ThemeSelector from '@renderer/components/ThemeSelector'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import SpeechSettingsSection from '@renderer/pages/setting/components/SpeechSettingsSection'
import LocalModelsSection from '@renderer/pages/setting/components/LocalModelsSection'
import { useLocalModels } from '@renderer/hooks/useLocalModels'
import ModelConfigurationSection from './components/ModelConfigurationSection'
import useData from './useData'

/** 设置页面标签页标识 */
type SettingTabKey = 'general' | 'model' | 'speech' | 'network'

/** 设置页分类导航配置 */
const SETTING_TABS: ReadonlyArray<{
  key: SettingTabKey
  label: string
  icon: typeof SlidersHorizontal
}> = [
  { key: 'general', label: '常规与外观', icon: SlidersHorizontal },
  { key: 'model', label: 'AI 模型', icon: Cpu },
  { key: 'speech', label: '语音与模型', icon: Volume2 },
  { key: 'network', label: '网络代理', icon: Globe }
]

/** 解析路由参数对应的初始设置分类 */
function resolveSettingTab(searchParams: URLSearchParams): SettingTabKey {
  const tabParam = searchParams.get('tab')
  if (
    tabParam === 'general' ||
    tabParam === 'model' ||
    tabParam === 'speech' ||
    tabParam === 'network'
  ) {
    return tabParam
  }
  if (searchParams.get('focus') === 'model-config') {
    return 'model'
  }
  return 'general'
}

/**
 * 渲染分类清晰的设置页面
 * @returns 设置页面节点
 */
const SettingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    data,
    changeData,
    setActiveModel,
    updateModelField,
    addCustomModel,
    removeCustomModel,
    resetModelSettings,
    dataIsInit,
    saveStatusByScope
  } = useData()
  const activeTab = resolveSettingTab(searchParams)
  const modelConfigSectionRef = useRef<HTMLElement | null>(null)
  const localModelsSectionRef = useRef<HTMLElement | null>(null)
  const [isModelConfigHighlighted, setIsModelConfigHighlighted] = useState(false)
  const [isLocalModelsHighlighted, setIsLocalModelsHighlighted] = useState(false)
  const {
    modelsMap,
    isLoading: isLocalModelsLoading,
    downloadModel,
    cancelDownload,
    removeModel
  } = useLocalModels()
  const proxyValidationMessage =
    data.proxy.mode === 'manual' ? getProxyValidationMessage(data.proxy.proxyUrl) : ''

  /** 切换当前设置的分组标签 */
  function handleTabChange(nextTab: SettingTabKey): void {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', nextTab)
    nextParams.delete('focus')
    setSearchParams(nextParams, { replace: true })
  }

  /** 设置目标语言 */
  function handleTargetLanguageChange(value: Language): void {
    void changeData('targetLanguage', value, 'general')
  }

  /** 设置当前使用模型 */
  function handleActiveModelChange(modelId: string): void {
    const selectedModel = data.models.find((model) => model.id === modelId)
    if (!selectedModel || !validateModelProfile(selectedModel).isValid) {
      toast.error('请先完成模型配置')
      return
    }
    void setActiveModel(modelId)
  }

  /** 设置开机自启动 */
  function handleAutoLaunchChange(checked: boolean): void {
    void changeData('autoLaunch', { enabled: checked }, 'general')
  }

  /** 设置代理模式 */
  function handleProxyModeChange(mode: ProxyMode): void {
    void changeData('proxy', { ...data.proxy, mode }, 'network')
  }

  /** 设置手动代理地址 */
  function handleProxyUrlChange(proxyUrl: string): void {
    void changeData('proxy', { ...data.proxy, proxyUrl }, 'network')
  }

  /** 外部跳转定位模型配置或本地模型时自动切换并高亮 */
  useEffect(() => {
    const focusTarget = searchParams.get('focus')
    if (!dataIsInit) {
      return
    }
    if (focusTarget === 'model-config' && activeTab === 'model') {
      const modelConfigSection = modelConfigSectionRef.current
      if (!modelConfigSection) {
        return
      }
      modelConfigSection.scrollIntoView({ behavior: 'auto', block: 'start' })
      modelConfigSection.focus({ preventScroll: true })
      setIsModelConfigHighlighted(true)
      const highlightTimer = window.setTimeout(() => {
        setIsModelConfigHighlighted(false)
      }, 2200)
      return () => {
        window.clearTimeout(highlightTimer)
      }
    }
    if (focusTarget === 'local-models' && activeTab === 'speech') {
      const localModelsSection = localModelsSectionRef.current
      if (!localModelsSection) {
        return
      }
      localModelsSection.scrollIntoView({ behavior: 'auto', block: 'start' })
      localModelsSection.focus({ preventScroll: true })
      setIsLocalModelsHighlighted(true)
      const highlightTimer = window.setTimeout(() => {
        setIsLocalModelsHighlighted(false)
      }, 2200)
      return () => {
        window.clearTimeout(highlightTimer)
      }
    }
    return undefined
  }, [activeTab, dataIsInit, searchParams])

  if (!dataIsInit) {
    return (
      <div
        className="flex min-h-48 items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        正在加载设置…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-5 py-4 lg:px-7 lg:py-5">
      <h1 className="sr-only">设置</h1>

      <nav
        aria-label="设置分类"
        className="flex w-fit flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1"
        role="tablist"
      >
        {SETTING_TABS.map((tab) => {
          const TabIcon = tab.icon
          const isSelected = activeTab === tab.key
          return (
            <button
              aria-selected={isSelected}
              className={cn(
                'flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              role="tab"
              type="button"
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'general' && (
        <div className="space-y-6" role="tabpanel">
          <section className="space-y-3" aria-labelledby="appearance-title">
            <div>
              <h2 className="text-base font-semibold text-foreground" id="appearance-title">
                外观与主题
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                主题会同步应用到主窗口、融合标题栏与截图翻译浮层。
              </p>
            </div>
            <div className="lexicon-panel flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">界面主题</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  浅色适合日间翻阅，深色适合夜间专注阅读。
                </p>
              </div>
              <ThemeSelector />
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="general-settings-title">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground" id="general-settings-title">
                  偏好与启动
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  设置截图翻译默认目标语言及系统自启选项。
                </p>
              </div>
              {saveStatusByScope.general === 'saved' && (
                <span className="text-xs text-muted-foreground" role="status">
                  偏好已保存
                </span>
              )}
            </div>

            <div className="lexicon-panel divide-y divide-border overflow-hidden">
              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <Label className="text-sm font-medium" htmlFor="target-language-select">
                  截图翻译目标语言
                </Label>
                <div className="w-full sm:w-70">
                  <Select
                    value={data.targetLanguage}
                    onValueChange={handleTargetLanguageChange}
                  >
                    <SelectTrigger className="w-full cursor-pointer" id="target-language-select">
                      <SelectValue placeholder="选择目标语言" />
                    </SelectTrigger>
                    <SelectContent>
                      {[Language.ZH, Language.EN].map((language) => (
                        <SelectItem className="cursor-pointer" key={language} value={language}>
                          {getLanguageText(language)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5">
                <Label className="text-sm font-medium" htmlFor="autoLaunch">
                  开机自启
                </Label>
                <Switch
                  checked={data.autoLaunch?.enabled || false}
                  id="autoLaunch"
                  onCheckedChange={handleAutoLaunchChange}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'model' && (
        <div className="space-y-6" role="tabpanel">
          <section className="space-y-3" aria-labelledby="active-model-title">
            <div>
              <h2 className="text-base font-semibold text-foreground" id="active-model-title">
                当前默认模型
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                翻译台、截图翻译、句子批注和口语对话均使用此处选中的 AI 引擎。
              </p>
            </div>
            <div className="lexicon-panel flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium" htmlFor="active-model-select">
                当前使用模型
              </Label>
              <div className="w-full sm:w-76">
                <Select value={data.activeModelId} onValueChange={handleActiveModelChange}>
                  <SelectTrigger className="w-full cursor-pointer" id="active-model-select">
                    <SelectValue placeholder="选择模型" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.models.map((model) => {
                      const modelText = model.displayName || model.model || '未命名模型'
                      const isModelValid = validateModelProfile(model).isValid
                      return (
                        <SelectItem
                          className="cursor-pointer"
                          disabled={!isModelValid && model.id !== data.activeModelId}
                          key={model.id}
                          value={model.id}
                        >
                          {modelText}
                          {isModelValid ? '' : '（配置不完整）'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <ModelConfigurationSection
            activeModelId={data.activeModelId}
            isHighlighted={isModelConfigHighlighted}
            models={data.models}
            onAddModel={addCustomModel}
            onChangeField={updateModelField}
            onRemoveModel={removeCustomModel}
            onResetModels={resetModelSettings}
            onSetActiveModel={setActiveModel}
            saveStatus={saveStatusByScope.model}
            sectionRef={modelConfigSectionRef}
          />
        </div>
      )}

      {activeTab === 'speech' && (
        <div className="space-y-6" role="tabpanel">
          <SpeechSettingsSection
            kokoroState={modelsMap['kokoro-tts']}
            onCancelKokoroDownload={() => void cancelDownload('kokoro-tts')}
            onChange={(settings) => changeData('speech', settings, 'speech')}
            onDownloadKokoro={() => void downloadModel('kokoro-tts', data.localModelSource)}
            saveStatus={saveStatusByScope.speech}
            settings={data.speech}
          />

          <LocalModelsSection
            isHighlighted={isLocalModelsHighlighted}
            isLoading={isLocalModelsLoading}
            modelsMap={modelsMap}
            onCancel={cancelDownload}
            onChangeSourceSetting={(nextSetting) =>
              void changeData('localModelSource', nextSetting, 'speech')
            }
            onDownload={(modelId) => downloadModel(modelId, data.localModelSource)}
            onRemove={removeModel}
            sectionRef={localModelsSectionRef}
            sourceSetting={data.localModelSource}
          />
        </div>
      )}

      {activeTab === 'network' && (
        <section className="space-y-3" aria-labelledby="network-title" role="tabpanel">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground" id="network-title">
                网络代理
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                当访问海外 AI 模型或语音服务受限时，可切换代理方式。
              </p>
            </div>
            {saveStatusByScope.network === 'saved' && (
              <span className="text-xs text-muted-foreground" role="status">
                代理设置已保存
              </span>
            )}
          </div>

          <div className="lexicon-panel overflow-hidden">
            <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium" htmlFor="proxy-mode-select">
                代理方式
              </Label>
              <div className="w-full sm:w-70">
                <Select value={data.proxy.mode} onValueChange={handleProxyModeChange}>
                  <SelectTrigger className="w-full cursor-pointer" id="proxy-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem className="cursor-pointer" value="system">
                      跟随系统
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value="direct">
                      直连
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value="manual">
                      手动代理
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {data.proxy.mode === 'manual' && (
              <div className="border-t border-border px-4 py-3.5">
                <div className="grid gap-2 sm:grid-cols-[1fr_280px] sm:items-start sm:gap-4">
                  <Label className="pt-2 text-sm font-medium" htmlFor="proxy-url-input">
                    代理地址
                  </Label>
                  <div className="space-y-1.5">
                    <Input
                      aria-describedby={proxyValidationMessage ? 'proxy-url-error' : undefined}
                      aria-invalid={Boolean(proxyValidationMessage)}
                      id="proxy-url-input"
                      onChange={(event) => handleProxyUrlChange(event.target.value)}
                      placeholder="http://127.0.0.1:7890"
                      spellCheck={false}
                      value={data.proxy.proxyUrl}
                    />
                    {proxyValidationMessage && (
                      <p className="text-xs text-destructive" id="proxy-url-error">
                        {proxyValidationMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default SettingPage
