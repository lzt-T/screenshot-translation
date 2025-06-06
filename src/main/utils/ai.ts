import { Model } from "../../type/model";
import { setGeminiClient } from "../../utils/geminiAi";
import { setZhipuClient } from "../../utils/glmAi";
import { setOpenaiClient } from "../../utils/gptAi"; 
import { setDeepSeekClient } from "../../utils/deepseekAi";

/** 设置 AI 客户端 */
export function setAiClient(apiKeys: {
  [Model.GEMINI]: string,
  [Model.GLM]: string,
  [Model.GPT]: string,
  [Model.DEEP_SEEK]: string
}): void {

  if(apiKeys[Model.GEMINI]){
    setGeminiClient(apiKeys[Model.GEMINI])
  }
  if(apiKeys[Model.GLM]){
    setZhipuClient(apiKeys[Model.GLM])
  }
  if(apiKeys[Model.GPT]){
    setOpenaiClient(apiKeys[Model.GPT])
  }
  if(apiKeys[Model.DEEP_SEEK]){
    setDeepSeekClient(apiKeys[Model.DEEP_SEEK])
  }

}
