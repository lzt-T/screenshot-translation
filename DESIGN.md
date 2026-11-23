---
name: Bai_Ze
description: 一套面向桌面翻译与英语学习的双语口袋辞书（Bilingual Lexicon & Marginalia）视觉系统
colors:
  primary: "#181C24"
  primary-dark: "#ECEFF4"
  workbench-light: "#F7F6F2"
  workbench-dark: "#11141B"
  shell-light: "#F1F0EB"
  shell-dark: "#14171F"
  surface-light: "#FFFFFF"
  surface-dark: "#181D27"
  reading-light: "#FAF9F6"
  reading-dark: "#151923"
  ink-light: "#172030"
  ink-dark: "#E8EDF5"
  border-light: "#E3E2DC"
  border-dark: "#2A3345"
  marginalia-light: "#FEF6E4"
  marginalia-dark: "#292216"
  floating-accent: "#3B82F6"
typography:
  display:
    fontFamily: "Smiley Sans, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  headword:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body-emphasis:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.75
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75
  body-compact:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  measurement:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  badge: "6px"
  control: "8px"
  surface: "12px"
  feature: "16px"
  pill: "9999px"
spacing:
  compact: "8px"
  control: "12px"
  surface: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.control}"
    padding: "0.5rem 1rem"
    height: "36px"
  panel:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.surface}"
    padding: "1rem"
  status-badge:
    backgroundColor: "color-mix(in oklab, {colors.primary} 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.badge}"
    padding: "0.125rem 0.5rem"
---

# Design System: Bai_Ze

## Overview

**Creative North Star: "双语口袋辞书 · Bilingual Lexicon & Marginalia"**

Bai_Ze 把桌面英语学习视作翻开一本随时可用的精装双语辞书：融合顶栏像轻量书脊统领主工作区，左侧原文与右侧译文以舒展对页并列，句法拆解与口语纠错化作温暖的荧光笔边注卡片，让用户在同一低干扰桌面工具中自然完成“看懂 → 收藏 → 开口”的闭环。

## Colors

配色采用“纸白 / 夜读靛黑对页 + 沉静墨黑主操作 + 低饱和藏青微点缀 + 琥珀批注边注”策略：

### Primary & Accent

- **沉静墨黑主色：** 浅色主题 `#181C24` 配 `#FFFFFF`，深色主题 `#ECEFF4` 配 `#12151C`；用于「翻译」「截图」等核心主按钮，彻底摆脱高饱和电光蓝的组件库模板感。
- **低饱和藏青点缀：** 焦点环与交互微高亮使用 `#3B5B8C`（浅色）/ `#88A8DF`（深色）。
- **边注批注暖色：** 浅色主题底面 `#FEF6E4` / 边界 `#EDD6A3` / 前景 `#9A5804`；深色主题底面 `#292216` / 边界 `#594624` / 前景 `#E5B567`。仅用于句子理解批注与“更自然的表达”纠错边注卡。

### Surfaces & Neutrals

- **浅色书页画布：** 画布 `#F7F6F2`、融合顶栏 `#F1F0EB`、左页纯白 `#FFFFFF`、右页微暖纸面 `#FAF9F6`、深靛墨黑正文 `#172030`、轻边框 `#E3E2DC`。
- **深色夜读画布：** 画布 `#11141B`、融合顶栏 `#14171F`、左页 `#181D27`、右页 `#151923`、浅月白正文 `#E8EDF5`、边界 `#2A3345`。
- **危险与高对比保护：** 浅色 `--destructive` 为 `#C43D3D` 配 `#FFFFFF`；深色 `--destructive` 为 `#E06C6C` 配高对比深前景 `--destructive-foreground: #1B0A0A`。
- **跨窗口浮层适配：** `hide-original` 模式响应当前浅/深主题纸面与文字 token；`show-original` 保持深色半透明对比底以保证复杂屏幕背景可读性。

## Typography

- **Brand Font:** Smiley Sans（仅用于顶栏和关于页的 `Bai_Ze` 字标，不用于正文或表单标签）
- **UI & Reading Font:** Segoe UI Variable Text / Microsoft YaHei UI（页标题 `20px / 600`，正文 `14–15px / 400`，行高 `1.6–1.75`）
- **Mono Font:** Cascadia Mono / Consolas（仅用于快捷键 `kbd` 与版本号，最小 `11px`）

## Layout & Window Shell

- 主窗口默认启动尺寸为 `1080×740`（最小 `840×600`），采用 `titleBarStyle: 'hidden'` + `titleBarOverlay` 融合标题栏，消除系统顶栏割裂。
- 移除旧版 `200px` 左侧后台侧栏，改用 `48px` 顶部融合壳体栏居中三段切换（`翻译台` / `对话练习` / `学习收藏`），右侧挂载当前模型快捷入口、主题切换与 `设置 / 关于`。
- 翻译台双栏书页工作面在 `>=780px` 保持左右对照并列与独立滚动。
- 设置页拆分为 `常规与外观` / `AI 模型` / `语音朗读` / `网络代理` 四个清晰标签页。

## Shapes, Elevation & Scrollbars

- 圆角体系：微徽标 `6px`（`--radius-sm`）、控件/按钮/输入框 `8px`（`--radius-md`）、普通面板与边注卡 `12px`（`--radius-lg`）、主书页容器 `16px`（`--radius-xl`）。
- 焦点环统一为 `3px` 语义色半透明光环（`ring-[3px] ring-ring/45`）。
- 滚动区统一使用 `main.css` 中的 `.custom-scrollbar`（6px 圆角极细轨道），随浅/深主题自适应。

## Do's and Don'ts

### Do:

- **Do** 保持翻译、对话与收藏工作流自然联通（带入练口语、纠错一键收藏、对话持久保留）。
- **Do** 使用语义 token，保证浅色、深色、融合标题栏与截图浮层视觉同源。
- **Do** 为非技术用户提供可读分组（如 Kokoro 音色按语种/性别分组）与可逆操作反馈。

### Don't:

- **Don't** 退回左侧 200px 后台侧栏或给聊天消息堆叠全宽 `border-b` 表格分割线。
- **Don't** 使用无实体的空 CSS 文件、未定义 class 或小于 `11px` 的中文微字号。
- **Don't** 将开发期方向契约注释写入 `index.html` 或渲染层源码。
