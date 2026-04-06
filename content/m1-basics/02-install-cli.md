---
title: "安装与环境配置"
module: m1-basics
order: 2
group: "准备工作"
description: "从零开始安装 Claude Code（CLI + 桌面版），配置开发环境，创建你的第一个 CLAUDE.md。"
duration: "15 分钟"
level: "零基础"
publishedAt: 2026-03-16
---

## 前置条件

在开始之前，你需要确认两件事。

首先是 Node.js 环境。Claude Code 需要 Node.js 18 或更高版本：

```bash
$ node --version
v20.11.0
```

如果没有安装，推荐使用 `nvm`：

```bash
$ nvm install --lts
$ node --version
v20.11.0
```

其次是 Anthropic 账号。去 console.anthropic.com 注册就行，支持 Claude Pro/Max 订阅或 API 付费。

## 安装 Claude Code

安装本身非常简单，一行命令搞定：

```bash
$ npm install -g @anthropic-ai/claude-code
$ claude --version
claude-code v1.x.x
```

> 遇到权限问题的话，不要用 sudo npm install——这是个常见的坑。正确做法是修复 npm 全局目录权限，或者直接用 nvm 安装的 Node.js，就不会有这个问题。

## 首次认证

安装完成后，直接在终端输入 `claude` 就会启动认证流程：

```bash
$ claude
Welcome to Claude Code!
Press Enter to open the browser for login...

✓ Authentication successful
```

整个过程会自动打开浏览器，登录后回到终端就能用了。我的经验是这一步基本不会出问题，非常顺滑。

## 项目级配置

这一步很多人会跳过，但我建议你从一开始就养成习惯——在项目根目录创建一个 `CLAUDE.md` 文件：

```markdown
# 项目说明

## 技术栈
- Node.js 20 + Express 4 + TypeScript 5
- PostgreSQL 16 + Prisma ORM
- 测试：Vitest

## 代码规范
- 函数优先于类
- 错误统一使用 AppError 类

## 目录结构
- src/modules/ — 业务模块
- src/shared/ — 共享工具
- tests/ — 测试文件
```

为什么这个文件重要？还记得第一课说的吗——Claude Code 是那个「对你业务一无所知的新同事」。CLAUDE.md 就是你给他的入职文档。写得越清楚，它干活越靠谱。

我自己每个项目都会维护这个文件，哪怕只是几行简单的技术栈说明，也比什么都没有强太多。我们会在思维篇第 6 课深入讲解如何写好它。

## 桌面版：另一个入口

不是所有人一上来就习惯在终端里操作。如果你还不太熟悉命令行，桌面版是一个门槛更低的入口——有窗口、有输入框，交互方式更直觉。

访问 claude.ai/download，选择对应操作系统版本下载安装，用 Anthropic 账号登录即可。

打开之后你会看到三个主要区域：对话区用来和 Claude Code 交流；项目面板用来选择本地文件夹作为项目目录；文件预览区可以查看 Claude Code 修改文件时的 diff。

> 打开桌面版后，第一件事就是选择你的项目目录。没有项目上下文的 Claude Code 就像没有地图的导航——它还是能跑，但大概率跑偏。

## 桌面版 vs CLI：怎么选

| 场景 | 推荐 | 原因 |
|------|------|------|
| 快速提问 | 桌面版 | 打开即用 |
| 日常开发 | CLI | 与 git、npm 无缝衔接 |
| 重构/多文件 | CLI | 操作反馈更直接 |
| 自动化 | CLI | 只有 CLI 支持 Headless |
| Diff 查看 | 桌面版 | 图形化更直观 |

我自己的习惯是日常开发基本都在 CLI 里完成，桌面版主要用来做快速的代码问答或者看 diff。如果你刚开始接触，建议先从桌面版入手建立直觉，然后逐步过渡到 CLI。一旦你习惯了命令行的工作流，会发现它的效率确实高出不少。
