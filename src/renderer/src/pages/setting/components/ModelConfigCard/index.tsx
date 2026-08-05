import React from 'react'
import { ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { ChevronDown, Copy, Eye, EyeOff, LoaderCircle, PlugZap, Trash2 } from 'lucide-react'
import useData, { ConnectionTestStatus } from './useData'
import { cn } from '@renderer/lib/utils'

/** 连接测试状态标签映射 */
const CONNECTION_STATUS_TEXT: Readonly<Record<ConnectionTestStatus, string>> = {
  idle: '',
  testing: '测试中',
  success: '测试通过',
  error: '测试失败'
}

/** 模型配置卡片属性 */
interface ModelConfigCardProps {
  /* 当前模型 */
  model: TranslationModelProfile
  /* 是否为当前使用模型 */
  isActive: boolean
  /* 是否展开 */
  isExpanded: boolean
  /* 是否需要聚焦模型名 */
  shouldFocusModelName: boolean
  /* 字段变更回调 */
  onChangeField: (modelId: string, key: ModelFieldKey, value: string) => void
  /* 展开状态回调 */
  onToggle: (modelId: string) => void
  /* 激活模型回调 */
  onSetActive: (modelId: string) => void
  /* 聚焦完成回调 */
  onFocusComplete: () => void
  /* 请求删除回调 */
  onRequestDelete: (model: TranslationModelProfile) => void
}

/**
 * 渲染可折叠的模型配置卡片
 * @param props 组件属性
 * @returns 卡片节点
 */
const ModelConfigCard: React.FC<ModelConfigCardProps> = ({
  model,
  isActive,
  isExpanded,
  shouldFocusModelName,
  onChangeField,
  onToggle,
  onSetActive,
  onFocusComplete,
  onRequestDelete
}) => {
  // 卡片数据与事件
  const {
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
  } = useData({
    model,
    shouldFocusModelName,
    onChangeField,
    onFocusComplete,
    onRequestDelete
  })
  // 卡片内容区域 ID
  const contentId = `model-config-${model.id}`
  // 字段 ID
  const fieldIds = {
    displayName: `model-display-name-${model.id}`,
    model: `model-name-${model.id}`,
    baseUrl: `model-base-url-${model.id}`,
    apiKey: `model-api-key-${model.id}`
  }
  // Base URL 帮助 ID
  const baseUrlHelpId = `${fieldIds.baseUrl}-help`
  // 模型名错误 ID
  const modelErrorId = `${fieldIds.model}-error`
  // API Key 错误 ID
  const apiKeyErrorId = `${fieldIds.apiKey}-error`
  // 连接状态标签
  const connectionStatusText = CONNECTION_STATUS_TEXT[connectionTestStatus]

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card', isActive && 'border-primary/40')}>
      <div className="flex items-center gap-2 p-3 sm:p-4">
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
          onClick={() => onToggle(model.id)}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
            size={16}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground sm:text-base">
              {modelTitle}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {model.model || '等待填写模型名'}
            </span>
          </span>
          <span className="hidden flex-wrap justify-end gap-1.5 sm:flex">
            {isActive && (
              <Badge className="border-primary/40 bg-primary/8 text-primary" variant="outline">
                当前使用
              </Badge>
            )}
            {isBuiltIn && (
              <Badge className="border-border bg-muted/70 text-muted-foreground" variant="outline">
                免费
              </Badge>
            )}
            {!isBuiltIn && (
              <Badge
                className={
                  validation.isValid
                    ? 'border-border bg-muted/70 text-muted-foreground'
                    : 'border-destructive/40 bg-destructive/8 text-destructive'
                }
                variant="outline"
              >
                {validation.isValid ? '配置完整' : '配置不完整'}
              </Badge>
            )}
            {connectionStatusText && (
              <Badge
                className={
                  connectionTestStatus === 'error'
                    ? 'border-destructive/40 bg-destructive/8 text-destructive'
                    : 'border-border bg-muted/70 text-muted-foreground'
                }
                variant="outline"
              >
                {connectionStatusText}
              </Badge>
            )}
          </span>
        </button>
        {canDelete && (
          <Button
            aria-label={`删除模型 ${modelTitle}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={handleRequestDelete}
            size="icon"
            title="删除模型"
            type="button"
            variant="ghost"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-5 border-t border-border p-4 sm:p-5" id={contentId}>
          <div className="flex flex-wrap gap-1.5 sm:hidden">
            {isActive && (
              <Badge className="border-primary/40 bg-primary/8 text-primary" variant="outline">
                当前使用
              </Badge>
            )}
            {isBuiltIn && (
              <Badge className="border-border bg-muted/70 text-muted-foreground" variant="outline">
                免费
              </Badge>
            )}
            {!isBuiltIn && (
              <Badge
                className={
                  validation.isValid
                    ? 'border-border bg-muted/70 text-muted-foreground'
                    : 'border-destructive/40 bg-destructive/8 text-destructive'
                }
                variant="outline"
              >
                {validation.isValid ? '配置完整' : '配置不完整'}
              </Badge>
            )}
            {connectionStatusText && (
              <Badge
                className={
                  connectionTestStatus === 'error'
                    ? 'border-destructive/40 bg-destructive/8 text-destructive'
                    : 'border-border bg-muted/70 text-muted-foreground'
                }
                variant="outline"
              >
                {connectionStatusText}
              </Badge>
            )}
          </div>

          {isBuiltIn ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">模型名</dt>
                <dd className="mt-1 break-words font-medium text-foreground">{model.model}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">API Key</dt>
                <dd className="mt-1 font-medium text-foreground">无需 API Key，由应用内置提供</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Base URL</dt>
                <dd className="mt-1 break-all font-medium text-foreground">{model.baseUrl}</dd>
              </div>
            </dl>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={fieldIds.displayName}>显示名称</Label>
                  <Input
                    id={fieldIds.displayName}
                    onChange={(event) => handleChangeField('displayName', event.target.value)}
                    placeholder="模型显示名"
                    value={model.displayName || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={fieldIds.model}>模型名</Label>
                  <Input
                    aria-describedby={validation.errors.model ? modelErrorId : undefined}
                    aria-invalid={Boolean(validation.errors.model)}
                    id={fieldIds.model}
                    onChange={(event) => handleChangeField('model', event.target.value)}
                    placeholder="输入模型名，如 gpt-4.1"
                    ref={modelNameInputRef}
                    value={model.model}
                  />
                  {validation.errors.model && (
                    <p className="text-xs text-destructive" id={modelErrorId}>
                      {validation.errors.model}
                    </p>
                  )}
                </div>
              </div>

              {!isGemini && (
                <div className="space-y-2">
                  <Label htmlFor={fieldIds.baseUrl}>Base URL</Label>
                  <Input
                    aria-describedby={baseUrlHelpId}
                    aria-invalid={Boolean(validation.errors.baseUrl)}
                    id={fieldIds.baseUrl}
                    onChange={(event) => handleChangeField('baseUrl', event.target.value)}
                    placeholder="输入 Base URL，如 https://api.openai.com/v1"
                    value={model.baseUrl || ''}
                  />
                  <p
                    className={cn(
                      'text-xs leading-relaxed',
                      validation.errors.baseUrl ? 'text-destructive' : 'text-muted-foreground'
                    )}
                    id={baseUrlHelpId}
                  >
                    {validation.errors.baseUrl || '填写 API 根地址，不要包含 /chat/completions。'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={fieldIds.apiKey}>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    aria-describedby={validation.errors.apiKey ? apiKeyErrorId : undefined}
                    aria-invalid={Boolean(validation.errors.apiKey)}
                    className="min-w-0 flex-1"
                    id={fieldIds.apiKey}
                    onChange={(event) => handleChangeField('apiKey', event.target.value)}
                    type={isApiKeyVisible ? 'text' : 'password'}
                    value={model.apiKey}
                  />
                  <Button
                    aria-label={isApiKeyVisible ? '隐藏 API Key' : '显示 API Key'}
                    onClick={toggleApiKeyVisibility}
                    size="icon"
                    title={isApiKeyVisible ? '隐藏 API Key' : '显示 API Key'}
                    type="button"
                    variant="outline"
                  >
                    {isApiKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  <Button
                    aria-label="复制 API Key"
                    disabled={!model.apiKey}
                    onClick={handleCopyApiKey}
                    size="icon"
                    title="复制 API Key"
                    type="button"
                    variant="outline"
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                {validation.errors.apiKey && (
                  <p className="text-xs text-destructive" id={apiKeyErrorId}>
                    {validation.errors.apiKey}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-w-0 text-xs" role="status">
              {connectionTestMessage && (
                <span
                  className={
                    connectionTestStatus === 'error'
                      ? 'break-words text-destructive'
                      : 'text-muted-foreground'
                  }
                >
                  {connectionTestMessage}
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!isBuiltIn && (
                <Button
                  disabled={!validation.isValid || isTestingConnection}
                  onClick={() => void testConnection()}
                  type="button"
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <LoaderCircle className="animate-spin" size={14} />
                  ) : (
                    <PlugZap size={14} />
                  )}
                  {isTestingConnection ? '测试中…' : '测试连接'}
                </Button>
              )}
              {!isActive && (
                <Button
                  disabled={!validation.isValid}
                  onClick={() => onSetActive(model.id)}
                  type="button"
                >
                  设为当前模型
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelConfigCard
