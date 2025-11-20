import { TargetLanguage } from "./model"

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

export interface TranslateResponse {
  /* 入口类型 */
  textType: TextType;
  /* 源语言 */
  sourceLanguage: Language;
  /* 目标语言 */
  targetLanguage: Language;
  /* 源文本 */
  sourceWords: string;
  /* 通用翻译结果 */
  translation: {
    /* 词性  如果是单词，则词性为单词的词性 */
    partOfSpeech: string | null
    zh: string | null;
    en: string | null;
  }[]

  /* 只有单词才有例句 */
  exampleSentences: {
    /* 词性 */
    partOfSpeech: string | null
    zh: string | null
    en: string | null
  }[] | null
}
