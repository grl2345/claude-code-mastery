---
title: "如何安装 Claude Code CLI？完整环境配置指南"
module: m1-basics
order: 2
group: "准备工作"
description: "三步完成 Claude Code CLI 安装：确认 Node.js 18+、npm 全局安装、浏览器认证。附 CLAUDE.md 项目配置模板和权限问题解决方案。"
duration: "12 分钟"
level: "零基础"
publishedAt: 2026-03-16
---

## 安装 Claude Code 需要什么前置条件？

安装 Claude Code CLI 前需要准备两样东西：

1. **Node.js 18 或更高版本**
2. **Anthropic 账号**（console.anthropic.com 注册，支持 Claude Pro/Max 订阅或 API 付费）

检查 Node.js 版本：

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

## 如何一行命令安装 Claude Code？

**运行 `npm install -g @anthropic-ai/claude-code` 即可完成全局安装。**

```bash
$ npm install -g @anthropic-ai/claude-code
$ claude --version
claude-code v1.x.x
```

> 遇到权限问题的话，不要用 sudo npm install——这是个常见的坑。正确做法是修复 npm 全局目录权限，或者直接用 nvm 安装的 Node.js，就不会有这个问题。

## 安装后如何完成首次认证？

安装完成后，**在终端输入 `claude` 会自动启动浏览器认证流程**：

```bash
$ claude
Welcome to Claude Code!
Press Enter to open the browser for login...

✓ Authentication successful
```

整个过程会自动打开浏览器，登录后回到终端就能用了。这一步基本不会出问题，非常顺滑。

## 为什么要创建 CLAUDE.md？如何配置？

**CLAUDE.md 是你给 Claude Code 的「项目入职文档」。** 它让 Claude Code 了解你的技术栈、代码规范和目录结构，从而产出更精准的代码。

在项目根目录创建 `CLAUDE.md` 文件：

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

很多人会跳过这一步，但我建议从一开始就养成习惯。哪怕只是几行简单的技术栈说明，也比什么都没有强太多。写得越清楚，Claude Code 干活越靠谱。我们会在思维篇第 6 课深入讲解如何写好它。
