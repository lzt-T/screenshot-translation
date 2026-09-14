## Context

动机见 proposal.md。当前 Electron + React 应用由 `src/utils/speak.ts` 统一管理文本缓存、播放会话、取消与中断续接；主进程 `SpeechService` 调用 Worker 中的 sherpa-onnx Kokoro 输出完整 WAV。首页、学习收藏、对话和选词翻译均调用该统一入口。

设置由 `useLocalForage` 加载，设置页沿用现有保存流程。Kokoro 目前固定速度 1，并按是否含中文选择默认音色。启动初始化与 IPC 已有模型预加载逻辑。当前媒体 CSP 允许本地和 Blob 音频。

## Goals / Non-Goals

**Goals:**
- 用最小的来源适配边界覆盖三种来源，保持现有业务调用方式与对话状态机。
- 固定正常语速，确保配置切换、缓存和异步取消不会串音。
- 设置、播放和第三方协议处理职责清晰，可单独验证。

**Non-Goals:**
- 不增加有道词典音频、语速调节、自动回退、流式播放、音色克隆或多服务并发合成。
- 不替换语音识别，不移除 Kokoro 模型，不引入 Vue、通用插件框架或全局 Event Bus。
- 不顺带重构既有设置、翻译模型和大型对话文件。

## Decisions

### 1. 来源配置与现有设置并存

新增独立语音设置项，包含来源键 `browser`、`kokoro`、`third-party`、浏览器音色标识、Kokoro 音色标识，以及当前第三方服务商键和按服务商键保存的配置映射。每个服务商保留一套配置，字段按实际协议包含 API 地址、凭据、模型、音色及必要地域等，不创建多账号配置管理。无语速字段。浏览器与 Kokoro 均保留「自动（按文本语言）」选项，旧配置默认 Kokoro 自动音色。

沿用 localForage 和现有保存反馈，保留非当前来源配置。统一朗读入口每次请求读取最新已保存语音设置，完成读取后固定本次快照；同源已打开窗口因此不依赖 Hook 的旧快照。实施前核实相关窗口使用同一存储源；若窗口隔离存储，通过现有主进程 IPC 提供同一配置读取来源，不引入第二份独立配置。

试听显式传入设置页当前有效配置快照，避免自动保存延迟导致试听旧音色。选择此方案而非创建全局状态库，是因为配置量小、变化频率低，现有持久化已能承担配置来源。

### 2. 保留统一会话控制，使用函数分发表

`speakText` 和 `stopSpeaking` 继续作为业务入口。根据固定来源键选择播放函数；适配函数负责自己的启动、正常完成、错误与取消。会话编号和中断续接仅由统一调度管理，供应方不得重复调用业务回调。

浏览器直接播放语音；Kokoro 与第三方返回音频供现有 Blob 播放能力使用。不要强行把浏览器 TTS 转为音频文件。现有 WAV 播放封装仅扩展真实需要的 MIME 类型参数。

新请求先使旧会话失效并停止旧播放；浏览器执行 cancel，第三方请求使用 AbortController，Kokoro 沿用取消消息。所有异步响应和播放事件检查会话是否仍有效。缓存仍仅保留最近一次音频，但匹配条件扩展为文本及生成配置；配置变更令缓存失效，不把明文 API Key 拼入可记录的缓存键。

此处是固定来源到行为的分发，无需类继承、模板方法或职责链。

### 3. 浏览器音色在 Electron 中枚举

使用 `speechSynthesis.getVoices()` 与 `voiceschanged` 更新列表，保存可匹配的 voiceURI 及必要语言信息，不持久化浏览器对象。正常语速为 rate=1，保持默认音高。自动模式依文本语言选择可用音色；明确选定但已失效的音色应提示重新选择。

语言匹配忽略大小写并将下划线转为连字符，按语言子标签精确匹配。自动模式优先匹配该语言的默认音色；无匹配项或列表为空时不设置 voice，仅设置 en-US 或 zh-CN 并立即请求浏览器朗读，以实际错误或 5 秒启动超时判定失败。此行为只在浏览器来源内部选择音色，不回退到其他来源。

明确指定的 voiceURI 若暂不可用，保留 voiceschanged 监听并在请求开始后最多等待 5 秒，仍未找到时提示重新选择。正常开始播放后清理超时，结束和取消后移除事件；取消后迟到的音色更新不触发播放。切换音色清除旧试听及错误，避免旧回调重新显示过期错误。设置中不宣称所有设备都具有某个音色，也不承诺浏览器来源离线可用。

### 4. Kokoro 延续现有模型与音色默认值

从随包模型 README/元数据核对可用音色与 speaker ID，仅展示模型实际支持的项。将用户选择传至现有 IPC、SpeechService 与 Worker；自动模式继续使用英文 0、中文 3 的现有规则，生成速度固定为 1，保留首播静音缓冲与标点规范化。

不替换模型或为音色引入新推理依赖。此次保留现有预加载生命周期，避免扩大首播修复范围；选择其他来源不会请求 Kokoro 合成，但仍可能因既有预加载占用内存。

### 5. 第三方请求放在主进程，按服务商分发

首批明确实现 MiMo、OpenAI、Azure Speech、ElevenLabs 和阿里云百炼五个服务，服务商键分别为 `mimo`、`openai`、`azure-speech`、`elevenlabs`、`aliyun-bailian`。每家实现前查阅其官方语音文档，记录文档链接、鉴权方式、必要地域、请求字段、可用模型/音色、正常语速和响应音频格式。这里的 OpenAI 指官方语音 API，Azure 指 Azure Speech 服务，阿里云指百炼平台语音能力，不将同厂商不同产品或任意兼容接口混为一项。

使用「服务商键 → 合成函数」分发表，每个适配只处理该服务的鉴权、请求和音频响应；输出统一音频字节与 MIME，复用取消、超时和播放能力。使用「服务商键 → 字段说明」静态映射描述所需配置、标签与已核实默认值。不要为简单字段增加通用动态表单引擎，不强制所有供应商提供模型或地域字段。

优先使用项目已有请求能力；若某服务协议需要成熟 SDK，先评估官方 SDK 并确认项目包管理器后接入，不为五家服务预先安装全部 SDK。不得以翻译模型名称、Chat Completions 或所谓 OpenAI 兼容接口推定语音协议，也不得提交只显示配置却无法合成的占位适配。逐家完成后验收，本次计划完成条件覆盖全部五家；缺少某家凭据时单独记录未验证，不能用其他服务的成功代替。

模型与音色采用官方已确认值或用户输入，API 地址不硬编码未经核实的默认值。客户端不增加语速字段；服务端可省略速度时使用正常默认值，否则按文档发送正常速度，不假定所有服务都以数值 1 表示正常速度。使用项目已有网络/代理能力，设置有限请求超时和主动取消，处理音频响应及服务错误。若服务返回音频 URL，主进程按官方协议获取音频，再以字节和实际 MIME 类型经 IPC 返回，沿用 Blob 播放，不放宽渲染进程 CSP。

凭据独立于翻译模型配置及其他服务商配置，默认遮蔽并按项目现有凭据持久化方式保存，不复制到日志、错误或示例。每次请求仅向当前服务发送其对应凭据；切换服务商不自动复制配置、不自动试听、不自动回退。缓存匹配包含服务商、地址及该服务有效生成参数。保存配置不自动调用收费服务，只有明确试听或业务朗读才发送文本。官方协议核对是实现任务的前置工作；若目标服务并未提供所需能力，应报告阻塞并修订提案，不能用其他厂商静默替代。

### 6. 设置 UI 复用既有组件

第三方模型与音色复用 Select，下拉包含「自定义…」，展开 Input 时保留原值。自定义展开状态仅存在字段组件内，不持久化；旧值属于预置时选中，否则显示自定义。服务商切换重建字段，音色字段在模型变化后按新目录重新判断显示方式，但不修改保存的音色。API 地址与密钥仍为输入框；Azure 不显示模型，ElevenLabs 音色始终填写账号 Voice ID。

预置目录由语音领域模块统一提供，模型到音色使用对象映射。仅当模型已知且音色属于该服务已知目录、但不在此模型支持列表时，校验返回音色错误，禁用试听并阻止合成请求；未知自定义值交由服务端校验，不把目录当作完整白名单。修改模型或音色停止当前试听并清除旧错误，旧回调不能恢复状态；展开自定义输入本身不保存、不自动试听。公共接口、持久化结构和请求协议不变。

#### 下拉目录核对（2026-09-14）

| 服务 | 本次预置 | 官方依据 |
| --- | --- | --- |
| MiMo | mimo-v2.5-tts；mimo_default、冰糖、白桦、Mia、Chloe、Milo、Dean | https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5 和 https://mimo.mi.com/docs/zh-CN/api/audio/tts，已读取正文。 |
| OpenAI | gpt-4o-mini-tts、gpt-4o-mini-tts-2025-12-15；alloy、ash、ballad、coral、echo、fable、onyx、nova、sage、shimmer、verse、marin、cedar | 已安装官方 openai@6.49.0 的 src/resources/audio/speech.ts 模型类型及内置音色说明。https://platform.openai.com/docs/guides/text-to-speech 与 https://developers.openai.com/api/docs/guides/text-to-speech 本次仍返回 403；不推定旧 tts-1 系列支持相同音色，旧模型值保留为自定义。 |
| Azure Speech | en-US-JennyNeural、en-US-GuyNeural、zh-CN-XiaoxiaoNeural、zh-CN-YunxiNeural | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts，已核对列表；仅为常用子集，不承诺账号或地域可用性。 |
| ElevenLabs | eleven_multilingual_v2、eleven_flash_v2_5；音色手填 Voice ID | https://elevenlabs.io/docs/models，已核对多语言及 Flash 模型。不加入需要额外核对的 v3 系列或账号音色目录。 |
| 百炼 | qwen3-tts-flash、qwen3-tts-flash-2025-11-27：Cherry、Serena、Ethan、Chelsie；qwen3-tts-flash-2025-09-18：Cherry、Ethan | https://help.aliyun.com/zh/model-studio/qwen-tts-api 和 https://help.aliyun.com/zh/model-studio/qwen-tts-voice-list，已读取模型和音色支持表；Serena、Chelsie 未列为旧快照支持项。 |

不新增目录网络请求或依赖。预置为经核实的常用子集，自定义入口保留新增模型和其他音色的使用方式；它不扩展当前适配器的请求协议。

新增独立语音设置区域，复用选择框、输入框、按钮和保存反馈。第三方来源先展示服务商选择，再展示当前服务对应字段，切回某家恢复其保存配置。组件展示来源及相关字段；有必要时用语音设置 Hook 管理音色列表、试听状态和生命周期，合成与协议转换留在语音模块。试听使用固定英文文本，展示准备中、播放中、停止和错误，切换来源、第三方服务商或卸载时释放本次试听。

来源说明使用「启动通常较快，取决于系统音色」「本地合成，支持离线」「联网生成，取决于服务商」，不把“快”或“生动”当作保证。配置标签及布局遵循现有设置页风格，不做全页重设计。

## Risks / Trade-offs

### 实施核对记录（2026-09-14）

| 服务 | 协议依据 | 已采用的请求与响应 |
| --- | --- | --- |
| MiMo | https://mimo.mi.com/docs/zh-CN/api/audio/tts 、https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5 | POST `https://api.xiaomimimo.com/v1/chat/completions`；`api-key`；`mimo-v2.5-tts`；assistant 消息指定文本，audio.voice 指定预置音色，WAV Base64 位于 choices[0].message.audio.data；不添加速度或风格指令。 |
| OpenAI | 项目已有官方 SDK `openai@6.49.0` 的 `src/resources/audio/speech.ts`（由官方 OpenAPI 生成）；https://platform.openai.com/docs/guides/text-to-speech 本次访问返回 403 | POST `/v1/audio/speech`；Bearer；input/model/voice/response_format=wav/speed=1，返回二进制；网页资料未验证，用已安装官方协议类型作为实现依据，未新增 SDK。 |
| Azure Speech | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech | 地域端点 `/cognitiveservices/v1`；Ocp-Apim-Subscription-Key；SSML 文本及 voice，无模型参数；riff-24khz-16bit-mono-pcm；使用默认语速。地域由完整端点表达，不再增加重复地域字段。 |
| ElevenLabs | https://elevenlabs.io/docs/api-reference/text-to-speech/convert | POST `/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128`；xi-api-key；text/model_id/voice_settings.speed=1；MP3 二进制。 |
| 阿里云百炼 | https://help.aliyun.com/zh/model-studio/qwen-tts-api | POST `/api/v1/services/aigc/multimodal-generation/generation`；Bearer；qwen3-tts-flash；input.text/voice/language_type=Auto；读取 output.audio.url 后下载音频，下载不携带 API Key；地域由端点表达。 |

- 模型音色依据：https://k2-fsa.github.io/sherpa/onnx/tts/all/Chinese-English/kokoro-multi-lang-v1_1.html 。已提取并核对 103 个 speaker ID 映射；0=af_maple、1=af_sol、2=bf_vale、3=zf_001，自动模式继续使用 0/3。
- 网络使用 Electron `net.fetch`，沿用 `src/main/utils/proxy.ts` 设置的默认会话代理。窗口未设置独立 partition；现有选词翻译属于主渲染上下文，业务入口统一读取 localForage 的 speech 配置。实际窗口重启与持久化仍待动态验收。
- SDK 与依赖管理沿用现有 pnpm-lock.yaml，本次没有新增依赖。试听通过配置快照直接调用，正常朗读仅读取成功写入 localForage 的配置；设置页未保存的编辑不作为正常朗读来源。
- 第三方取消按渲染窗口维护 AbortController，60 秒超时覆盖生成和下载；WAV/MP3 检查容器标识后交给现有音频播放。第三方错误采用不含响应正文与凭据的提示。
- 实际验证范围与剩余动态验收见 verification.md。

- [Electron 可用音色与外部浏览器不同] → 在目标 Electron 验证枚举、英文播放与缺失提示，外部试听不能替代验收。
- [五家第三方协议、地域及账号权限不同且尚未逐家验证] → 分别核对官方协议并维护逐家验收记录；真实调用需各自可用凭据，未取得时明确记录未验证，不宣称端到端完成。
- [异步取消与自动监听发生竞争] → 三种来源统一使用会话有效性检查，覆盖停止、抢占、失败和延后续接路径。
- [旧缓存播放了不同音色的声音] → 缓存匹配生成配置快照，配置变化失效。
- [现有 Kokoro 预加载仍占内存] → 保留本次范围，若后续需要按来源节省内存再单独调整预加载策略。

## Migration Plan

1. 先增加缺省配置与类型，再接入三种来源与 UI，保持旧配置可以正常读取。
2. 保留原 Kokoro 默认音色及既有调用参数语义；核对所有朗读入口均走统一调度。
3. 按规格场景验收默认迁移、来源切换、音色、试听、失败、取消、缓存和对话续接。
4. 回滚时恢复旧朗读入口，新增语音设置键可保留并被旧版本忽略，无需迁移数据库或删除用户配置。

验证遵守项目约束：未获明确授权不运行 package.json 脚本，也不绕过脚本执行其内容。浏览器控制禁令继续适用；此前单次试听授权不扩展为实现验收授权。无法执行的动态检查明确标记未验证。
