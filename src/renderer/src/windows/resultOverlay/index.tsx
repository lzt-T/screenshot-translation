import { useState, useEffect, useCallback, useRef } from 'react'
import { CopyButton, FooterContainer, OverlayContainer, TranslatedTextOverlay } from './style'
import { SendEnum } from '@src/type/ipc-constants'

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

interface TextBlock {
  id: string
  text: string // 原文在某些情况下可能丢失
  translation: string
  /** 是否是单行 */
  isSingleLine: boolean
  boundingBox: BoundingBox
  warning?: string
}

interface ResultData {
  success: boolean
  textBlocks: TextBlock[]
  msg?: string
}

type OverlayMode = 'show-original' | 'hide-original'

const ResultOverlay = () => {
  const [blocksToRender, setBlocksToRender] = useState<TextBlock[]>([])
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('show-original')

  /** 原始文本 */
  const originalText = useRef('')

  /** 翻译文本 */
  const translatedText = useRef('')

  useEffect(() => {
    window.electron.ipcRenderer.on(
      SendEnum.DISPLAY_TRANSLATION_RESULT,
      (event, arg: { result: ResultData }) => {
        const result = arg.result
        setBlocksToRender([])

        // 仅在成功且有文本块时处理
        if (result && result.success && result.textBlocks && result.textBlocks.length > 0) {
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
        } else {
          console.log('[ResultOverlay] 收到不成功的结果或无文本块。错误弹窗应处理显示。')
        }
      }
    )

    return () => {
      window.electron.ipcRenderer.removeAllListeners(SendEnum.DISPLAY_TRANSLATION_RESULT)
    }
  }, [])

  // 关闭窗口的处理程序 (用于 Esc)
  const handleClose = useCallback(() => {
    window.electron.ipcRenderer.send(SendEnum.RESULT_WINDOW_CLOSE)
  }, [])

  // 处理 Escape 键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    },
    [handleClose]
  )

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    window.electron.ipcRenderer.send(SendEnum.COPY_TEXT_SUCCESS)
  }, [])

  /** 复制原文 */
  const copyOriginalText = useCallback(() => {
    handleCopyText(originalText.current)
  }, [handleCopyText])

  /** 复制译文 */
  const copyTranslatedText = useCallback(() => {
    handleCopyText(translatedText.current)
  }, [handleCopyText])

  /** 切换原图显示状态 */
  const toggleOverlayMode = useCallback(() => {
    setOverlayMode((mode) => (mode === 'show-original' ? 'hide-original' : 'show-original'))
  }, [])

  // 添加/移除键盘事件监听器
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <OverlayContainer $overlayMode={overlayMode}>
      {blocksToRender.map((block) =>
        block.boundingBox ? (
          <TranslatedTextOverlay
            key={block.id}
            style={{
              left: `${block.boundingBox.x}px`,
              top: `${block.boundingBox.y}px`,
              width: `${block.boundingBox.width}px`,
              ...(block.isSingleLine ? {
                //单行显示
                whiteSpace: 'nowrap'
              } : {
              })
            }}
          >
            {block.translation}
          </TranslatedTextOverlay>
        ) : null
      )}
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

export default ResultOverlay
