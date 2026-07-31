import React from 'react'
import { TranslationModelProfile } from '@src/type/model'
import { Input } from '@renderer/components/ui/input'
import { Badge } from '@renderer/components/ui/badge'
import { Copy, Trash2 } from 'lucide-react'
import useData, { ModelFieldKey } from './useData'

/** 模型配置卡片属性 */
interface ModelConfigCardProps {
  /* 当前模型 */
  model: TranslationModelProfile
  /* 字段变更回调 */
  onChangeField: (modelId: string, key: ModelFieldKey, value: string) => void
  /* 请求删除回调 */
  onRequestDelete: (model: TranslationModelProfile) => void
}

/**
 * 模型配置卡片
 * @param {ModelConfigCardProps} props 组件属性
 * @returns {React.JSX.Element} 卡片节点
 */
const ModelConfigCard: React.FC<ModelConfigCardProps> = ({ model, onChangeField, onRequestDelete }) => {
  // 卡片数据与事件
  const {
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
  } = useData({ model, onChangeField, onRequestDelete })

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
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
            onClick={handleRequestDelete}
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
            value={model.displayName || ''}
            onChange={(event) => handleDisplayNameChange(event.target.value)}
            disabled={isBuiltIn}
            placeholder="模型显示名"
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">模型名</div>
          <Input
            value={model.model}
            onChange={(event) => handleModelNameChange(event.target.value)}
            placeholder="输入模型名，如 gpt-4.1"
            disabled={isBuiltIn}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Base URL</div>
        <Input
          value={model.baseUrl || ''}
          onChange={(event) => handleBaseUrlChange(event.target.value)}
          placeholder="输入 Base URL，如 https://api.openai.com/v1"
          disabled={isBuiltIn}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          填写 API 根地址，如 https://api.openai.com/v1；不要填写完整的
          /chat/completions，特殊网关请以其文档为准。
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">API Key</div>
        <div className="flex gap-2 items-center">
          <Input
            value={apiKeyInputValue}
            type="password"
            onChange={(event) => handleApiKeyChange(event.target.value)}
            className="w-full"
            disabled={isBuiltIn}
          />
          {!isBuiltIn && (
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
              onClick={handleCopyApiKey}
              title="复制API Key"
            >
              <Copy size={14} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModelConfigCard
