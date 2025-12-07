import { ipcMain } from "electron"
import { SendEnum } from "../../type/ipc-constants"
import { aiManage } from "../utils/aiManage"
import { getErrorMessage } from "../utils/error"
import { parseJson } from "../../utils/ai"
import { ExampleSentence, Language, TextType, TranslateResponse } from "../../type/base"
import { getTextType, getLanguageType, getTargetLanguage } from "../../utils/ai"

export const registerTranslationIpcEvents = () => {

  /** 英汉互译 */
  ipcMain.on(SendEnum.ENGLISH_CHINESE_TRANSLATION, async (event, text) => {
    try {
      let resultData: TranslateResponse | null = {
        textType: getTextType(text),
        sourceLanguage: getLanguageType(text),
        targetLanguage: getTargetLanguage(text),
        sourceWords: text,
        translation: [],
        exampleSentences: null
      }
      const translateResult = await aiManage.englishChineseTranslation(text)
      if (!translateResult.success) {
        throw new Error(translateResult.msg || '英汉互译失败')
      }

      let data = parseJson(translateResult.translation) as unknown as TranslateResponse

      if (resultData.textType === TextType.SENTENCE) {
        if ([Language.ZH_AND_EN, Language.EN].includes(resultData.targetLanguage)) {
          // 去除重复重复的en翻译
          let tempStr: string[] = []
          data.translation = data.translation.map((item: { en: string | null, zh: string | null }) => {
            if (item.en && !tempStr.includes(item.en)) {
              tempStr.push(item.en)
              return item
            }
            return { en: null, zh: null }
          })

          data.translation = data.translation.filter((item: { en: string | null, zh: string | null }) => item.en !== null)
        }
      }

      resultData.exampleSentences = data.exampleSentences || []
      resultData.translation = data.translation || []

      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_SUCCESS, resultData)
    } catch (error) {
      event.reply(SendEnum.ENGLISH_CHINESE_TRANSLATION_FAIL, getErrorMessage(error))
    }
  })

}
