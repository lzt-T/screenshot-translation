import React from 'react'
import { Copy, Loader2, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import { copyText } from '@src/utils/copy'
import '../../scroll.css'
import Header from './Header'
import ResultView from './ResultView'
import useData from './useData'

/**
 * 渲染主翻译工作台
 * @returns {React.JSX.Element} 首页节点
 */
export default function HomePage(): React.JSX.Element {
  // 首页状态和交互方法
  const {
    isLoading,
    isSpeaking,
    translationText,
    translationResult,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    speakInputText
  } = useData()
  // 当前是否存在输入文本
  const hasInputText = Boolean(translationText.trim())

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-8 lg:px-10 lg:py-10">
      <Header onScreenshot={onScreenshot} />

      <section className="mt-7 grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(250px,0.8fr)_minmax(330px,1.2fr)]">
        <div className="lab-panel flex min-h-56 flex-col overflow-hidden">
          <div className="flex h-12 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-3">
              <span className="measurement-label">Source sample</span>
              {isLoading && <Loader2 size={14} className="animate-spin text-primary" />}
            </div>
            <div className="flex items-center gap-1">
              <Button
                aria-label="复制输入文本"
                className={cn('size-8 cursor-pointer', !hasInputText && 'cursor-not-allowed')}
                disabled={!hasInputText}
                onClick={() => copyText(translationText)}
                size="icon"
                title="复制输入文本"
                variant="ghost"
              >
                <Copy size={14} />
              </Button>
              <Button
                aria-label={isSpeaking ? '停止朗读' : '朗读输入文本'}
                className={cn('size-8 cursor-pointer', !hasInputText && 'cursor-not-allowed')}
                disabled={!hasInputText}
                onClick={speakInputText}
                size="icon"
                title={isSpeaking ? '停止朗读' : '朗读输入文本'}
                variant="ghost"
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea
            className="custom-scrollbar min-h-48 flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-4 text-[15px] leading-7 shadow-none focus-visible:ring-0"
            onChange={handleInputTextChange}
            onKeyDown={handleKeyDown}
            placeholder="输入中文或英文，按 Enter 互译，Shift + Enter 换行"
          />
        </div>

        <ResultView isLoading={isLoading} result={translationResult} />
      </section>
    </div>
  )
}
