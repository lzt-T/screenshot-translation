import React, { useCallback, useState } from 'react'
import { TranslationModelProfile } from '@src/type/model'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Plus, RotateCcw } from 'lucide-react'
import { Switch } from '@renderer/components/ui/switch'
import { toast } from 'sonner'
import useData from './useData'
import { Language } from '@src/type/base'
import { getLanguageText } from '@src/utils/ai'
import { v4 as uuidV4 } from 'uuid'
import { Button } from '@renderer/components/ui/button'
import DeleteModelConfirmDialog from './components/DeleteModelConfirmDialog'
import ModelConfigCard from './components/ModelConfigCard'
import { ModelFieldKey } from './components/ModelConfigCard/useData'

/**
 * 设置页
 * @returns {React.JSX.Element | null} 设置页面
 */
const SettingPage: React.FC = () => {
  // 设置页数据
  const { data, changeData, resetModelSettings, dataIsInit } = useData()

  // 待删除模型
  const [pendingRemoveModel, setPendingRemoveModel] = useState<TranslationModelProfile | null>(null)

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
   * @param {ModelFieldKey} key 字段名
   * @param {string} value 字段值
   * @returns {void} 无返回值
   */
  const updateModelField = useCallback(
    (modelId: string, key: ModelFieldKey, value: string) => {
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
    toast.success('新增模型成功')
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

  /**
   * 打开删除确认弹窗
   * @param {TranslationModelProfile} model 模型配置
   * @returns {void} 无返回值
   */
  const openRemoveConfirm = useCallback((model: TranslationModelProfile) => {
    setPendingRemoveModel(model)
  }, [])

  /**
   * 关闭删除确认弹窗
   * @returns {void} 无返回值
   */
  const closeRemoveConfirm = useCallback(() => {
    setPendingRemoveModel(null)
  }, [])

  /**
   * 确认删除自定义模型
   * @returns {void} 无返回值
   */
  const confirmRemoveCustomModel = useCallback(() => {
    if (!pendingRemoveModel) {
      return
    }
    removeCustomModel(pendingRemoveModel.id)
    setPendingRemoveModel(null)
    toast.success('删除模型成功')
  }, [pendingRemoveModel, removeCustomModel])

  /**
   * 重置模型配置
   * @returns {void} 无返回值
   */
  const handleResetModelSettings = useCallback(() => {
    resetModelSettings()
    toast.success('重置成功')
  }, [resetModelSettings])

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
            <div className="flex items-center gap-2">
              <Button
                className="cursor-pointer"
                onClick={handleResetModelSettings}
                type="button"
                variant="outline"
              >
                <RotateCcw size={14} />
                重置配置
              </Button>
              <Button
                className="cursor-pointer"
                onClick={addCustomModel}
                type="button"
                variant="outline"
              >
                <Plus size={14} />
                新增自定义模型
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            提示：Gemini 模型可以不填写 Base URL。
          </div>

          {data.models.map((modelItem) => {
            return (
              <ModelConfigCard
                key={modelItem.id}
                model={modelItem}
                onChangeField={updateModelField}
                onRequestDelete={openRemoveConfirm}
              />
            )
          })}
        </div>
      </div>

      <DeleteModelConfirmDialog
        open={Boolean(pendingRemoveModel)}
        modelName={pendingRemoveModel?.displayName || pendingRemoveModel?.model}
        onCancel={closeRemoveConfirm}
        onConfirm={confirmRemoveCustomModel}
      />
    </div>
  )
}

export default SettingPage
