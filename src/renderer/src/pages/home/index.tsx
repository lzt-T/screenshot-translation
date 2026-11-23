import React from 'react'
import { ClipboardPaste, Eraser, History, SendHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Language } from '@src/type/base'
import CopyIconButton from '@renderer/components/CopyIconButton'
import SpeakingIndicator from '@renderer/components/SpeakingIndicator'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/utils'
import { copyText } from '@src/utils/copy'
import ResultView from './components/ResultView'
import useData from './useData'

/**
 * 渲染精装双页式翻译工作台
 * @returns {React.JSX.Element} 首页节点
 */
export default function HomePage(): React.JSX.Element {
  const navigate = useNavigate()
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
    recentItems,
    clearInputText,
    handleInputTextChange,
    handleKeyDown,
    onScreenshot,
    onEnglishChineseTranslation,
    translateSampleText,
    pasteAndTranslate,
    selectRecentItem,
    clearRecentHistory,
    onAnalyzeSentence,
    toggleBookmark,
    speakInputText,
    speakResultItem
  } = useData()
  const hasInputText = Boolean(translationText.trim())
  const visibleRecentItems = recentItems.slice(0, 3)

  /** 将当前英文语境直接送入口语对话练习 */
  const handlePracticeSpeech = (): void => {
    if (!translationResult) {
      return
    }
    const englishText =
      translationResult.sourceLanguage === Language.ZH
        ? translationResult.translation.map((item) => item.en).filter(Boolean).join(' ')
        : translationResult.sourceWords || translationText.trim()
    navigate('/conversation', {
      state: { practiceText: englishText.trim() }
    })
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1200px] flex-col px-5 py-4 min-[780px]:h-full min-[780px]:min-h-0 min-[780px]:overflow-hidden lg:px-7 lg:py-5">
      <h1 className="sr-only">翻译台</h1>

      <section className="lexicon-sheet grid flex-1 grid-cols-1 overflow-hidden min-[780px]:min-h-0 min-[780px]:grid-cols-[minmax(280px,0.88fr)_minmax(360px,1.12fr)]">
        <div className="lexicon-spine flex min-h-64 flex-col overflow-hidden border-b border-border/80 min-[780px]:min-h-0 min-[780px]:border-r min-[780px]:border-b-0">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/55 px-5">
            <span className="text-xs font-medium text-muted-foreground">自动识别语言</span>
            <div
              className={cn(
                'flex items-center gap-0.5 transition-opacity duration-150',
                hasInputText ? 'opacity-100' : 'opacity-45 hover:opacity-90'
              )}
            >
              {hasInputText && (
                <Button
                  aria-label="清空原文"
                  className="size-7.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  onClick={clearInputText}
                  size="icon"
                  title="清空原文"
                  variant="ghost"
                >
                  <Eraser size={14} />
                </Button>
              )}
              <CopyIconButton
                ariaLabel="复制输入文本"
                disabled={!hasInputText}
                onCopy={() => copyText(translationText)}
                title="复制输入文本"
              />
              <Button
                aria-label={isSpeakingInput ? '停止朗读原文' : '朗读原文'}
                aria-pressed={isSpeakingInput}
                className={cn(
                  'size-7.5 cursor-pointer',
                  !hasInputText && 'cursor-not-allowed',
                  isSpeakingInput && 'text-foreground'
                )}
                disabled={!hasInputText}
                onClick={speakInputText}
                size="icon"
                title={isSpeakingInput ? '停止朗读原文' : '朗读原文'}
                variant="ghost"
              >
                <SpeakingIndicator isSpeaking={isSpeakingInput} />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <Textarea
              aria-describedby="translation-shortcuts"
              aria-label="输入中文或英文进行翻译"
              className="custom-scrollbar min-h-36 flex-1 resize-none rounded-none border-0 bg-transparent px-6 py-5 text-[15px] leading-7 focus-visible:ring-0"
              disabled={isLoading}
              onChange={handleInputTextChange}
              onKeyDown={handleKeyDown}
              placeholder="输入英文或中文，按 Enter 立即翻译…"
              value={translationText}
            />

            {!hasInputText && (
              <div className="shrink-0 space-y-3 px-6 pb-4">
                <div>
                  <Button
                    className="h-8 cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                    onClick={() => void pasteAndTranslate()}
                    size="sm"
                    variant="outline"
                  >
                    <ClipboardPaste size={13} />
                    粘贴并翻译
                  </Button>
                </div>

                {visibleRecentItems.length > 0 && (
                  <div className="border-t border-border/55 pt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <History size={12} />
                        最近翻译
                      </span>
                      <button
                        className="cursor-pointer rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground/85 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                        onClick={clearRecentHistory}
                        type="button"
                      >
                        清空
                      </button>
                    </div>
                    <div className="-mx-2 space-y-0.5">
                      {visibleRecentItems.map((item) => (
                        <button
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45"
                          key={item.id}
                          onClick={() => selectRecentItem(item)}
                          type="button"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                            {item.sourceText}
                          </span>
                          {item.previewText && (
                            <span className="max-w-[42%] shrink-0 truncate text-xs text-muted-foreground">
                              {item.previewText}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex min-h-13 shrink-0 items-center justify-between gap-3 border-t border-border/55 px-5 py-2.5">
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground" id="translation-shortcuts">
              <span>Enter 翻译 · Shift+Enter 换行</span>
              {hasInputText && (
                <span className="font-mono text-[11px] text-muted-foreground/75">
                  · {translationText.trim().length} 字
                </span>
              )}
            </div>
            <Button
              className={cn('shrink-0 cursor-pointer', (!hasInputText || isLoading) && 'cursor-not-allowed')}
              disabled={!hasInputText || isLoading}
              onClick={() => onEnglishChineseTranslation()}
              size="sm"
              variant={hasInputText ? 'default' : 'outline'}
            >
              <SendHorizontal size={14} />
              {isLoading ? '翻译中' : '翻译'}
            </Button>
          </div>
        </div>

        <ResultView
          canAnalyzeSentence={canAnalyzeSentence}
          errorMessage={translationError}
          isBookmarked={Boolean(bookmarkedItemId)}
          isBookmarkSaving={isBookmarkSaving}
          isLoading={isLoading}
          isSentenceAnalysisLoading={isSentenceAnalysisLoading}
          onAnalyzeSentence={onAnalyzeSentence}
          onCopyItem={copyText}
          onPracticeSpeech={handlePracticeSpeech}
          onRetry={() => onEnglishChineseTranslation()}
          onScreenshot={onScreenshot}
          onSelectSample={translateSampleText}
          onSpeakItem={speakResultItem}
          onToggleBookmark={toggleBookmark}
          result={translationResult}
          sentenceAnalysis={sentenceAnalysis}
          sentenceAnalysisError={sentenceAnalysisError}
          speakingItemIndex={speakingResultIndex}
        />
      </section>
    </div>
  )
}
