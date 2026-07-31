import { useEffect, useRef, useState } from 'react'
import { copyText } from '@src/utils/copy'
import { ModelConnectionTestResult, ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import { isGeminiModel, validateModelProfile } from '@src/utils/modelProfiles'
import { SendEnum } from '@src/type/ipc-constants'

/** 连接测试状态 */
export type ConnectionTestStatus = 'idle' | 'testing' | 'success' | 'error'

/** 模型卡片 Hook 属性 */
interface UseDataProps {
  /* 当前模型 */
  model: TranslationModelProfile
  /* 是否需要聚焦模型名 */
  shouldFocusModelName: boolean
  /* 字段变更回调 */
  onChangeField: (modelId: string, key: ModelFieldKey, value: string) => void
  /* 聚焦完成回调 */
  onFocusComplete: () => void
  /* 请求删除回调 */
  onRequestDelete: (model: TranslationModelProfile) => void
}

/**
 * 管理模型配置卡片状态和操作
 * @param props Hook 属性
 * @returns 模型卡片展示数据与操作方法
 */
export default function useData({
  model,
  shouldFocusModelName,
  onChangeField,
  onFocusComplete,
  onRequestDelete
}: UseDataProps) {
  // API Key 是否明文显示
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  // 连接测试状态
  const [connectionTestStatus, setConnectionTestStatus] = useState<ConnectionTestStatus>('idle')
  // 连接测试结果文案
  const [connectionTestMessage, setConnectionTestMessage] = useState('')
  // 模型名输入框引用
  const modelNameInputRef = useRef<HTMLInputElement | null>(null)
  // 当前配置签名
  const modelSignature = `${model.model}\u0000${model.baseUrl || ''}\u0000${model.apiKey}`
  // 最新配置签名引用
  const modelSignatureRef = useRef(modelSignature)
  modelSignatureRef.current = modelSignature
  // 是否是内置模型
  const isBuiltIn = Boolean(model.isBuiltInFree)
  // 是否允许删除
  const canDelete = !isBuiltIn
  // 模型标题
  const modelTitle = model.displayName || model.model || '未命名模型'
  // 模型配置校验结果
  const validation = validateModelProfile(model)
  // 是否是 Gemini 模型
  const isGemini = isGeminiModel(model.model)
  // 是否正在测试连接
  const isTestingConnection = connectionTestStatus === 'testing'

  /**
   * 更新模型字段并清除过期测试结果
   * @param key 字段名
   * @param value 字段值
   * @returns 无返回值
   */
  function handleChangeField(key: ModelFieldKey, value: string): void {
    if (key !== 'displayName') {
      setConnectionTestStatus('idle')
      setConnectionTestMessage('')
    }
    onChangeField(model.id, key, value)
  }

  /** 复制 API Key */
  function handleCopyApiKey(): void {
    copyText(model.apiKey)
  }

  /** 请求删除当前模型 */
  function handleRequestDelete(): void {
    onRequestDelete(model)
  }

  /** 切换 API Key 显示状态 */
  function toggleApiKeyVisibility(): void {
    setIsApiKeyVisible((isVisible) => !isVisible)
  }

  /** 测试当前模型连接 */
  async function testConnection(): Promise<void> {
    if (!validation.isValid || isTestingConnection) {
      return
    }
    // 发起测试时的配置签名
    const testedSignature = modelSignature
    setConnectionTestStatus('testing')
    setConnectionTestMessage('正在连接模型…')
    try {
      // 主进程连接测试结果
      const result = (await window.electron.ipcRenderer.invoke(
        SendEnum.TEST_MODEL_CONNECTION,
        model
      )) as ModelConnectionTestResult
      if (modelSignatureRef.current !== testedSignature) {
        return
      }
      setConnectionTestStatus(result.success ? 'success' : 'error')
      setConnectionTestMessage(result.message)
    } catch {
      if (modelSignatureRef.current !== testedSignature) {
        return
      }
      setConnectionTestStatus('error')
      setConnectionTestMessage('连接测试失败，请检查配置后重试')
    }
  }

  /** 新增模型展开后聚焦模型名 */
  useEffect(() => {
    if (!shouldFocusModelName) {
      return
    }
    modelNameInputRef.current?.focus()
    onFocusComplete()
  }, [onFocusComplete, shouldFocusModelName])

  return {
    isApiKeyVisible,
    connectionTestStatus,
    connectionTestMessage,
    modelNameInputRef,
    isBuiltIn,
    canDelete,
    modelTitle,
    validation,
    isGemini,
    isTestingConnection,
    handleChangeField,
    handleCopyApiKey,
    handleRequestDelete,
    toggleApiKeyVisibility,
    testConnection
  }
}
