import React from 'react'
import { ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  LoaderCircle,
  PlugZap,
  Trash2
} from 'lucide-react'
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
  // 显示名称与模型名一致时无需重复副标题
  const showModelSubtitle = !model.model || model.model.trim() !== modelTitle.trim()
  // 卡片底栏协议静默说明
  const protocolHint = isBuiltIn
    ? '由应用内置提供，无需额外配置'
    : isGemini
      ? '已自动匹配 Google Gemini 官方直连接口'
      : 'OpenAI 兼容接口协议'

  return (
    <div
      className={cn(
        'lexicon-panel overflow-hidden transition-[border-color,box-shadow] duration-150',
        isActive && 'border-primary/35 shadow-xs'
      )}
    >
      <div className="flex items-center gap-2 px-3.5 py-3 sm:px-4">
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
          onClick={() => onToggle(model.id)}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'shrink-0 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
            size={16}
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground sm:text-base">
                {modelTitle}
              </span>
              {isBuiltIn && <Badge variant="secondary">免费</Badge>}
              {!isBuiltIn && !validation.isValid && (
                <Badge variant="destructive">配置不完整</Badge>
              )}
              {!isExpanded && connectionStatusText && (
                <Badge
                  className={
                    connectionTestStatus === 'success'
                      ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/12 dark:text-emerald-300'
                      : undefined
                  }
                  variant={connectionTestStatus === 'error' ? 'destructive' : 'secondary'}
                >
                  {connectionStatusText}
                </Badge>
              )}
            </span>
            {showModelSubtitle && (
              <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                {model.model || '等待填写模型名'}
              </span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {isActive ? (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-emerald-600/20 bg-emerald-600/10 px-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/12 dark:text-emerald-300">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
              />
              当前使用
            </span>
          ) : (
            <Button
              className="h-7 shrink-0 cursor-pointer px-2.5 text-xs"
              disabled={!validation.isValid}
              onClick={() => onSetActive(model.id)}
              size="sm"
              title={validation.isValid ? '设为当前使用模型' : '请先展开并完善模型配置'}
              type="button"
              variant="outline"
            >
              启用
            </Button>
          )}
          {canDelete && (
            <Button
              aria-label={`删除模型 ${modelTitle}`}
              className="size-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
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
      </div>

      {isExpanded && (
        <div
          className="lexicon-reveal space-y-4 border-t border-border bg-reading-surface/35 p-4 sm:px-5 sm:py-4"
          id={contentId}
        >
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
                    className="bg-background/60 transition-colors focus-visible:bg-card"
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
                    className="bg-background/60 transition-colors focus-visible:bg-card"
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
                    className="bg-background/60 transition-colors focus-visible:bg-card"
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
                    className="min-w-0 flex-1 bg-background/60 transition-colors focus-visible:bg-card"
                    id={fieldIds.apiKey}
                    onChange={(event) => handleChangeField('apiKey', event.target.value)}
                    type={isApiKeyVisible ? 'text' : 'password'}
                    value={model.apiKey}
                  />
                  <Button
                    aria-label={isApiKeyVisible ? '隐藏 API Key' : '显示 API Key'}
                    className="cursor-pointer"
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
                    className="cursor-pointer"
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

          <div className="flex flex-col gap-3 border-t border-border/80 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-w-0 text-xs" role="status">
              {connectionTestMessage ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 break-words',
                    connectionTestStatus === 'error'
                      ? 'text-destructive'
                      : connectionTestStatus === 'success'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-muted-foreground'
                  )}
                >
                  {connectionTestStatus === 'success' && (
                    <CheckCircle2 className="shrink-0" size={14} />
                  )}
                  {connectionTestStatus === 'error' && (
                    <AlertCircle className="shrink-0" size={14} />
                  )}
                  <span>{connectionTestMessage}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{protocolHint}</span>
              )}
            </div>
            {!isBuiltIn && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  className="cursor-pointer"
                  disabled={!validation.isValid || isTestingConnection}
                  onClick={() => void testConnection()}
                  size="sm"
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelConfigCard
