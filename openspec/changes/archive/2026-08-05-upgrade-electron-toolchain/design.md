## Context

项目在 Node.js 22.17.0 上使用 pnpm 10.28.1。当前锁文件解析到 Electron 35.7.5、electron-vite 3.1.0 与 Vite 6.3.6、electron-builder 25.1.8、electron-updater 6.6.2，以及 better-sqlite3 12.11.1。应用包含三个 Vite 主进程入口、多个 renderer 入口、原生 SQLite 绑定、平台专用的 sherpa-onnx 包，以及基于 generic provider 的自动更新。

Electron 43 内置 Node.js 24.18.x。本地 Node.js 版本满足 electron-vite 5 和 Vite 7 的工具链 engines 要求，但仍需针对 Electron ABI 重新构建原生模块。变更动机与范围参见 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 建立内部兼容的 Electron 43 构建、打包、更新和类型工具栈。
- 保持现有运行时行为、持久化 SQLite 数据、包标识、资源布局和更新通道不变。
- 仅进行上游迁移所必需的最小配置修改。
- 先升级 JavaScript 工具链，再升级原生 SQLite 包，使故障原因可追溯。

**Non-Goals:**

- 不升级 React、Tailwind CSS、TypeScript、LangChain、OCR、语音或其他无关依赖。
- 不采用 Electron 44 预发布版、Vite 8、ESM 输出、Electron sandboxing、新打包器或新的更新 provider。
- 不修改应用功能、数据库结构、IPC 契约、构建目标、代码签名策略或发布基础设施。
- 未经要求不新增单元测试；验证使用现有检查和聚焦的人工冒烟测试。

## Decisions

### 使用相互兼容的目标版本矩阵

更新清单和锁文件，解析到以下稳定版本：

| 依赖包 | 目标版本 |
|---|---:|
| `electron` | 43.3.0 |
| `electron-vite` | 5.0.0 |
| `vite` | 7.3.6 |
| `@vitejs/plugin-react` | 5.2.0 |
| `electron-builder` | 26.15.3 |
| `electron-builder-squirrel-windows` | 26.15.3 |
| `electron-updater` | 6.8.9 |
| `@electron-toolkit/tsconfig` | 2.0.0 |
| `@types/node` | 24.13.3 |
| `better-sqlite3` | 13.0.3 |
| `cross-env` | 10.1.0 |

在 `package.json` 中保持项目现有的 caret 版本范围约定；pnpm 锁文件记录可复现的安装版本。不得仅为重写声明范围而更新已经是当前版本的 Electron Toolkit runtime 和 ESLint 包。

将 `electron-builder-squirrel-windows` 显式声明为开发依赖，因为 app-builder-lib 26 要求匹配版本作为 peer，pnpm 否则会复用现有锁文件中过时的 25.x peer。此举在不改变既有 NSIS 目标的前提下对齐打包依赖图。

有意排除 Vite 8，因为 electron-vite 5 声明的兼容范围截止 Vite 7。备选方案包括仅升级 Electron，这会留下可避免的工具链偏差；以及升级所有过时依赖，这会使变更超出 Electron 兼容性范围。

### 分两个诊断阶段实施升级

先更新 Electron、electron-vite、Vite、React Vite 插件、builder/updater、Toolkit tsconfig 和 Node.js 类型。随后更新 better-sqlite3，并针对 Electron 43 重新构建原生依赖。整个过程仍属于一个 OpenSpec 变更并生成一个最终锁文件，但在实施过程中保留清晰的故障排查边界。

现有 `sherpa-onnx-node` 包保持固定版本，因为它们提供平台专用包，与 Electron Node ABI 的耦合方式不同于 better-sqlite3。打包后仍需对其进行运行时冒烟验证。

### 采用 electron-vite 5 的默认依赖外部化

从 `electron.vite.config.ts` 中移除已废弃的 `externalizeDepsPlugin` 导入和主进程插件注册，改用 electron-vite 5 默认的 `build.externalizeDeps` 行为。除非升级后的类型或构建产生明确不兼容，否则保留现有入口定义、`external: ['electron']`、输出布局、路径别名和 renderer 插件。

曾考虑显式配置 `build.externalizeDeps`，但项目并未自定义现有插件，而 v5 默认行为能以更少配置提供相同效果，因此不采用。

### 保持打包和更新契约

保持 `appId`、`productName`、可执行文件名称、制品命名、构建目标、资源包含规则、ASAR 解包规则、generic 发布 URL 和 updater IPC 行为不变。保留 `npmRebuild: false` 和现有 `postinstall` 命令；安装依赖后继续通过 `electron-builder install-app-deps` 准备原生依赖。

Electron 42+ 不再从包自身的 postinstall hook 下载二进制文件。pnpm 调用 Electron 二进制文件时不会暴露现有 `.npmrc` 镜像键，因此在项目 postinstall 脚本前添加官方 `install-electron --no` 命令，并使用 `cross-env` 在 Windows、macOS 和 Linux 上一致提供 `ELECTRON_MIRROR`。二进制下载后继续执行现有 `electron-builder install-app-deps` 步骤。

### 将平台行为变化作为回归目标

不推测性添加兼容 shim。针对 Electron 43 验证现有主进程 Electron API 用法，仅处理已观察到或有文档记录的不兼容。条件允许时，重点检查 Windows 截图与打包行为、Linux Wayland 截图/窗口行为，以及已签名 macOS 应用的通知行为。

### 让截图窗口按就绪状态启动并可恢复

开发测试暴露了 Electron 43 回归：按 F2 后主窗口最小化，但截图选择遮罩始终未显示。截图路由和遮罩样式仍然存在，因此将其视为辅助窗口启动失败，而不是 OCR 或翻译失败。

开发与生产环境统一使用专用的 `screenshotSelector/index.html` renderer 入口，使两个环境运行相同的窗口入口。创建截图窗口时先保持隐藏，并显式设置光标所在显示器的 bounds，不再组合使用 `fullscreen: true` 和启动阶段的 `setBounds` 调用。窗口创建改为异步，等待 renderer 入口成功加载后再显示遮罩并隐藏主窗口。

如果窗口构造或 renderer 加载失败，则关闭任何已部分创建的截图窗口、停止光标跟踪、重置截图状态和 bounds，并保留或恢复主窗口及其焦点。这样可保持应用处于可用状态，并允许之后再次按 F2。启动后的显示器 bounds 更新仍限于现有多显示器行为；本次变更不重新设计截图选择流程。

### 在多显示器跟随和选区锁定之间切换

第一次修复让遮罩层成功显示，第二次开发环境复测仍无法开始拖拽选区。删除 150ms 显示器跟踪后问题依旧存在，说明持续更新窗口 bounds 并不是输入失败的根因；同时，固定为按 F2 时所在的单一显示器不能满足多显示器使用场景。

截图窗口加载完成并取得原生输入权后进入“等待选择”状态。恢复 150ms 光标显示器检查，但记录当前 `display.id`，只有光标跨越显示器时才更新窗口 bounds 并重新置顶、聚焦；光标仍在同一显示器时不得重复调用 `setBounds`。这样保留跨屏跟随能力，同时避免无意义的窗口几何更新。

在截图窗口的 `webContents` 上使用 `before-mouse-event` 捕获第一次原生 `mouseDown`。收到事件后立即停止显示器跟踪并锁定当前显示器，但不得阻止该事件继续传递给 renderer，后续拖拽仍由现有截图选择组件处理。截图完成、取消、窗口关闭或启动失败时都必须停止定时器。

为透明窗口增加覆盖整个截图区域的极低透明度鼠标命中层，视觉上保持现有遮罩效果，但不再依赖完全透明像素参与 Windows 原生命中测试。开发模式记录是否收到第一次原生 `mouseDown`：若主进程收到而 renderer 未开始绘制，则排查 renderer 事件链；若主进程也未收到，则继续处理透明窗口原生命中问题。

保留显式 `setIgnoreMouseEvents(false)`、`setFocusable(true)`、显示与聚焦顺序，以及主进程 `before-input-event` 的 Escape 兜底。renderer IPC 和原生 Escape 必须继续调用同一个幂等取消操作。

### 使用 Pointer Capture 保证 renderer 拖拽链完整

第三次开发环境复测仍无法开始选区，但主进程输出了 `[ScreenshotWindow] Native mouseDown received`，证明鼠标事件已经到达截图窗口的 Chromium `webContents`。因此保留透明窗口、1% 命中层、原生输入权处理和多显示器跟随，不再把问题归因于 Windows 原生命中或窗口焦点。

当前截图选择器在 `mousedown` 处理器的第一步发送 `START_SCREENSHOT` IPC，之后才更新本地绘制状态；鼠标移动和松开监听还需要等待 React 重渲染后的 Effect 才挂载。若 IPC 调用同步异常，或用户在 Effect 生效前开始移动和松开，绘制状态与完整拖拽事件链都可能丢失。

将选择交互改为直接绑定在全屏容器上的 Pointer Events。`pointerdown` 必须先记录起点、最新选区和绘制状态，再调用 `setPointerCapture(pointerId)`；`pointermove` 使用 Ref 中的起点与绘制状态更新最新选区和用于渲染的选区 state；`pointerup` 使用 Ref 中的最新选区完成最小尺寸判断、释放 Pointer Capture，并结束绘制。Ref 只保存不直接驱动 UI 的高频交互数据，React state 继续负责遮罩与尺寸提示渲染。

主进程 `before-mouse-event` 已在第一次原生 `mouseDown` 时停止多显示器跟踪，因此删除 renderer 的 `START_SCREENSHOT` 发送、主进程对应监听和 `SendEnum.START_SCREENSHOT` 枚举，避免在本地绘制状态建立前执行不再需要的跨进程调用。Escape 取消和选区完成 IPC 保持不变。

### 统一辅助窗口的 preload 运行环境

第四次开发环境复测已经可以绘制截图选区，但松开鼠标后遮罩层仍然停留，截图捕获、翻译和结果展示均未开始。Pointer Capture 已完成本地拖拽链，故问题位于 `pointerup` 发送 `SCREENSHOT_SELECTED` 的 renderer IPC 边界，而不是原生鼠标命中、多显示器跟随或选区计算。

当前构建后的 preload 通过外部 `require` 加载 `@electron-toolkit/preload`。主窗口显式设置 `sandbox: false`，截图窗口和结果窗口未设置该选项，因而使用 Electron 默认沙箱；沙箱 preload 只能加载受限模块，可能在向 `window.electron` 暴露 IPC bridge 前加载失败。

截图窗口和结果窗口显式设置 `sandbox: false`，与主窗口和现有共享 preload 的运行环境保持一致，同时继续启用 `contextIsolation: true`。这符合本变更不引入 Electron sandboxing 的非目标，并以最小配置修正恢复既有 IPC 行为。保留 `SCREENSHOT_SELECTED`、`SCREENSHOT_CANCEL` 和结果窗口 IPC 契约，不重写截图捕获、翻译或结果展示流程。

### 恢复原图可见度切换与译文叠加

第五次开发环境复测确认截图选择、捕获、翻译和结果窗口展示流程已经恢复，但点击结果窗口的“显示原图”没有可感知的变化。当前切换只把浮层背景从 `rgba(19, 30, 34, 0.96)` 调整为 `rgba(19, 30, 34, 0.74)`，译文块仍然显示，因此即使状态已经变化，用户也几乎无法分辨。

用户确认期望行为与原实现一致：切换只控制下方原图的可见度，译文块在两种状态下都必须继续叠加显示。显示原图时使用现有半透明 `var(--floating-surface)` 背景，使下方屏幕原文可见，同时保留译文覆盖层；隐藏原图时使用接近不透明的 `var(--floating-surface-strong)` 背景，降低下方内容干扰并突出译文。

按钮恢复原有动作语义：原图可见时显示“隐藏原图”，原图被遮盖时显示“显示原图”。不得使用“显示译文”或在任一状态下条件移除译文块。底部操作栏继续使用 `-webkit-app-region: no-drag`，并保留独立的可见背景，确保原图颜色变化时按钮仍然可辨认、可点击。该切换只影响 renderer 背景透明度，不重新截图、不保存额外图片，也不修改主进程或 IPC 契约。

### 启用结果窗口的原生透明能力

第六次开发环境复测确认原图/译文状态切换已经生效：进入原图模式后按钮变为“显示译文”，译文块也已隐藏，但结果区域仍显示为完整深色矩形。这证明 renderer 透明样式正常执行，剩余问题位于结果窗口的原生透明配置。

结果窗口当前只有 `backgroundColor: '#00000000'`，未在 `BrowserWindow` 顶层启用 `transparent: true`。透明背景色不能替代原生窗口透明能力，因此 renderer 的透明区域仍显示原生窗口底板。为结果窗口增加 `transparent: true`，保留 Windows 透明窗口所需的 `frame: false`，并继续使用现有透明背景色、`alwaysOnTop`、`sandbox: false`、`contextIsolation: true` 和共享 preload。

原生窗口透明是半透明 renderer 背景露出下方屏幕内容的基础，但 renderer 本身不得完全透明。显示原图状态绘制半透明背景并继续显示译文块，隐藏原图状态绘制接近不透明的背景并继续显示译文块。不得对结果窗口调用 `setIgnoreMouseEvents`，底部操作栏必须继续接收点击；该修正不重新截图、不新增图片数据，也不改变结果窗口尺寸、坐标或 IPC。

### 确保打包态 AudioWorklet 使用同源独立资源

Windows x64 打包应用复测发现，口语对话页面和历史记录可以正常显示，但启动实时对话时提示 `Unable to load a worklet's module.`。当前麦克风采集器通过 `new URL('./pcm-capture-processor.js', import.meta.url)` 加载 AudioWorklet；Vite 7 将体积较小的处理器内联为 `data:text/javascript;base64,...`，而主窗口 CSP 仅允许 `script-src 'self'`，因此打包态 `audioWorklet.addModule()` 拒绝加载该模块。

将 PCM 处理器作为 `?url&no-inline` 静态资源导入，强制 Vite 输出独立的同源 JavaScript 资源，并把构建后的资源 URL 传给 `audioWorklet.addModule()`。保留处理器注册名、PCM 分块逻辑、麦克风采集生命周期和现有严格 CSP，不为 `script-src` 增加 `data:`，也不全局关闭其他资源的内联。

选择单资源 `no-inline` 而不是调整全局 `assetsInlineLimit`，可以把影响限定在 AudioWorklet；不采用放宽 CSP 的方案，避免允许任意 data URL 脚本。开发环境和打包环境必须使用同一导入方式，构建后应能在 renderer assets 中找到独立处理器文件，主 bundle 中不再包含该处理器的 `data:text/javascript` URL。

### 隔离划词翻译浮动按钮的 Pointer Event

Windows x64 打包应用复测确认 AudioWorklet 修复生效后，学习收藏等主页面暴露了划词翻译回归：选中文本后浮动“翻译”按钮正常出现，但点击时按钮会向下移动，右侧翻译抽屉无法打开。

第一次修正假设 document 级 `pointerup` 无条件重新计算当前选区是按钮移动的直接原因。浮动按钮在 `pointerdown` 阶段通过 `preventDefault()` 保留原选区，因此先让 `handlePointerUp` 接收 `PointerEvent`，当 `isIgnoredSelectionNode(event.target as Node)` 命中按钮等已忽略交互元素时直接返回，其他页面选区仍调用 `updateCurrentSelection()`。

复测确认该事件隔离仍不足以阻止按钮移动。共享 `Button` 的基础样式包含 `active:translate-y-px`，而位于选区上方的浮动按钮依赖 `-translate-y-full` 把自身放到定位锚点上方。按下按钮时，active 样式会把纵向位移从 `-100%` 覆盖为 `1px`，使按钮在 `pointerup` 和 `click` 之前跳到锚点下方；释放事件随后可能落到正文内容，因而无法命中已经实现的按钮忽略判断。

只在划词翻译浮动按钮调用处覆盖共享按压位移：按钮位于选区下方时使用 `active:translate-y-0`，位于选区上方时同时使用 `-translate-y-full` 和 `active:-translate-y-full`。这样按钮在按下前后保持相同位置，释放事件仍以按钮为目标，既有 `pointerup` 忽略判断随后阻止选区重算。不得删除或修改共享 `Button` 的按压反馈，以免影响其他页面按钮。

保留滚动与缩放时隐藏浮动按钮、键盘选区、现有受控 Radix 抽屉和翻译流程。不得重构抽屉、广泛阻止全局事件或引入额外状态；本次修正只隔离忽略交互元素产生的 `pointerup`，并固定浮动按钮自身的按下位置。

### 为划词翻译抽屉增加状态动画

人工复测确认浮动按钮按下时不再移动，右侧划词翻译抽屉可以正常打开。现有 `DialogPrimitive.Content` 通过 Radix `data-state` 暴露打开和关闭状态，但没有配置动画，因此抽屉会直接出现或消失。

复用项目已经全局加载的 `tw-animate-css`，只为当前抽屉内容增加状态类。打开状态使用 `animate-in`、`slide-in-from-right` 和 `duration-200`，使抽屉在 200ms 内从右侧滑入；关闭状态使用 `animate-out`、`slide-out-to-right` 和 `duration-150`，使抽屉在 150ms 内向右侧滑出。使用 `motion-reduce:animate-none`，在系统请求减少动态效果时禁用动画。

保持现有受控 `open` 状态、`modal={false}`、Portal、焦点处理、尺寸、层级、阴影、加载状态和翻译流程不变。不得新增动画依赖、定时器或额外 React 状态，也不把该动画扩散到共享 Dialog 或其他组件。

### 恢复已暂停的实时语音会话

Windows 应用复测确认划词翻译抽屉动画正常后，口语对话页面暴露了继续回归：实时对话可以暂停并进入 `paused` 状态，但点击“继续”没有任何响应，页面仍保持已暂停。

继续按钮已经正确绑定 `resumeConversation()`。该处理器只在 `statusRef.current === 'paused'` 时执行，随后调用 `startListening(sessionIdRef.current)`；但 `startListening()` 的入口会在当前状态仍为 `paused` 时直接返回，因此麦克风、AudioWorklet 和本地识别都不会重新启动。

在 `resumeConversation()` 确认当前状态为 `paused` 后，先调用现有 `updateStatus('initializing')`，同步更新 React state 和 `statusRef`，再使用原有 `sessionIdRef.current` 调用 `startListening()`。保留 `startListening()` 自身的暂停守卫，防止其他异步回调在用户明确暂停后意外恢复收音；其现有初始化状态、麦克风启动、AudioWorklet 加载、识别启动和错误处理流程保持不变。

继续操作不得调用 `startConversation()`、递增会话编号或清空消息、实时转写和历史上下文。不得新增会话状态、IPC 通道或麦克风恢复接口；只修正暂停到初始化的既有状态转换，并把 `updateStatus` 加入继续处理器的 Hook 依赖。

### 在浏览器选区清除时同步隐藏浮动按钮

实时对话恢复验证完成后，Windows 应用复测发现新的划词翻译状态回归：选中文本后浮动“翻译”按钮正常出现，第一次点击空白区域时浏览器选区已经消失，但按钮仍然停留；再次点击空白区域后按钮才隐藏。

浮动按钮由 React 的 `selectionCandidate` 状态渲染，该状态目前只在 document 级 `pointerup`、键盘抬起、滚动和窗口缩放时更新。空白点击清除浏览器选区时，原生选区状态可能在当前 `pointerup` 处理之后才完成折叠，而组件没有监听后续 `selectionchange`，导致已经失效的候选状态保留到下一次输入事件。

在 document 上增加 `selectionchange` 监听，只在 `window.getSelection()` 不存在、已经折叠或没有 Range 时调用现有隐藏方法清除 `selectionCandidate`。有效选区仍由现有 `pointerup` 和 `keyup` 读取并计算按钮位置，不在拖选过程的每次 `selectionchange` 中重新定位按钮，避免按钮频繁移动或增加额外渲染。

保留浮动按钮 `pointerdown` 的 `preventDefault()`，确保点击按钮时原始选区不会提前折叠；保留既有忽略交互元素、抽屉、翻译、Escape、滚动和缩放逻辑。不得新增 React 状态、定时器、IPC 或全局事件分发能力。

## Risks / Trade-offs

- **原生 ABI 不匹配导致应用无法启动或访问数据库** → 通过现有 pnpm/postinstall 流程重新构建 better-sqlite3，并验证开发环境和打包后的二进制文件。
- **electron-builder 26 改变 pnpm 依赖收集或 ASAR 布局** → 生成安装程序前，检查未打包应用中的 SQLite、tesseract、sherpa-onnx、资源、训练数据文件和迁移文件。
- **Electron 42+ 二进制获取绕过已配置镜像** → 验证干净的依赖安装路径，仅在当前 `.npmrc` 失效时添加受支持的下载配置。
- **Chromium 和 Electron 行为变化影响截图或无边框窗口** → 验证多显示器捕获、缩放、透明全屏窗口，以及条件允许时的 Linux Wayland 行为。
- **截图 renderer 在遮罩显示前失败** → 各环境使用同一个专用 renderer 入口，加载完成后再隐藏主窗口，并在失败时恢复状态。
- **遮罩可见但无法接收鼠标输入** → 等待选择时仅在跨显示器时移动窗口，第一次原生鼠标按下后锁定显示器，并使用非零透明度命中层验证 Windows 原生事件是否到达。
- **原生鼠标事件到达但 renderer 未开始绘制** → 使用容器 Pointer Capture 保持完整拖拽序列，以 Ref 保存高频交互数据，并移除绘制开始前的冗余 IPC。
- **辅助窗口的 sandbox preload 未暴露 IPC bridge** → 截图窗口和结果窗口显式复用主窗口的 `sandbox: false` 与 `contextIsolation: true` 组合，并验证选区完成和结果窗口交互 IPC。
- **把原图可见度切换误实现为原图/译文二选一** → 两种状态始终渲染译文块，只通过半透明与接近不透明的背景控制下方原图可见度，并恢复“显示原图/隐藏原图”文案。
- **renderer 透明但原生结果窗口仍不透明** → 为无边框结果窗口显式启用 `transparent: true`，保留可交互操作栏，并在 Windows 及可用的其他平台验证透明合成效果。
- **Vite 将 AudioWorklet 内联为 CSP 禁止的 data URL** → 仅对 PCM 处理器使用 `?url&no-inline` 输出同源独立资源，并在开发构建、renderer 产物和打包应用中验证加载路径。
- **浮动按钮的 pointerup 触发选区重算并取消 click** → 复用既有忽略交互元素判断跳过对应的 document 级选区更新，同时保留页面选区变化处理。
- **共享 Button 的 active 位移覆盖浮动按钮定位** → 仅在浮动按钮调用处按上下位置覆盖 active 纵向位移，不修改共享按钮反馈。
- **抽屉动画影响关闭响应或引发动态效果不适** → 使用 Radix 状态驱动的短时滑入与滑出动画，并在 `prefers-reduced-motion` 下禁用动画。
- **继续处理器被暂停状态守卫直接拦截** → 继续时先通过现有状态更新方法进入初始化，再复用原会话编号和既有监听启动流程。
- **浏览器选区已清除但浮动按钮状态仍保留** → 监听原生 `selectionchange`，仅在选区折叠或不存在时清除候选状态，继续由现有完成事件计算有效选区位置。
- **Electron 42 起未签名构建的 macOS 通知失败** → 将已签名 macOS 应用的通知验证视为受支持的发布路径；本次变更不修改签名策略。
- **同时升级工具链使回归更难定位** → 保留两个诊断阶段，并记录故障首次出现在哪个阶段。
- **caret 版本范围后续可能解析到更新的兼容版本** → 提交 pnpm 锁文件，并在可复现构建环境中使用 frozen-lockfile 安装。

## Migration Plan

1. 记录当前依赖和打包基线，不改变应用行为。
2. 更新 JavaScript Electron 工具链和锁文件，迁移 electron-vite 配置，并仅解决升级引起的类型或构建错误。
3. 更新 better-sqlite3，针对 Electron 43 重新构建原生依赖，并验证现有数据库无需结构或数据迁移即可打开。
4. 修复截图窗口回归，包括开发与生产入口一致性、就绪后显示、失败恢复、原生输入权、多显示器跟随、Pointer Capture 选区、辅助窗口 preload 运行环境、结果窗口原图可见度切换、译文叠加、原生透明能力和取消兜底。
5. 将 AudioWorklet 改为同源独立资源，检查 renderer 构建产物，并在开发环境与打包应用中复测实时语音采集。
6. 隔离划词翻译浮动按钮产生的 document 级 `pointerup`，固定按钮按下状态的纵向位置，为抽屉增加状态动画，在浏览器选区折叠时同步隐藏按钮，并验证按钮点击、抽屉开关及其他选区交互。
7. 修复实时对话暂停后的继续状态转换，并验证麦克风、识别流和原会话上下文可以恢复。
8. 检查未打包的 Windows 构建；在明确授权执行 package script 后，生成并冒烟测试 NSIS 安装程序和自动更新流程。
9. 执行可用的 macOS 和 Linux 检查；相应构建环境不可用时不阻塞 Windows 发布，并记录未验证的平台覆盖范围。

发布前如需回滚，应同时还原依赖清单、锁文件和 electron-vite 配置，并使用先前工具链重新构建。发布自动更新版本后，应通过向前修补版本解决问题，而不是尝试降级 updater。
