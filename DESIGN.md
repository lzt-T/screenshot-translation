---
name: Bai_Ze
description: 一套面向桌面 AI 英语学习的识别实验台视觉系统
colors:
  primary: "oklch(0.52 0.16 278)"
  primary-dark: "oklch(0.68 0.15 278)"
  workbench-light: "oklch(0.978 0.002 260)"
  workbench-dark: "oklch(0.18 0.008 270)"
  surface-light: "oklch(0.995 0.001 260)"
  surface-dark: "oklch(0.225 0.012 270)"
  ink-light: "oklch(0.24 0.015 270)"
  ink-dark: "oklch(0.93 0.008 270)"
  border-light: "oklch(0.865 0.006 265)"
  border-dark: "oklch(0.35 0.015 270)"
typography:
  display:
    fontFamily: "Smiley Sans, Segoe UI, sans-serif"
    fontSize: "2.25rem"
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
    rounded: "{rounded.surface}"
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

**Creative North Star: "识别实验台"**

Bai_Ze 把英语理解与表达视作连续的学习过程：取景符号负责聚焦，双语层负责比对，对话界面负责练习表达，测量标签负责标记状态。界面安静但不匿名，中性冷灰白与石墨灰构成工作台，识别靛紫以不同强调层级标记用户行动、聚焦与系统状态。

白泽不以神兽插画出现，而被抽象成识别、聚焦与洞察。密度服务高频桌面操作；装饰不得抢走截图、输入、译文和口语对话的注意力。

**Key Characteristics:**

- 中性冷灰白与石墨灰构成适应环境光的双主题工作面。
- 识别靛紫的实色形态表示主操作，低强调形态表示处理或完成状态。
- 取景孔径、精细标线和测量标签形成跨窗口识别语言。
- 控件触感明确，圆角克制，依靠边界和色调分层而非浮夸阴影。

## Colors

配色采用“中性工作面 + 单一信号色”的受限策略。

### Primary

- **识别靛紫信号色：** 浅色主题使用克制的 `#575AC2`，深色主题使用更明亮的 `#848CF3`；实色用于截图按钮、当前选择与关键焦点，低透明度底色与主色文字用于处理中和完成状态。

### Neutral

- **中性冷灰白工作面：** 浅色应用背景和侧栏使用近中性的冷灰，避免大面积泛紫或发蓝。
- **石墨灰工作面：** 深色背景保持低色度，避免纯黑造成过强反差。
- **样本表面：** 输入、译文和设置分组使用的内容层。
- **精密边界：** 分隔、输入轮廓和选区结构使用低色度边界。

**The Single Signal Rule.** 识别靛紫统一表示用户行动、选中、聚焦与系统状态；通过实色和低强调变体区分层级，页面不得引入无语义强调色。

## Typography

**Display Font:** Smiley Sans（自托管，Segoe UI 回退）  
**Body Font:** Segoe UI Variable Text / Microsoft YaHei UI  
**Label/Mono Font:** Cascadia Mono / Consolas

**Character:** 展示字具有窄体、轻微倾斜的观察感，仅用于品牌和页面大标题；正文保持桌面系统字体的效率与中文可读性，测量字体只承担快捷键、版本和层标签。

### Hierarchy

- **Display：** 36–48px、400，用于页面主标题和关于页品牌。
- **Title：** 17–18px、600，用于分区名称和关键组件标题。
- **Body：** 14–15px、400，行高约 1.6–1.75，用于操作说明和译文。
- **Label：** 11px、0.08em 字距、英文大写，用于 Source Sample、Translation Layer 等测量标签。

**The Display Ration Rule.** Smiley Sans 只用于品牌与一级标题，不用于正文、表单标签或长译文。

## Layout

主窗口使用固定 224px 左侧控制轨与可滚动内容区。默认桌面宽度下，首页输入与译文并列；较窄窗口回落为单列。内容最大宽度约 1024px，主页面使用 24–40px 外边距，区块以 28px 左右的节奏分隔。设置页按常规偏好、外观和模型配置顺序垂直组织。

## Elevation & Depth

系统以色调和 1px 边界为主要层级手段。阴影只出现在品牌孔径、主按钮和主题选中项，使用独立中性色并带垂直偏移和柔和衰减；静态内容面板保持平整。

**The Flat Workbench Rule.** 普通内容表面默认无阴影，交互重点才获得轻微抬升。

## Shapes

常规导航与控件使用 8px 圆角，内容表面使用 12px，品牌或强调区域最多使用 16px。小圆点只表示当前状态；大面积药丸形不用于容器。截图选区保持精确直角轮廓，不模仿卡片。

## Components

### Buttons

- 主按钮在浅色主题使用克制靛紫底、深色主题使用明亮靛紫底，并搭配高对比前景；44px 高、12px 圆角，按下时仅下移 1px。
- 次级按钮依靠边界和内容底色，幽灵按钮只在悬停时出现淡色表面。
- 焦点统一使用三像素半透明主题环，不能只靠颜色变化。

### Cards / Containers

- `lab-panel` 是主要内容表面：12px 圆角、1px 边界、无默认阴影。
- 设置常规项共享一个分隔表面；模型配置按真实配置对象分开，避免无意义嵌套卡片。

### Inputs / Fields

- 输入框保持透明或内容面底色，使用语义边界；焦点转为主题色边界与焦点环。
- 长文本区域取消内部卡片感，与 Source Sample 标题栏共同组成一个连续样本表面。

### Navigation

- 左侧导航采用图标、文字和一个小型主色状态点；活动项使用中性侧栏强调面，不使用厚侧边线。
- 截图选区和翻译浮层继承同一主色、边界、字体与焦点规则。
- 翻译浮层操作使用无背景文字按钮，仅通过文字颜色变化提供悬停反馈。

## Do's and Don'ts

### Do:

- **Do** 保持当前页面的英语学习主任务始终比辅助设置更醒目。
- **Do** 使用语义 token，让浅色、深色和临时窗口保持同一状态含义。
- **Do** 为长原文与译文保留清晰段落结构和高对比正文。

### Don't:

- **Don't** 把白泽替换成字面神兽插画或古典纹样背景。
- **Don't** 用识别靛紫装饰普通内容，或让状态徽标使用与主按钮同等重量的实色背景。
- **Don't** 引入玻璃拟态、渐变文字、发光描边或默认 AI 仪表盘式灰蓝卡片。
- **Don't** 在普通内容面板同时叠加边框和宽阴影。
