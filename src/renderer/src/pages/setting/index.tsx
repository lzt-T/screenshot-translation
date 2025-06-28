import React, { useState, useEffect, useCallback } from 'react'
import {
  Model,
  ModelName,
  GeminiModel,
  GlmModel,
  TargetLanguage,
  GptModel,
  DeepSeekModel
} from '@src/type/model'
import useLocalForage from '@renderer/hooks/useLocalForage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label' // Import shadcn Label
import { Copy } from 'lucide-react'
import { copyText } from '@src/utils/copy'
import { Switch } from '@renderer/components/ui/switch'
import useData from './useData'

const SettingPage: React.FC = () => {
  const { data, changeData, dataIsInit } = useData()

  /** 设置模型名称 */
  const handleModelNameChange = useCallback(
    (value: ModelName) => {
      changeData('activeModel', value)
    },
    [changeData]
  )

  /** 设置模型API Key */
  const handleApiKeyChange = useCallback(
    (model: Model, e: React.ChangeEvent<HTMLInputElement>) => {
      changeData('apiKeys', {
        ...data.apiKeys,
        [model]: e.target.value
      })
    },
    [changeData, data]
  )

  /** 设置目标语言 */
  const handleTargetLanguageChange = useCallback(
    (value: TargetLanguage) => {
      changeData('targetLanguage', value)
    },
    [changeData]
  )

  /** 设置开机自启动 */
  const handleAutoLaunchChange = useCallback(
    (checked: boolean) => {
      changeData('autoLaunch', {
        enabled: checked
      })
    },
    [changeData]
  )

  if (!dataIsInit) {
    return <div>初始化中...</div>
  }

  return (
    // Replace Container with div and Tailwind layout/spacing
    <div className="p-6 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-foreground">设置</h1>

      {/* 设置目标语言 */}
      <div className="space-y-2 w-full max-w-sm">
        <Label htmlFor="targetLanguageSelect">截取翻译目标语言:</Label>
        <Select defaultValue={data.targetLanguage} onValueChange={handleTargetLanguageChange}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="选择目标语言" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TargetLanguage).map((modelValue) => (
              <SelectItem className="cursor-pointer" key={modelValue} value={modelValue}>
                {modelValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Model Selection Group */}
      <div className="space-y-2 w-full max-w-sm">
        <Label htmlFor="modelSelect">选择当前使用的翻译模型:</Label>
        <Select defaultValue={data.activeModel} onValueChange={handleModelNameChange}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {[
              ...Object.values(GeminiModel),
              ...Object.values(GlmModel),
              ...Object.values(GptModel),
              ...Object.values(DeepSeekModel)
            ].map((modelValue) => (
              <SelectItem className="cursor-pointer" key={modelValue} value={modelValue}>
                {modelValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 开机自启动设置 */}
      <div className="flex items-center justify-between w-full max-w-sm py-2 border-b border-gray-700">
        <Label htmlFor="autoLaunch" className="text-base">
          开机自启
        </Label>
        <Switch
          id="autoLaunch"
          checked={data.autoLaunch?.enabled || false}
          onCheckedChange={handleAutoLaunchChange}
        />
      </div>

      {/* API Key Section */}
      <div className="space-y-4">
        <Label className="text-base font-medium">配置模型 API Keys:</Label>
        {Object.values(Model).map((modelValue) => (
          // API Key Input Group
          <div key={modelValue} className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={`apiKeyInput-${modelValue}`}>{modelValue} API Key:</Label>
            <div className="flex w-full gap-2 items-center">
              <Input
                defaultValue={data.apiKeys[modelValue] || ''}
                type="password"
                id={`apiKeyInput-${modelValue}`}
                onChange={(e) => handleApiKeyChange(modelValue, e)}
                className="w-full"
              />
              <div
                className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => copyText(data.apiKeys[modelValue] || '')}
                title="复制API Key"
              >
                <Copy size={16} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SettingPage
