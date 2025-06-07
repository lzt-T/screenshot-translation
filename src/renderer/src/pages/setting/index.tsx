import React, { useState, useEffect, useCallback } from 'react'
import { Model, ModelName, GeminiModel, GlmModel, TargetLanguage, GptModel, DeepSeekModel } from '@src/type/model'
import useLocalForage from '@renderer/hooks/useLocalForage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label' // Import shadcn Label

const SettingPage: React.FC = () => {
  const { storeSetting, isInit, changeStoreSetting, saveStoreSetting } = useLocalForage()

  /** 设置模型名称 */
  const handleModelNameChange = useCallback(
    (value: ModelName) => {
      changeStoreSetting({
        ...storeSetting,
        activeModel: value
      })
    },
    [storeSetting, changeStoreSetting]
  )

  /** 设置模型API Key */
  const handleApiKeyChange = useCallback(
    (model: Model, e: React.ChangeEvent<HTMLInputElement>) => {
      changeStoreSetting({
        ...storeSetting,
        apiKeys: {
          ...storeSetting.apiKeys,
          [model]: e.target.value
        }
      })
    },
    [storeSetting, changeStoreSetting]
  )

  /** 设置目标语言 */
  const handleTargetLanguageChange = useCallback(
    (value: TargetLanguage) => {
      changeStoreSetting({
        ...storeSetting,
        targetLanguage: value
      })
    },
    [storeSetting, changeStoreSetting]
  )

  if (isInit) {
    return <div>初始化中...</div>
  }

  return (
    // Replace Container with div and Tailwind layout/spacing
    <div className="p-6 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-foreground">
        设置
      </h1>

      {/* 设置目标语言 */}
      <div className="space-y-2 w-full max-w-sm">
        <Label htmlFor="targetLanguageSelect">截取翻译目标语言:</Label>
        <Select defaultValue={storeSetting.targetLanguage} onValueChange={handleTargetLanguageChange}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="选择目标语言" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(TargetLanguage).map(
              (modelValue) => (
                <SelectItem className='cursor-pointer' key={modelValue} value={modelValue}>
                  {modelValue}
                </SelectItem>
              )
            )}
          </SelectContent>

        </Select>
      </div>
      {/* Model Selection Group */}
      <div className="space-y-2 w-full max-w-sm">
        <Label htmlFor="modelSelect">选择当前使用的翻译模型:</Label>
        <Select defaultValue={storeSetting.activeModel} onValueChange={handleModelNameChange}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {[
              ...Object.values(GeminiModel),
              ...Object.values(GlmModel),
              ...Object.values(GptModel),
              ...Object.values(DeepSeekModel)
            ].map(
              (modelValue) => (
                <SelectItem className='cursor-pointer' key={modelValue} value={modelValue}>
                  {modelValue}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* API Key Section */}
      <div className="space-y-4">
        <Label className="text-base font-medium">配置模型 API Keys:</Label>
        {Object.values(Model).map((modelValue) => (
          // API Key Input Group
          <div key={modelValue} className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor={`apiKeyInput-${modelValue}`}>{modelValue} API Key:</Label>
            <Input
              defaultValue={storeSetting.apiKeys[modelValue] || ''}
              type="password"
              id={`apiKeyInput-${modelValue}`}
              onChange={(e) => handleApiKeyChange(modelValue, e)}
              className="w-full"
            />
          </div>
        ))}
      </div>

      <Button className='cursor-pointer' onClick={saveStoreSetting}>保存</Button>
    </div>
  )
}

export default SettingPage
