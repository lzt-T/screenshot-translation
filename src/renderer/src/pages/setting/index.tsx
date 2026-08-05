import React, { useEffect, useRef, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Label } from '@renderer/components/ui/label'
import { Switch } from '@renderer/components/ui/switch'
import { toast } from 'sonner'
import useData from './useData'
import { Language } from '@src/type/base'
import { getLanguageText } from '@src/utils/ai'
import { useSearchParams } from 'react-router-dom'
import ThemeSelector from '@renderer/components/ThemeSelector'
import ModelConfigurationSection from './components/ModelConfigurationSection'
import { validateModelProfile } from '@src/utils/modelProfiles'

/**
 * 渲染设置页面
 * @returns 设置页面节点
 */
const SettingPage: React.FC = () => {
  // 路由查询参数
  const [searchParams] = useSearchParams()
  // 设置页数据与操作
  const {
    data,
    changeData,
    setActiveModel,
    updateModelField,
    addCustomModel,
    removeCustomModel,
    resetModelSettings,
    dataIsInit,
    saveStatus
  } = useData()
  // 模型配置区域元素引用
  const modelConfigSectionRef = useRef<HTMLElement | null>(null)
  // 模型配置区域高亮状态
  const [isModelConfigHighlighted, setIsModelConfigHighlighted] = useState(false)

  /**
   * 设置目标语言
   * @param value 目标语言
   * @returns 无返回值
   */
  function handleTargetLanguageChange(value: Language): void {
    void changeData('targetLanguage', value)
  }

  /**
   * 设置当前使用模型
   * @param modelId 模型 ID
   * @returns 无返回值
   */
  function handleActiveModelChange(modelId: string): void {
    // 待启用的模型配置
    const selectedModel = data.models.find((model) => model.id === modelId)
    if (!selectedModel || !validateModelProfile(selectedModel).isValid) {
      toast.error('请先完成模型配置')
      return
    }
    void setActiveModel(modelId)
  }

  /**
   * 设置开机自启动
   * @param checked 开关值
   * @returns 无返回值
   */
  function handleAutoLaunchChange(checked: boolean): void {
    void changeData('autoLaunch', {
      enabled: checked
    })
  }

  /** 从翻译台进入时定位并聚焦模型配置区域 */
  useEffect(() => {
    // 聚焦目标参数
    const focusTarget = searchParams.get('focus')
    if (!dataIsInit || focusTarget !== 'model-config') {
      return
    }
    // 模型配置区域元素
    const modelConfigSection = modelConfigSectionRef.current
    if (!modelConfigSection) {
      return
    }
    modelConfigSection.scrollIntoView({
      behavior: 'auto',
      block: 'start'
    })
    modelConfigSection.focus({ preventScroll: true })
    setIsModelConfigHighlighted(true)
    // 高亮清理定时器
    const highlightTimer = window.setTimeout(() => {
      setIsModelConfigHighlighted(false)
    }, 2200)
    return () => {
      window.clearTimeout(highlightTimer)
    }
  }, [dataIsInit, searchParams])

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
    <div className="mx-auto max-w-[1180px] space-y-6 px-5 py-5 lg:px-7 lg:py-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-foreground">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">调整翻译偏好、界面外观与模型连接。</p>
      </div>

      <section className="space-y-3" aria-labelledby="general-settings-title">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            id="general-settings-title"
          >
            常规设置
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            设置目标语言、当前模型与开机自启。
          </p>
        </div>

        <div className="lab-panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-sm font-medium" htmlFor="target-language-select">
              截取翻译目标语言
            </Label>
            <div className="w-full sm:w-70">
              <Select value={data.targetLanguage} onValueChange={handleTargetLanguageChange}>
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

          <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-sm font-medium" htmlFor="active-model-select">
              当前使用模型
            </Label>
            <div className="w-full sm:w-70">
              <Select value={data.activeModelId} onValueChange={handleActiveModelChange}>
                <SelectTrigger className="w-full cursor-pointer" id="active-model-select">
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {data.models.map((model) => {
                    // 模型展示文本
                    const modelText = model.displayName || model.model || '未命名模型'
                    // 模型配置是否有效
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

      <section className="space-y-3" aria-labelledby="appearance-title">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            id="appearance-title"
          >
            外观
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            主题会同步应用到主窗口、截图选区与翻译浮层。
          </p>
        </div>
        <div className="lab-panel flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">界面主题</p>
            <p className="mt-1 text-xs text-muted-foreground">选择适合当前环境光的显示方式。</p>
          </div>
          <ThemeSelector />
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
        saveStatus={saveStatus}
        sectionRef={modelConfigSectionRef}
      />
    </div>
  )
}

export default SettingPage
