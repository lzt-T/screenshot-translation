import { useEffect, useRef, useState } from 'react'
import { SendEnum } from '@src/type/ipc-constants'
import { CopyButton, FooterContainer, OverlayContainer, TranslatedTextOverlay } from './style'

/** 文本边界框 */
interface BoundingBox {
  /* 横坐标 */
  x: number
  /* 纵坐标 */
  y: number
  /* 宽度 */
  width: number
  /* 高度 */
  height: number
}

/** 翻译文本块 */
interface TextBlock {
  /* 文本块 ID */
  id: string
  /* 原始文本 */
  text: string
  /* 翻译文本 */
  translation: string
  /* 是否是单行 */
  isSingleLine: boolean
  /* 文本边界框 */
  boundingBox: BoundingBox
  /* 可选警告信息 */
  warning?: string
}

/** 翻译结果数据 */
interface ResultData {
  /* 是否翻译成功 */
  success: boolean
  /* 翻译文本块 */
  textBlocks: TextBlock[]
  /* 可选结果信息 */
  msg?: string
}

/** 浮层原图显示模式 */
type OverlayMode = 'show-original' | 'hide-original'

/**
 * 渲染原始截图翻译结果浮层
 * @returns {React.JSX.Element} 翻译结果浮层
 */
export default function ResultOverlay(): React.JSX.Element {
  // 可展示的翻译文本块
  const [blocksToRender, setBlocksToRender] = useState<TextBlock[]>([])
  // 当前原图显示模式
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('show-original')
  // 原始文本
  const originalText = useRef('')
  // 翻译文本
  const translatedText = useRef('')

  /**
   * 复制指定文本并通知主进程
   * @param {string} text 待复制文本
   * @returns {void} 无返回值
   */
  function handleCopyText(text: string): void {
    navigator.clipboard.writeText(text)
    window.electron.ipcRenderer.send(SendEnum.COPY_TEXT_SUCCESS)
  }

  /**
   * 复制原文
   * @returns {void} 无返回值
   */
  function copyOriginalText(): void {
    handleCopyText(originalText.current)
  }

  /**
   * 复制译文
   * @returns {void} 无返回值
   */
  function copyTranslatedText(): void {
    handleCopyText(translatedText.current)
  }

  /**
   * 切换原图显示状态
   * @returns {void} 无返回值
   */
  function toggleOverlayMode(): void {
    setOverlayMode((mode) => (mode === 'show-original' ? 'hide-original' : 'show-original'))
  }

  /** 接收并整理翻译结果 */
  useEffect(() => {
    window.electron.ipcRenderer.on(
      SendEnum.DISPLAY_TRANSLATION_RESULT,
      (_event, arg: { result: ResultData }) => {
        // 收到的翻译结果
        const result = arg.result
        setBlocksToRender([])

        if (result?.success && result.textBlocks?.length > 0) {
          // 边界信息有效的翻译文本块
          const validBlocks = result.textBlocks.filter(
            (block) =>
              block.translation &&
              block.boundingBox &&
              typeof block.boundingBox.x === 'number' &&
              typeof block.boundingBox.y === 'number' &&
              typeof block.boundingBox.width === 'number' &&
              typeof block.boundingBox.height === 'number'
          )
          setBlocksToRender(validBlocks)
          originalText.current = validBlocks.map((block) => block.text || '').join('\n')
          translatedText.current = validBlocks.map((block) => block.translation || '').join('\n')
          return
        }

        console.log('[ResultOverlay] 收到不成功的结果或无文本块。错误弹窗应处理显示。')
      }
    )

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_TRANSLATION_RESULT)
    }
  }, [])

  /** 监听 Escape 键关闭浮层 */
  useEffect(() => {
    /**
     * 处理浮层键盘事件
     * @param {KeyboardEvent} event 键盘事件
     * @returns {void} 无返回值
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        window.electron.ipcRenderer.send(SendEnum.RESULT_WINDOW_CLOSE)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <OverlayContainer $overlayMode={overlayMode}>
      {blocksToRender.map((block) => (
        <TranslatedTextOverlay
          key={block.id}
          style={{
            left: `${block.boundingBox.x}px`,
            top: `${block.boundingBox.y}px`,
            width: `${block.boundingBox.width}px`,
            whiteSpace: block.isSingleLine ? 'nowrap' : 'pre-wrap'
          }}
        >
          {block.translation}
        </TranslatedTextOverlay>
      ))}
      <FooterContainer>
        <CopyButton onClick={toggleOverlayMode}>
          {overlayMode === 'show-original' ? '隐藏原图' : '显示原图'}
        </CopyButton>
        <CopyButton onClick={copyOriginalText}>复制原文</CopyButton>
        <CopyButton onClick={copyTranslatedText}>复制译文</CopyButton>
      </FooterContainer>
    </OverlayContainer>
  )
}
