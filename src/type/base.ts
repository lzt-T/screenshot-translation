/* 文本类型 */
export enum TextType {
  /* 单词 */
  WORD = 'word',
  /* 句子 */
  SENTENCE = 'sentence',
}

export enum Language {
  /* 中文 */
  ZH = 'zh',
  /* 英文 */
  EN = 'en',
  /* 中英文混合 */
  ZH_AND_EN = 'zh-and-en',
}

export interface ExampleSentence {
  /* 词性 */
  partOfSpeech: string | null;
  /* 这个词性对应的单词翻译 */
  wordTranslation: string | null;
  /* 例句中文 */
  zh: string | null;
  /* 例句英文 */
  en: string | null
}

export interface TranslateResponse {
  /* 入口类型 */
  textType: TextType;
  /* 源语言 */
  sourceLanguage: Language;
  /* 目标语言 */
  targetLanguage: Language;
  /* 源文本 */
  sourceWords: string;
  /* 只有句子才有翻译结果 */
  translation: {
    zh: string | null;
    en: string | null;
  }[]

  /* 只有单词才有例句 */
  exampleSentences: ExampleSentence[] | null
}

/** 句子结构分块 */
export interface SentenceAnalysisChunk {
  /* 英文意群 */
  text: string
  /* 句法角色 */
  role: string
  /* 中文含义 */
  meaning: string
}

/** 句子关键短语 */
export interface SentenceAnalysisPhrase {
  /* 英文短语 */
  phrase: string
  /* 中文解释 */
  meaning: string
}

/** 句子语法点 */
export interface SentenceAnalysisGrammarPoint {
  /* 语法点名称 */
  name: string
  /* 中文说明 */
  explanation: string
}

/** 单句分析结果 */
export interface SentenceAnalysisItem {
  /* 原始英文句子 */
  sourceText: string
  /* 句子结构概述 */
  structureSummary: string
  /* 句子结构分块 */
  chunks: SentenceAnalysisChunk[]
  /* 关键短语 */
  keyPhrases: SentenceAnalysisPhrase[]
  /* 语法点 */
  grammarPoints: SentenceAnalysisGrammarPoint[]
}

/** 英文句子分析结果 */
export interface SentenceAnalysis {
  /* 按原文顺序排列的句子 */
  sentences: SentenceAnalysisItem[]
}

/** 中文译英关键表达 */
export interface TranslationInsightExpression {
  /* 英文表达 */
  expression: string
  /* 中文说明 */
  explanation: string
}

/** 中文译英翻译要点 */
export interface TranslationInsights {
  /* 分析类型 */
  type: 'translation-insights'
  /* 中文原文 */
  sourceText: string
  /* 英文主译文 */
  translatedText: string
  /* 英文表达思路 */
  expressionStrategy: string
  /* 值得学习的关键表达 */
  keyExpressions: TranslationInsightExpression[]
}

/** 可收藏的句子学习分析 */
export type LearningAnalysis = SentenceAnalysis | TranslationInsights

/** 句子学习分析请求 */
export interface SentenceAnalysisRequest {
  /* 原文语言 */
  sourceLanguage: Language
  /* 待分析原文 */
  sourceText: string
  /* 已展示的主译文 */
  translatedText: string
}
