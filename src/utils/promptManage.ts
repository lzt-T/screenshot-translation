import { TextType } from '../type/base'
import { getTextType } from './ai'

/** 翻译提示词管理器 */
class PromptManage {
  // 当前提示词
  public prompt: string

  /** 初始化提示词管理器 */
  constructor() {
    this.prompt = ``
  }

  /**
   * 获取句子翻译提示词
   * @param {string} text 待翻译句子
   * @returns {string} 句子翻译提示词
   */
  public getSentenceTranslatePrompt(text: string) {
    return `
准确翻译以下句子，并提供至少两组措辞不同的中英文翻译。
中文译文只能包含简体中文和标点，英文术语与专有名词应使用官方中文译名、音译或意译。
英文译文不得包含汉字。翻译应忠实、自然，不添加原文没有的信息。
仅返回 JSON，例如：{"translation":[{"zh":"中文译文","en":"English translation"}],"exampleSentences":null}。

待翻译句子：${text}
`
  }

  /**
   * 获取单词翻译提示词
   * @param {string} text 待翻译单词
   * @returns {string} 单词翻译提示词
   */
  public getWordTranslatePrompt(text: string) {
    return `
分析以下英文单词的常见词性和常用含义，并为每个含义提供语义对应、自然简洁的中英文例句。
词义使用简体中文；中文例句与英文例句必须表达相同含义。
每条英文例句必须包含待分析单词本身或其标准词形变化，不得生成与该单词无关的例句。
优先常见含义，不生成生僻或重复内容；无法确定的信息使用 null，无法生成有效例句时返回 null。
这是单词任务：translation 必须是空数组，所有词性、词义和例句必须写入 exampleSentences；能够生成时至少提供一条例句，无法生成时返回 null。
仅返回 JSON，例如：{"translation":[],"exampleSentences":[{"partOfSpeech":"词性","wordTranslation":"中文词义","zh":"中文例句","en":"English sentence"}]}。

待分析单词：${text}
`
  }

  /**
   * 根据文本类型获取翻译提示词
   * @param {string} text 待翻译文本
   * @returns {string} 翻译提示词
   */
  public getTranslatePrompt(text: string) {
    // 待翻译文本类型
    const textType = getTextType(text)

    if (textType === TextType.WORD) {
      return this.getWordTranslatePrompt(text)
    }
    return this.getSentenceTranslatePrompt(text)
  }
}

// 翻译提示词管理器实例
export const promptManage = new PromptManage()
