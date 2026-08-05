## Why

项目当前运行在已停止支持且不再接收安全修复的 Electron 35 上。应同步升级配套的构建、打包、更新和类型定义工具，使应用迁移到受支持的 Electron 运行时，同时避免工具链中残留不兼容的版本边界。

## What Changes

- 将 Electron 升级到当前稳定的 Electron 43 发布系列。
- 将 electron-vite、Vite 和 React Vite 插件升级到相互兼容且受支持的版本。
- 同步升级 electron-builder 和 electron-updater，以保持打包与自动更新兼容性。
- 升级 Electron Toolkit TypeScript 配置和 Node.js 类型定义，以匹配 Electron 43 内置的 Node.js 24 运行时。
- 更新 electron-vite 配置，替换已废弃的依赖外部化插件用法。
- 针对目标 Electron ABI 升级并重新构建 better-sqlite3，同时保持现有数据库结构和应用行为不变。
- 保持已是当前版本的 Electron Toolkit 包不变，并排除无关的前端和业务依赖。

## Capabilities

### New Capabilities

无。本次变更仅维护依赖和构建工具链。

### Modified Capabilities

无。现有用户可见行为和产品需求保持不变，因此本次变更不创建增量规格。

## Impact

- 依赖清单和 pnpm 锁文件。
- Electron/Vite 构建配置和 TypeScript 配置。
- better-sqlite3 的原生模块安装与 ABI 重建流程。
- Windows 打包和自动更新制品；macOS 与 Linux 兼容性需要针对性回归检查。
- 需要回归覆盖的运行时领域包括窗口、截图、全局快捷键、通知、剪贴板访问、SQLite 持久化、语音服务和应用更新。
