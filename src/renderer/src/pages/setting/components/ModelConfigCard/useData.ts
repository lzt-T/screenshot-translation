import { useCallback } from 'react'
import { TranslationModelProfile } from '@src/type/model'
import { copyText } from '@src/utils/copy'

/** 模型字段名 */
export type ModelFieldKey = 'displayName' | 'baseUrl' | 'model' | 'apiKey'

/** 模型卡片 Hook 属性 */
interface UseDataProps {
  /* 当前模型 */
  model: TranslationModelProfile
  /* 字段变更回调 */
  onChangeField: (modelId: string, key: ModelFieldKey, value: string) => void
  /* 请求删除回调 */
  onRequestDelete: (model: TranslationModelProfile) => void
}

/**
 * 模型卡片数据 Hook
 * @param {UseDataProps} props Hook 属性
 * @returns {object} 卡片展示与事件数据
 */
export default function useData({ model, onChangeField, onRequestDelete }: UseDataProps) {
  // state：当前卡片无本地状态

  // derived：是否是内置模型
  const isBuiltIn = Boolean(model.isBuiltInFree)
  // derived：是否允许删除
  const canDelete = !isBuiltIn
  // derived：模型标题
  const modelTitle = model.displayName || model.model || model.id
  // derived：API Key 输入框显示值
  const apiKeyInputValue = isBuiltIn ? '内置免费模型无需填写' : model.apiKey

  /**
   * 更新模型字段
   * @param {ModelFieldKey} key 字段名
   * @param {string} value 字段值
   * @returns {void} 无返回值
   */
  const handleChangeField = useCallback(
    (key: ModelFieldKey, value: string) => {
      onChangeField(model.id, key, value)
    },
    [model.id, onChangeField]
  )

  /**
   * 处理显示名称变更
   * @param {string} value 输入值
   * @returns {void} 无返回值
   */
  const handleDisplayNameChange = useCallback(
    (value: string) => {
      handleChangeField('displayName', value)
    },
    [handleChangeField]
  )

  /**
   * 处理模型名变更
   * @param {string} value 输入值
   * @returns {void} 无返回值
   */
  const handleModelNameChange = useCallback(
    (value: string) => {
      handleChangeField('model', value)
    },
    [handleChangeField]
  )

  /**
   * 处理 Base URL 变更
   * @param {string} value 输入值
   * @returns {void} 无返回值
   */
  const handleBaseUrlChange = useCallback(
    (value: string) => {
      handleChangeField('baseUrl', value)
    },
    [handleChangeField]
  )

  /**
   * 处理 API Key 变更
   * @param {string} value 输入值
   * @returns {void} 无返回值
   */
  const handleApiKeyChange = useCallback(
    (value: string) => {
      handleChangeField('apiKey', value)
    },
    [handleChangeField]
  )

  /**
   * 复制 API Key
   * @returns {void} 无返回值
   */
  const handleCopyApiKey = useCallback(() => {
    copyText(model.apiKey || '')
  }, [model.apiKey])

  /**
   * 请求删除模型
   * @returns {void} 无返回值
   */
  const handleRequestDelete = useCallback(() => {
    onRequestDelete(model)
  }, [model, onRequestDelete])

  // effects：当前卡片无副作用

  return {
    isBuiltIn,
    canDelete,
    modelTitle,
    apiKeyInputValue,
    handleDisplayNameChange,
    handleModelNameChange,
    handleBaseUrlChange,
    handleApiKeyChange,
    handleCopyApiKey,
    handleRequestDelete
  }
}
