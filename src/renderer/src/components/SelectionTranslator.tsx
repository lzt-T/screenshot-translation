import * as DialogPrimitive from '@radix-ui/react-dialog'
import React, { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Copy, Languages, Loader2, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { Language, TranslateResponse } from '@src/type/base'
import { SendEnum } from '@src/type/ipc-constants'
import { copyText } from '@src/utils/copy'

/** 不参与划词翻译的交互元素 */
const IGNORED_SELECTION_SELECTOR =
  'input, textarea, button, a, select, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="textbox"], [data-selection-translate-ignore]'

/** 浮动按钮距离窗口边缘的最小距离 */
const FLOATING_BUTTON_EDGE_GAP = 48

/** 浮动按钮与选区的间距 */
const FLOATING_BUTTON_SELECTION_GAP = 8

/** 语言展示名映射 */
const LANGUAGE_LABELS: Record<Language, string> = {
  [Language.ZH]: '中文',
  [Language.EN]: '英文',
  [Language.ZH_AND_EN]: '中英混合'
}

/** 待翻译选区信息 */
interface SelectionCandidate {
  /* 选中文本 */
  text: string
  /* 浮动按钮横坐标 */
  left: number
  /* 浮动按钮纵坐标 */
  top: number
  /* 是否显示在选区下方 */
  isBelowSelection: boolean
}

/** 划词翻译组件属性 */
interface SelectionTranslatorProps {
  /* 被监听的正文内容 */
  children: React.ReactNode
  /* 容器附加样式 */
  className?: string
}

/**
 * 获取文本节点对应的元素
 * @param node 选区节点
 * @returns 对应元素或空值
 */
function getSelectionElement(node: Node | null): Element | null {
  if (!node) {
    return null
  }
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
}

/**
 * 判断选区端点是否位于被忽略的交互元素中
 * @param node 选区端点
 * @returns 是否应忽略
 */
function isIgnoredSelectionNode(node: Node | null): boolean {
  // 选区端点对应元素
  const element = getSelectionElement(node)
  return Boolean(element?.closest(IGNORED_SELECTION_SELECTOR))
}

/**
 * 获取当前容器中的有效选区
 * @param rootElement 划词监听容器
 * @returns 选区文本与按钮位置
 */
function getSelectionCandidate(rootElement: HTMLElement): SelectionCandidate | null {
  // 浏览器当前选区
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }
  if (
    !rootElement.contains(selection.anchorNode) ||
    !rootElement.contains(selection.focusNode) ||
    isIgnoredSelectionNode(selection.anchorNode) ||
    isIgnoredSelectionNode(selection.focusNode)
  ) {
    return null
  }

  // 去除首尾空白的选中文本
  const text = selection.toString().trim()
  if (!text) {
    return null
  }

  // 选区可视边界
  const selectionRect = selection.getRangeAt(0).getBoundingClientRect()
  if (selectionRect.width === 0 && selectionRect.height === 0) {
    return null
  }

  // 选区上方是否有足够空间
  const hasRoomAbove = selectionRect.top > FLOATING_BUTTON_EDGE_GAP
  // 浮动按钮横坐标
  const left = Math.min(
    Math.max(selectionRect.left + selectionRect.width / 2, FLOATING_BUTTON_EDGE_GAP),
    window.innerWidth - FLOATING_BUTTON_EDGE_GAP
  )
  // 浮动按钮纵坐标
  const top = hasRoomAbove
    ? selectionRect.top - FLOATING_BUTTON_SELECTION_GAP
    : selectionRect.bottom + FLOATING_BUTTON_SELECTION_GAP

  return { text, left, top, isBelowSelection: !hasRoomAbove }
}

/**
 * 提取适合抽屉展示的直译文本
 * @param result 完整翻译结果
 * @returns 去重后的直译文本
 */
function getDirectTranslation(result: TranslateResponse | null): string {
  if (!result) {
    return ''
  }

  // 当前目标语言对应的译文字段
  const translationTexts = result.translation.flatMap((item) => {
    if (result.targetLanguage === Language.ZH) {
      return item.zh ? [item.zh] : []
    }
    if (result.targetLanguage === Language.EN) {
      return item.en ? [item.en] : []
    }
    return [item.en, item.zh].filter((text): text is string => Boolean(text))
  })
  if (translationTexts.length > 0) {
    return [...new Set(translationTexts)].join('\n')
  }

  // 英文单词结果中的词义文本
  const wordTranslationTexts = (result.exampleSentences || [])
    .map((item) => item.wordTranslation)
    .filter((text): text is string => Boolean(text))
  return [...new Set(wordTranslationTexts)].join('\n')
}

/**
 * 渲染可复用的全局划词翻译能力
 * @param props 组件属性
 * @returns 划词监听容器与翻译抽屉
 */
export default function SelectionTranslator({
  children,
  className
}: SelectionTranslatorProps): React.JSX.Element {
  // 正文监听容器
  const rootRef = useRef<HTMLDivElement>(null)
  // 最新翻译请求序号
  const activeRequestId = useRef(0)
  // 当前待翻译选区
  const [selectionCandidate, setSelectionCandidate] = useState<SelectionCandidate | null>(null)
  // 抽屉是否打开
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  // 抽屉中的原文
  const [sourceText, setSourceText] = useState('')
  // 划词翻译结果
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null)
  // 是否正在翻译
  const [isLoading, setIsLoading] = useState(false)
  // 可展示的翻译错误
  const [errorMessage, setErrorMessage] = useState('')
  // 抽屉中的直译文本
  const translatedText = getDirectTranslation(translationResult)
  // 自动识别后的翻译方向
  const translationDirection = translationResult
    ? `${LANGUAGE_LABELS[translationResult.sourceLanguage]} → ${LANGUAGE_LABELS[translationResult.targetLanguage]}`
    : '自动识别语言'

  /** 隐藏选区浮动按钮 */
  function dismissSelectionCandidate(): void {
    setSelectionCandidate(null)
  }

  /**
   * 发起指定文本的划词翻译
   * @param text 待翻译文本
   * @returns 翻译完成时结束
   */
  async function translateSelection(text: string): Promise<void> {
    // 本次请求序号
    const requestId = activeRequestId.current + 1
    activeRequestId.current = requestId
    setSourceText(text)
    setTranslationResult(null)
    setErrorMessage('')
    setIsLoading(true)
    setIsDrawerOpen(true)

    try {
      // 主进程划词翻译结果
      const result = (await window.electron.ipcRenderer.invoke(
        SendEnum.SELECTION_TRANSLATION,
        text
      )) as TranslateResponse
      if (requestId !== activeRequestId.current) {
        return
      }
      setTranslationResult(result)
    } catch (error) {
      if (requestId !== activeRequestId.current) {
        return
      }
      // 可展示的请求错误
      const message = error instanceof Error ? error.message : '划词翻译失败，请稍后重试'
      setErrorMessage(message)
    } finally {
      if (requestId === activeRequestId.current) {
        setIsLoading(false)
      }
    }
  }

  /** 点击浮动按钮并开始翻译 */
  function handleTranslateClick(): void {
    if (!selectionCandidate) {
      return
    }
    // 已确认的选中文本
    const selectedText = selectionCandidate.text
    dismissSelectionCandidate()
    window.getSelection()?.removeAllRanges()
    void translateSelection(selectedText)
  }

  /** 重试当前划词翻译 */
  function handleRetry(): void {
    if (sourceText) {
      void translateSelection(sourceText)
    }
  }

  /**
   * 响应抽屉开关变化
   * @param isOpen 下一开关状态
   */
  function handleDrawerOpenChange(isOpen: boolean): void {
    setIsDrawerOpen(isOpen)
    if (!isOpen) {
      activeRequestId.current += 1
      setIsLoading(false)
    }
  }

  /** 保留原始文本选区，避免按钮按下时清空选择 */
  function handleFloatingButtonPointerDown(event: React.PointerEvent<HTMLButtonElement>): void {
    event.preventDefault()
  }

  /** 监听选择完成、滚动与窗口变化 */
  useEffect(() => {
    /** 读取并更新当前选区 */
    function updateCurrentSelection(): void {
      // 当前正文监听容器
      const rootElement = rootRef.current
      setSelectionCandidate(rootElement ? getSelectionCandidate(rootElement) : null)
    }

    /** 鼠标选择完成后读取选区 */
    function handlePointerUp(): void {
      updateCurrentSelection()
    }

    /** 键盘选择完成或按下 Escape 后更新状态 */
    function handleKeyUp(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setSelectionCandidate(null)
        return
      }
      updateCurrentSelection()
    }

    /** 页面滚动或缩放后隐藏已失效的位置 */
    function handleViewportChange(): void {
      setSelectionCandidate(null)
    }

    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)

    return () => {
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [])

  return (
    <>
      <div className={cn('min-h-full', className)} ref={rootRef}>
        {children}
      </div>

      {selectionCandidate && (
        <Button
          aria-label="翻译选中的文本"
          className={cn(
            'fixed z-[70] h-9 -translate-x-1/2 cursor-pointer rounded-lg px-3 shadow-[0_10px_24px_-14px_var(--action-shadow)]',
            selectionCandidate.isBelowSelection ? '' : '-translate-y-full'
          )}
          onClick={handleTranslateClick}
          onPointerDown={handleFloatingButtonPointerDown}
          style={{ left: selectionCandidate.left, top: selectionCandidate.top }}
          type="button"
        >
          <Languages size={15} />
          翻译
        </Button>
      )}

      <DialogPrimitive.Root
        modal={false}
        onOpenChange={handleDrawerOpenChange}
        open={isDrawerOpen}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            aria-describedby="selection-translation-description"
            className={cn(
              'fixed inset-y-0 right-0 z-[60] flex w-[min(360px,calc(100vw-16px))] flex-col bg-card text-card-foreground shadow-[-18px_0_44px_-30px_var(--foreground)] outline-none',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-5 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-5 duration-200'
            )}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <header className="flex min-h-16 items-center justify-between border-b border-border px-5">
              <div>
                <DialogPrimitive.Title className="text-base font-semibold">
                  划词翻译
                </DialogPrimitive.Title>
                <p className="mt-1 text-xs text-muted-foreground">{translationDirection}</p>
              </div>
              <DialogPrimitive.Close asChild>
                <Button aria-label="关闭划词翻译" className="size-8" size="icon" variant="ghost">
                  <X size={16} />
                </Button>
              </DialogPrimitive.Close>
            </header>

            <DialogPrimitive.Description
              className="sr-only"
              id="selection-translation-description"
            >
              查看选中文本及其自动识别语言后的直译结果
            </DialogPrimitive.Description>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
              <section className="border-b border-border px-5 py-5">
                <p className="measurement-label">选中原文</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {sourceText}
                </p>
              </section>

              <section className="px-5 py-5" aria-live="polite">
                <div className="flex min-h-8 items-center justify-between gap-3">
                  <p className="measurement-label">直译结果</p>
                  {translatedText && !isLoading && (
                    <Button
                      aria-label="复制直译结果"
                      className="size-8"
                      onClick={() => copyText(translatedText)}
                      size="icon"
                      title="复制直译结果"
                      variant="ghost"
                    >
                      <Copy size={14} />
                    </Button>
                  )}
                </div>

                {isLoading && (
                  <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                    <Loader2 className="animate-spin text-primary" size={18} />
                    正在识别并翻译选中文本…
                  </div>
                )}

                {errorMessage && !isLoading && (
                  <div className="py-6" role="alert">
                    <div className="flex items-start gap-3 text-destructive">
                      <CircleAlert className="mt-0.5 shrink-0" size={18} />
                      <p className="break-words text-sm leading-6">{errorMessage}</p>
                    </div>
                    <Button className="mt-4" onClick={handleRetry} size="sm" variant="outline">
                      重新翻译
                    </Button>
                  </div>
                )}

                {translationResult && !isLoading && !errorMessage && (
                  <div className="pt-3">
                    <div className="mb-3 flex items-center gap-2 text-xs text-primary">
                      <Check size={14} />
                      翻译完成
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 text-foreground">
                      {translatedText || '未返回可展示的译文'}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
