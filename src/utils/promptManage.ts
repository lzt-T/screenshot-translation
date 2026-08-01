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
   * 获取英文句子分析提示词
   * @param {string} sourceText 待分析英文原文
   * @param {string} translation 已展示的中文译文
   * @returns {string} 英文句子分析提示词
   */
  public getSentenceAnalysisPrompt(sourceText: string, translation: string) {
    return `
逐句分析以下英文原文，帮助中文用户理解句子结构、关键短语和语法。
必须覆盖原文中的全部句子并保持原有顺序；sourceText 必须原样保留对应的完整英文句子。
chunks 必须按照原句顺序拆分为连续意群，并分别给出简明句法角色和当前语境中的中文含义。
structureSummary 只概括句子主干与从句关系；keyPhrases 和 grammarPoints 必须使用数组，没有合适内容时返回空数组。
参考译文仅用于保持解释一致，不要重新翻译，不要扩展语气、文化背景、相似例句或深度语言学内容。
所有解释使用简体中文。仅返回一个可被 JSON.parse 直接解析的 JSON 对象，不要使用 Markdown 代码块，不要添加解释。
JSON 结构示例：{"sentences":[{"sourceText":"Original English sentence.","structureSummary":"句子主干与从句关系","chunks":[{"text":"Original English sentence","role":"句法角色","meaning":"中文含义"}],"keyPhrases":[{"phrase":"English phrase","meaning":"中文解释"}],"grammarPoints":[{"name":"语法点名称","explanation":"结合原句的中文说明"}]}]}

英文原文：${sourceText}
参考译文：${translation}
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
