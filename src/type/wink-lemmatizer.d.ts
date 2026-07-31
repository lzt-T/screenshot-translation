/** wink-lemmatizer 词形还原器 */
declare module 'wink-lemmatizer' {
  /** 英文词形还原接口 */
  interface Lemmatizer {
    /** 还原名词 */
    noun(word: string): string
    /** 还原动词 */
    verb(word: string): string
    /** 还原形容词 */
    adjective(word: string): string
  }

  // 词形还原器实例
  const lemmatize: Lemmatizer

  export = lemmatize
}
