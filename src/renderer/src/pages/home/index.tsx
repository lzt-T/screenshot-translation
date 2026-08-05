import React from 'react'
import { Copy, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import { copyText } from '@src/utils/copy'
import '../../scroll.css'
import Header from './components/Header'
import ResultView from './components/ResultView'
import useData from './useData'

/**
 * 渲染主翻译工作台
 * @returns {React.JSX.Element} 首页节点
 */
export default function HomePage(): React.JSX.Element {
  // 首页状态和交互方法
  const {
    isLoading,
    isSpeakingInput,
    speakingResultIndex,
    canAnalyzeSentence,
    isSentenceAnalysisLoading,
    sentenceAnalysis,
    sentenceAnalysisError,
    translationText,
    translationError,
    translationResult,
    bookmarkedItemId,
    isBookmarkSaving,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    onAnalyzeSentence,
    toggleBookmark,
    speakInputText,
    speakResultItem
  } = useData()
  // 当前是否存在输入文本
  const hasInputText = Boolean(translationText.trim())

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col px-5 py-5 lg:px-7 lg:py-6">
      <Header onScreenshot={onScreenshot} />

      <section className="lab-panel mt-5 grid min-h-0 flex-1 grid-cols-1 overflow-hidden min-[900px]:grid-cols-[minmax(250px,0.72fr)_minmax(360px,1fr)] lg:min-h-[calc(100dvh-8.75rem)]">
        <div className="flex min-h-72 flex-col overflow-hidden border-b border-border transition-[box-shadow] focus-within:shadow-[inset_0_0_0_2px_color-mix(in_oklab,var(--ring)_45%,transparent)] min-[900px]:min-h-0 min-[900px]:border-r min-[900px]:border-b-0">
          <div className="flex h-12 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-medium text-foreground">原文</span>
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
                aria-label={isSpeakingInput ? '停止朗读原文' : '朗读原文'}
                aria-pressed={isSpeakingInput}
                className={cn('size-8 cursor-pointer', !hasInputText && 'cursor-not-allowed')}
                disabled={!hasInputText}
                onClick={speakInputText}
                size="icon"
                title={isSpeakingInput ? '停止朗读原文' : '朗读原文'}
                variant="ghost"
              >
                {isSpeakingInput ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </Button>
            </div>
          </div>
          <Textarea
            aria-describedby="translation-shortcuts"
            className="custom-scrollbar min-h-40 flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-4 text-[15px] leading-7 focus-visible:ring-0"
            disabled={isLoading}
            onChange={handleInputTextChange}
            onKeyDown={handleKeyDown}
            placeholder="输入中文或英文"
          />
          <div className="flex min-h-12 items-center justify-between gap-3 border-t border-border px-4 py-2">
            <p className="text-[11px] leading-5 text-muted-foreground" id="translation-shortcuts">
              Enter 翻译 · Shift + Enter 换行
            </p>
            <Button
              className={cn('shrink-0 cursor-pointer', (!hasInputText || isLoading) && 'cursor-not-allowed')}
              disabled={!hasInputText || isLoading}
              onClick={onEnglishChineseTranslation}
              size="sm"
              variant="outline"
            >
              {isLoading ? '翻译中' : '翻译'}
            </Button>
          </div>
        </div>

        <ResultView
          canAnalyzeSentence={canAnalyzeSentence}
          errorMessage={translationError}
          isLoading={isLoading}
          isSentenceAnalysisLoading={isSentenceAnalysisLoading}
          isBookmarked={Boolean(bookmarkedItemId)}
          isBookmarkSaving={isBookmarkSaving}
          onAnalyzeSentence={onAnalyzeSentence}
          onToggleBookmark={toggleBookmark}
          onCopyItem={copyText}
          onRetry={onEnglishChineseTranslation}
          onSpeakItem={speakResultItem}
          result={translationResult}
          sentenceAnalysis={sentenceAnalysis}
          sentenceAnalysisError={sentenceAnalysisError}
          speakingItemIndex={speakingResultIndex}
        />
      </section>
    </div>
  )
}
