import React, { useEffect, useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ModelFieldKey, TranslationModelProfile } from '@src/type/model'
import { DEFAULT_ACTIVE_MODEL_ID } from '@src/utils/modelProfiles'
import ModelConfigCard from '../ModelConfigCard'
import DeleteModelConfirmDialog from '../DeleteModelConfirmDialog'
import ResetModelConfirmDialog from '../ResetModelConfirmDialog'
import { SaveStatus } from '../../useData'

/** 自动保存状态文案映射 */
const SAVE_STATUS_TEXT: Readonly<Record<SaveStatus, string>> = {
  idle: '自动保存',
  saving: '保存中…',
  saved: '已自动保存',
  error: '保存失败，请重试'
}

/** 模型配置区域属性 */
interface ModelConfigurationSectionProps {
  /* 模型配置区域引用 */
  sectionRef: React.RefObject<HTMLElement | null>
  /* 模型配置列表 */
  models: TranslationModelProfile[]
  /* 当前使用模型 ID */
  activeModelId: string
  /* 自动保存状态 */
  saveStatus: SaveStatus
  /* 外部定位高亮状态 */
  isHighlighted: boolean
  /* 更新模型字段 */
  onChangeField: (modelId: string, key: ModelFieldKey, value: string) => void
  /* 设置当前模型 */
  onSetActiveModel: (modelId: string) => Promise<boolean>
  /* 新增模型 */
  onAddModel: () => TranslationModelProfile
  /* 删除模型 */
  onRemoveModel: (modelId: string) => Promise<boolean>
  /* 重置模型 */
  onResetModels: () => Promise<boolean>
}

/**
 * 渲染可折叠的模型配置区域
 * @param props 模型配置属性
 * @returns 模型配置区域节点
 */
const ModelConfigurationSection: React.FC<ModelConfigurationSectionProps> = ({
  sectionRef,
  models,
  activeModelId,
  saveStatus,
  isHighlighted,
  onChangeField,
  onSetActiveModel,
  onAddModel,
  onRemoveModel,
  onResetModels
}) => {
  // 当前展开的模型 ID
  const [expandedModelId, setExpandedModelId] = useState<string | null>(activeModelId)
  // 新增后需要聚焦的模型 ID
  const [focusModelId, setFocusModelId] = useState<string | null>(null)
  // 待删除模型
  const [pendingRemoveModel, setPendingRemoveModel] = useState<TranslationModelProfile | null>(null)
  // 重置确认弹窗状态
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  // 是否正在重置
  const [isResetting, setIsResetting] = useState(false)
  // 自定义模型数量
  const customModelCount = models.filter((model) => !model.isBuiltInFree).length
  // 是否存在可重置内容
  const canReset = customModelCount > 0 || activeModelId !== DEFAULT_ACTIVE_MODEL_ID
  // 保存状态文案
  const saveStatusText = SAVE_STATUS_TEXT[saveStatus]

  /**
   * 切换模型卡片展开状态
   * @param modelId 模型 ID
   * @returns 无返回值
   */
  const toggleModel = (modelId: string): void => {
    setExpandedModelId((currentId) => (currentId === modelId ? null : modelId))
  }

  /** 新增并定位自定义模型 */
  const handleAddModel = (): void => {
    // 新增的模型配置
    const newModel = onAddModel()
    setExpandedModelId(newModel.id)
    setFocusModelId(newModel.id)
  }

  /**
   * 激活并展开模型
   * @param modelId 模型 ID
   * @returns 无返回值
   */
  const handleSetActiveModel = (modelId: string): void => {
    setExpandedModelId(modelId)
    void onSetActiveModel(modelId)
  }

  /** 确认删除模型 */
  const handleConfirmRemove = (): void => {
    if (!pendingRemoveModel) {
      return
    }
    // 待删除模型 ID
    const modelId = pendingRemoveModel.id
    setPendingRemoveModel(null)
    void onRemoveModel(modelId).then(() => {
      if (expandedModelId === modelId) {
        setExpandedModelId(DEFAULT_ACTIVE_MODEL_ID)
      }
    })
  }

  /** 确认重置模型配置 */
  const handleConfirmReset = (): void => {
    setIsResetting(true)
    void onResetModels().then(() => {
      setIsResetting(false)
      setIsResetDialogOpen(false)
      setExpandedModelId(DEFAULT_ACTIVE_MODEL_ID)
      setFocusModelId(null)
    })
  }

  /** 当前模型变化后同步展开对应卡片 */
  useEffect(() => {
    setExpandedModelId(activeModelId)
  }, [activeModelId])

  return (
    <section
      aria-labelledby="model-config-title"
      className={`space-y-3 rounded-lg border border-transparent transition-[background-color,border-color,padding] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 ${isHighlighted ? 'border-primary/45 bg-primary/6 p-3' : ''}`}
      id="model-config-section"
      ref={sectionRef}
      tabIndex={-1}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-base font-semibold text-foreground"
            id="model-config-title"
          >
            模型配置
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">管理翻译引擎与连接凭据。</p>
          <p
            aria-live="polite"
            className={`mt-2 text-xs ${saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {saveStatusText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="cursor-pointer"
            disabled={!canReset}
            onClick={() => setIsResetDialogOpen(true)}
            type="button"
            variant="outline"
            size="sm"
          >
            <RotateCcw size={14} />
            重置配置
          </Button>
          <Button className="cursor-pointer" onClick={handleAddModel} size="sm" type="button">
            <Plus size={14} />
            新增自定义模型
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Gemini 模型将直接连接 Google；其他模型请填写 API 根地址。
      </p>

      <div className="space-y-2">
        {models.map((model) => (
          <ModelConfigCard
            isActive={model.id === activeModelId}
            isExpanded={model.id === expandedModelId}
            key={model.id}
            model={model}
            onChangeField={onChangeField}
            onFocusComplete={() => setFocusModelId(null)}
            onRequestDelete={setPendingRemoveModel}
            onSetActive={handleSetActiveModel}
            onToggle={toggleModel}
            shouldFocusModelName={model.id === focusModelId}
          />
        ))}
      </div>

      <DeleteModelConfirmDialog
        modelName={pendingRemoveModel?.displayName || pendingRemoveModel?.model}
        onCancel={() => setPendingRemoveModel(null)}
        onConfirm={handleConfirmRemove}
        open={Boolean(pendingRemoveModel)}
      />
      <ResetModelConfirmDialog
        customModelCount={customModelCount}
        isResetting={isResetting}
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        open={isResetDialogOpen}
      />
    </section>
  )
}

export default ModelConfigurationSection
