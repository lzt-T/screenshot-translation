---
name: Bai_Ze
description: 一套面向桌面翻译与英语学习的清新成长伙伴视觉系统
colors:
  primary: "#167A68"
  primary-dark: "#59C5A8"
  workbench-light: "#F3F5F4"
  workbench-dark: "#111716"
  surface-light: "#FFFFFF"
  surface-dark: "#181F1D"
  ink-light: "#172522"
  ink-dark: "#EAF3F0"
  border-light: "#CBD8D3"
  border-dark: "#35433F"
  floating-accent: "#74E1C1"
typography:
  display:
    fontFamily: "Smiley Sans, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Segoe UI Variable Text, Segoe UI, Microsoft YaHei UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.75
  measurement:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  control: "8px"
  surface: "12px"
  feature: "16px"
spacing:
  compact: "8px"
  control: "12px"
  surface: "16px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.control}"
    padding: "0.6875rem 1.25rem"
    height: "44px"
  panel:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.surface}"
    padding: "1rem"
  status-badge:
    backgroundColor: "color-mix(in oklch, {colors.primary} 10%, transparent)"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0.25rem 0.5rem"
---

# Design System: Bai_Ze

## Overview

**Creative North Star: "清新成长伙伴"**

Bai Ze 把英语理解与表达视作一段持续成长的学习过程：取景帮助用户看懂真实语境，双栏学习面支持理解和比对，对话界面陪伴用户练习表达。界面以通透雾白、深森林色和清新青绿构成，让 AI 能力显得聪明而亲近；强调色只标记主操作、当前选择、焦点与必要处理状态。

白泽不以神兽插画出现，也不依赖实验室标签营造概念。密度服务高频桌面操作；装饰不得抢走截图、输入、译文和口语对话的注意力。

**Key Characteristics:**

- 雾白与深森林色构成适应环境光的双主题学习面。
- 成长青绿实色只表示主操作，低强调薄荷色表示当前选择、焦点或处理状态。
- 取景边界、紧凑工具栏和连续工作面形成跨窗口识别语言。
- 控件触感明确，圆角克制，依靠边界和色调分层而非浮夸阴影。

## Colors

配色采用“清透学习面 + 单一成长信号色”的受限策略。

### Primary

- **成长青绿信号色：** 浅色主题使用 `#167A68`，深色主题使用 `#59C5A8`；实色用于截图按钮，低强调形态用于当前选择、焦点和处理中状态。

### Neutral

- **通透雾白学习面：** 浅色应用背景使用更中性的 `#F3F5F4`，内容表面保持纯白，让主工作区从画布中清晰浮现而不依赖阴影。
- **石墨森林学习面：** 深色背景使用近中性石墨 `#111716`，侧栏使用更深的 `#0E1916`，内容表面使用 `#181F1D`；青绿只轻微影响中性色温度，不覆盖整个界面。
- **柔和薄荷选择面：** 浅色导航选中使用 `#CFE5DE`，普通悬停使用更轻的薄荷表面；深色导航选中使用克制的 `#243B35`，只承担导航和交互层级，不与主按钮竞争。
- **清晰青灰边界：** 浅色边界使用 `#CBD8D3`，深色边界使用 `#35433F`，明确分隔输入、译文和设置区域，同时保持整体轻盈。
- **临时窗口信号：** 截图选区和翻译浮层使用 `#74E1C1`；截图选区外使用中性黑色遮罩，选区内部保持透明，保证复杂背景上的辨识度与原始色彩准确性。
- **翻译结果叠加：** 显示原图时使用低强度中性黑色遮罩，译文不添加块级背景；隐藏原图和底部操作栏使用中性近黑表面，主题色只承担交互反馈。

**The Single Signal Rule.** 成长青绿统一表示主操作、选中、聚焦与必要处理状态；完成和普通信息使用中性层级，天空蓝只能作为低强调层次，不得形成第二套主操作色。

## Typography

**Brand Font:** Smiley Sans（自托管，Segoe UI 回退）
**Body Font:** Segoe UI Variable Text / Microsoft YaHei UI  
**Label/Mono Font:** Cascadia Mono / Consolas

**Character:** Smiley Sans 的窄体与轻微倾斜只用于品牌字标；页面标题和正文使用桌面系统字体，等宽字体只承担快捷键与版本信息。

### Hierarchy

- **Brand：** 18-24px、400，只用于侧栏与关于页品牌字标。
- **Page Title：** 24-28px、600，用于页面主标题。
- **Title：** 17–18px、600，用于分区名称和关键组件标题。
- **Body：** 14–15px、400，行高约 1.6–1.75，用于操作说明和译文。
- **Label：** 12-13px、500，用于工作区标题与辅助状态。

**The Display Ration Rule.** Smiley Sans 只用于品牌字标，不用于页面标题、正文、表单标签或长译文。

## Layout

主窗口使用固定 200px 左侧导航与可滚动内容区。首页原文与译文属于一个连续工作面，宽度充足时按约 42% / 58% 并列，较窄窗口回落为单列。内容最大宽度约 1180px，主页面使用 20-28px 外边距。设置页按常规偏好、外观和模型配置顺序垂直组织。

## Elevation & Depth

系统以色调和 1px 边界为主要层级手段。阴影只出现在品牌孔径、主按钮和主题选中项，使用独立中性色并带垂直偏移和柔和衰减；静态内容面板保持平整。

**The Flat Workbench Rule.** 普通内容表面默认无阴影，交互重点才获得轻微抬升。

## Shapes

常规导航与控件使用 8px 圆角，内容表面使用 12px，品牌或强调区域最多使用 16px。小圆点只表示当前状态；大面积药丸形不用于容器。截图选区保持精确直角轮廓，不模仿卡片。

## Components

### Buttons

- 主按钮在浅色主题使用成长青绿底、深色主题使用浅薄荷绿底，并搭配高对比前景；40px 高、8px 圆角，按下时仅下移 1px。
- 次级按钮依靠边界和内容底色，幽灵按钮只在悬停时出现淡色表面。
- 焦点统一使用三像素半透明主题环，不能只靠颜色变化。

### Cards / Containers

- `lab-panel` 是主要内容表面：10px 圆角、1px 边界、无默认阴影。
- 设置常规项共享一个分隔表面；模型配置按真实配置对象分开，避免无意义嵌套卡片。

### Inputs / Fields

- 输入框保持透明或内容面底色，使用语义边界；焦点转为主题色边界与焦点环。
- 长文本区域取消内部卡片感，与 Source Sample 标题栏共同组成一个连续样本表面。

### Navigation

- 左侧导航采用图标与文字；活动项只使用中性侧栏强调面和文字变化，不叠加状态圆点。
- 截图选区和翻译浮层继承同一主色、边界、字体与焦点规则。
- 翻译浮层操作使用无背景文字按钮，仅通过文字颜色变化提供悬停反馈。

## Do's and Don'ts

### Do:

- **Do** 保持当前页面的英语学习主任务始终比辅助设置更醒目。
- **Do** 使用语义 token，让浅色、深色和临时窗口保持同一状态含义。
- **Do** 为长原文与译文保留清晰段落结构和高对比正文。

### Don't:

- **Don't** 把白泽替换成字面神兽插画或古典纹样背景。
- **Don't** 用成长青绿装饰普通内容，或让状态徽标使用与主按钮同等重量的实色背景。
- **Don't** 引入 AI 紫色、玻璃拟态、渐变文字、发光描边或默认 AI 仪表盘式灰蓝卡片。
- **Don't** 在普通内容面板同时叠加边框和宽阴影。
