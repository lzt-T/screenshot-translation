import React, { useCallback } from 'react'
import { TranslationModelProfile } from '@src/type/model'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { copyText } from '@src/utils/copy'
import { Switch } from '@renderer/components/ui/switch'
import useData from './useData'
import { Badge } from '@renderer/components/ui/badge'
import { Language } from '@src/type/base'
import { getLanguageText } from '@src/utils/ai'
import { v4 as uuidV4 } from 'uuid'

/**
 * 设置页
 * @returns {React.JSX.Element | null} 设置页面
 */
const SettingPage: React.FC = () => {
  // 设置页数据
  const { data, changeData, dataIsInit } = useData()

  /**
   * 设置模型 ID
   * @param {string} modelId 模型 ID
   * @returns {void} 无返回值
   */
  const handleModelIdChange = useCallback(
    (modelId: string) => {
      changeData('activeModelId', modelId)
    },
    [changeData]
  )

  /**
   * 更新模型单字段
   * @param {string} modelId 模型 ID
   * @param {'displayName' | 'baseUrl' | 'model' | 'apiKey'} key 字段名
   * @param {string} value 字段值
   * @returns {void} 无返回值
   */
  const updateModelField = useCallback(
    (
      modelId: string,
      key: 'displayName' | 'baseUrl' | 'model' | 'apiKey',
      value: string
    ) => {
      // 更新后的模型配置列表
      const nextModels = data.models.map((item) => {
        if (item.id !== modelId) {
          return item
        }
        return {
          ...item,
          [key]: value
        } as TranslationModelProfile
      })
      changeData('models', nextModels)
    },
    [changeData, data.models]
  )

  /**
   * 设置目标语言
   * @param {Language} value 目标语言
   * @returns {void} 无返回值
   */
  const handleTargetLanguageChange = useCallback(
    (value: Language) => {
      changeData('targetLanguage', value)
    },
    [changeData]
  )

  /**
   * 设置开机自启动
   * @param {boolean} checked 开关值
   * @returns {void} 无返回值
   */
  const handleAutoLaunchChange = useCallback(
    (checked: boolean) => {
      changeData('autoLaunch', {
        enabled: checked
      })
    },
    [changeData]
  )

  /**
   * 新增一个自定义模型
   * @returns {void} 无返回值
   */
  const addCustomModel = useCallback(() => {
    // 新模型序号
    const modelSerial = data.models.filter((item) => !item.isBuiltInFree).length + 1
    // 新增模型配置
    const newModel: TranslationModelProfile = {
      id: `custom-${uuidV4()}`,
      displayName: `自定义模型 ${modelSerial}`,
      baseUrl: 'https://api.openai.com/v1',
      model: '',
      apiKey: ''
    }
    // 更新后的模型列表
    const nextModels = [...data.models, newModel]
    changeData('models', nextModels)
    changeData('activeModelId', newModel.id)
  }, [changeData, data.models])

  /**
   * 删除自定义模型
   * @param {string} modelId 模型 ID
   * @returns {void} 无返回值
   */
  const removeCustomModel = useCallback(
    (modelId: string) => {
      // 过滤后的模型列表
      const nextModels = data.models.filter((item) => item.id !== modelId)
      if (nextModels.length === 0) {
        return
      }
      changeData('models', nextModels)
      if (data.activeModelId === modelId) {
        // 新激活模型 ID
        const nextActiveModelId = nextModels[0].id
        changeData('activeModelId', nextActiveModelId)
      }
    },
    [changeData, data.activeModelId, data.models]
  )

  if (!dataIsInit) {
    return null
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground">设置</h1>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="text-base font-medium">截取翻译目标语言</div>
          <div className="w-70">
            <Select value={data.targetLanguage} onValueChange={handleTargetLanguageChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="选择目标语言" />
              </SelectTrigger>
              <SelectContent>
                {[Language.ZH, Language.EN].map((modelValue) => (
                  <SelectItem className="cursor-pointer" key={modelValue} value={modelValue}>
                    {getLanguageText(modelValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-4">
          <div className="text-base font-medium">选择当前使用模型</div>
          <div className="w-70">
            <Select value={data.activeModelId} onValueChange={handleModelIdChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {data.models.map((modelItem) => {
                  // 模型显示名
                  const modelText = modelItem.displayName || modelItem.model || modelItem.id
                  return (
                    <SelectItem className="cursor-pointer" key={modelItem.id} value={modelItem.id}>
                      {modelText}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

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

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-[550] text-gray-600">模型配置</h2>
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-muted"
              onClick={addCustomModel}
              type="button"
            >
              <Plus size={14} />
              新增自定义模型
            </button>
          </div>

          {data.models.map((modelItem) => {
            // 是否是内置模型
            const isBuiltIn = Boolean(modelItem.isBuiltInFree)
            // 是否可删除
            const canDelete = !isBuiltIn
            // 模型标题
            const modelTitle = modelItem.displayName || modelItem.model || modelItem.id
            return (
              <div
                key={modelItem.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-base flex items-center gap-2">
                    {modelTitle}
                    {isBuiltIn && (
                      <Badge className="text-xs border-green-500 text-green-500" variant="outline">
                        免费
                      </Badge>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => removeCustomModel(modelItem.id)}
                      title="删除模型"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">显示名称</div>
                    <Input
                      value={modelItem.displayName || ''}
                      onChange={(e) => updateModelField(modelItem.id, 'displayName', e.target.value)}
                      disabled={isBuiltIn}
                      placeholder="模型显示名"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">模型名</div>
                    <Input
                      value={modelItem.model}
                      onChange={(e) => updateModelField(modelItem.id, 'model', e.target.value)}
                      placeholder="输入模型名，如 gpt-4.1"
                      disabled={isBuiltIn}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Base URL</div>
                  <Input
                    value={modelItem.baseUrl || ''}
                    onChange={(e) => updateModelField(modelItem.id, 'baseUrl', e.target.value)}
                    placeholder="输入 Base URL，如 https://api.openai.com/v1"
                    disabled={isBuiltIn}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">API Key</div>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={isBuiltIn ? '内置免费模型无需填写' : modelItem.apiKey}
                      type="password"
                      onChange={(e) => updateModelField(modelItem.id, 'apiKey', e.target.value)}
                      className="w-full"
                      disabled={isBuiltIn}
                    />
                    <div
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => copyText(modelItem.apiKey || '')}
                      title="复制API Key"
                    >
                      <Copy size={14} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SettingPage
