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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Copy } from 'lucide-react'
import { copyText } from '@src/utils/copy'
import { Switch } from '@renderer/components/ui/switch'
import useData from './useData'
import { Badge } from '@renderer/components/ui/badge'

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
    return null
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-foreground mb-6">设置</h1>

      <div className="space-y-4">
        {/* 语言设置 - 左右结构 */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="text-base font-medium">截取翻译目标语言</div>
          <div className="w-64">
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
        </div>

        {/* 模型选择 - 左右结构 */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="text-base font-medium">选择当前使用的翻译模型</div>
          <div className="w-64">
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
                    {modelValue === GlmModel.GLM_4_FLASH_250414_FREE && (
                      <Badge className="text-xs border-green-500 text-green-500" variant="outline">
                        免费
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 开机自启动设置 - 左右结构 */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="text-base font-medium">开机自启</div>
          <div>
            <Switch
              id="autoLaunch"
              checked={data.autoLaunch?.enabled || false}
              onCheckedChange={handleAutoLaunchChange}
            />
          </div>
        </div>

        {/* API Key Section - 每个模型一行 */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-[550] mb-4 text-gray-600">配置模型 API Keys</h2>
          {Object.values(Model).map((modelValue) => (
            <div
              key={modelValue}
              className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4 pl-5"
            >
              <div className="text-base font-medium">{modelValue} API Key</div>
              <div className="w-64 flex gap-2 items-center">
                <Input
                  defaultValue={data.apiKeys[modelValue] || ''}
                  type="password"
                  id={`apiKeyInput-${modelValue}`}
                  onChange={(e) => handleApiKeyChange(modelValue, e)}
                  className="w-full"
                />
                <div
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => copyText(data.apiKeys[modelValue] || '')}
                  title="复制API Key"
                >
                  <Copy size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SettingPage
