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
