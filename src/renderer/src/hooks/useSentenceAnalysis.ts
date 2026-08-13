import { useRef, useState } from 'react'
import type { Language, LearningAnalysis, SentenceAnalysisRequest } from '@src/type/base'
import { SendEnum } from '@src/type/ipc-constants'

/** 管理句子学习分析请求和展示状态 */
export default function useSentenceAnalysis() {
  // 句子分析结果
  const [sentenceAnalysis, setSentenceAnalysis] = useState<LearningAnalysis | null>(null)
  // 是否正在分析句子
  const [isSentenceAnalysisLoading, setIsSentenceAnalysisLoading] = useState(false)
  // 句子分析错误信息
  const [sentenceAnalysisError, setSentenceAnalysisError] = useState('')
  // 当前有效的句子分析请求编号
  const activeRequestId = useRef(0)

  /** 清空句子分析并使未完成请求失效 */
  function resetSentenceAnalysis(): void {
    activeRequestId.current += 1
    setSentenceAnalysis(null)
    setIsSentenceAnalysisLoading(false)
    setSentenceAnalysisError('')
  }

  /**
   * 分析指定句子的学习内容
   * @param sourceLanguage 原文语言
   * @param sourceText 待分析原文
   * @param translatedText 已展示的主译文
   */
  async function analyzeSentence(
    sourceLanguage: Language,
    sourceText: string,
    translatedText: string
  ): Promise<void> {
    if (!translatedText.trim()) {
      setSentenceAnalysisError('缺少可供分析的主译文，请重新翻译后再试')
      return
    }

    // 本次请求编号
    const requestId = activeRequestId.current + 1
    // 句子分析请求参数
    const request: SentenceAnalysisRequest = { sourceLanguage, sourceText, translatedText }
    activeRequestId.current = requestId
    setSentenceAnalysis(null)
    setSentenceAnalysisError('')
    setIsSentenceAnalysisLoading(true)

    try {
      // 主进程句子分析结果
      const analysis = (await window.electron.ipcRenderer.invoke(
        SendEnum.SENTENCE_ANALYSIS,
        request
      )) as LearningAnalysis
      if (requestId === activeRequestId.current) {
        setSentenceAnalysis(analysis)
      }
    } catch (error) {
      if (requestId !== activeRequestId.current) {
        return
      }
      // 可展示的分析错误
      const message = error instanceof Error ? error.message : '学习分析失败，请稍后重试'
      setSentenceAnalysisError(message)
    } finally {
      if (requestId === activeRequestId.current) {
        setIsSentenceAnalysisLoading(false)
      }
    }
  }

  return {
    sentenceAnalysis,
    isSentenceAnalysisLoading,
    sentenceAnalysisError,
    analyzeSentence,
    resetSentenceAnalysis
  }
}
