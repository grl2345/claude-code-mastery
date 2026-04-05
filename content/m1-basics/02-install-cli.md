---
title: "安装与环境配置（CLI 篇）"
module: m1-basics
order: 2
group: "准备工作"
description: "从零开始安装 Claude Code CLI，配置开发环境，创建你的第一个 CLAUDE.md。"
duration: "12 分钟"
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
