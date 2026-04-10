---
layout: ../layouts/PageLayout.astro
title: "常见问题"
description: "关于 Claude Code 和本站的常见问题解答，涵盖入门、费用、工具对比等高频问题。"
---

## 关于 Claude Code

### Claude Code 是什么？

Claude Code 是 Anthropic 推出的 AI 编程 CLI 工具。它直接运行在你的终端里，能理解整个项目的代码结构，帮你写代码、改 bug、做重构、跑命令。和 ChatGPT 最大的区别是：它能直接读写你本地的文件，不需要你来回复制粘贴。

详细介绍请看：[Claude Code 是什么，不是什么](/m1/01-what-is-claude-code)

### Claude Code 免费吗？

不免费。Claude Code 需要通过 Anthropic API 使用，按 token 计费。也可以通过 Claude Pro/Max 订阅使用（Max 订阅包含无限量使用）。

具体的费用分析和省钱策略请看：[费用攻略](/m1/09-cost-saving)

### Claude Code 需要什么环境？

- 操作系统：macOS、Linux 或 Windows（通过 WSL）
- 运行时：Node.js 18+
- 网络：需要能访问 Anthropic API

安装教程：[安装与配置](/m1/02-install-cli)

### Claude Code 和 ChatGPT / Claude 网页版有什么区别？

最大的区别是 Claude Code 可以直接操作你的本地文件系统和终端。网页版只能在对话框里交流，代码需要你手动复制粘贴。Claude Code 能读取整个项目结构，理解文件之间的关系，直接创建、编辑、删除文件，还能执行终端命令。

### MCP 是什么？

MCP（Model Context Protocol）是一个开放协议，让 Claude Code 能连接外部工具和数据源——比如数据库、API、文档系统。你可以把它理解为 Claude Code 的"插件系统"。

入门教程：[MCP 入门指南](/m1/10-mcp-intro)

## 关于工具选择

### Claude Code 和 Cursor 哪个好？

各有所长。Claude Code 是纯终端工具，适合习惯命令行的开发者，在大型重构和复杂任务拆解上更强。Cursor 是 IDE，上手门槛更低，Tab 补全体验好。很多开发者两个都用——日常写代码用 Cursor，复杂任务用 Claude Code。

详细对比：[Claude Code vs Cursor](/m5/01-cc-vs-cursor)

### Claude Code 和 GitHub Copilot 有什么区别？

Copilot 主要是行级代码补全，集成在 IDE 里，擅长"接下来这几行代码怎么写"。Claude Code 是项目级别的 AI 助手，擅长理解整个项目、做跨文件修改、执行复杂任务。两者定位不同，可以同时使用。

详细对比：[Claude Code vs Copilot](/m5/02-cc-vs-copilot)

### 应该用 API 还是订阅？

如果你每天使用超过 2 小时，Max 订阅（$100/月或 $200/月）通常更划算。如果只是偶尔使用，按量付费的 API 更经济。

详细分析：[API vs 订阅](/m5/05-api-vs-subscription)

## 关于本站

### 这个网站是用什么搭建的？

本站使用 Astro 静态站点框架搭建，部署在 Vercel 上。整个网站从设计到开发全程使用 Claude Code 完成。

搭建过程的完整记录：[从零搭建 Astro 博客](/m3/01-build-project-from-scratch)

### 内容是 AI 生成的吗？

不是。所有文章都是作者基于真实开发经验手动撰写的。Claude Code 在写作过程中被用作辅助工具（比如代码示例的生成和校验），但文章的核心观点、踩坑经验和方法论都来自实际项目实践。

### 更新频率是怎样的？

没有固定更新频率。每篇文章从初稿到发布通常要修改三四遍，质量优先于数量。你可以关注公众号「小高聊AI」获取更新通知。

### 可以转载吗？

可以。本站原创内容采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议，允许非商业性转载，但需注明出处并以相同方式共享。代码示例可自由使用，无需额外授权。

## 学习建议

### 零基础可以学吗？

可以。入门篇从安装配置开始，每篇文章都标注了难度等级。建议按照 **入门篇 → 思维篇 → 实战篇** 的顺序学习。

### 需要会编程吗？

基础的编程知识会有帮助，但不是硬性要求。入门篇的大部分内容零基础也能跟上。从思维篇开始会涉及更多编程概念，建议有一定编程经验后再学习。

### 学完之后能达到什么水平？

你会建立一套稳定的 AI 协作开发方法：知道什么任务适合交给 AI、怎么拆分需求、如何管理上下文、如何审查 AI 生成的代码。这套方法不依赖特定工具，即使未来换用其他 AI 编程工具也能复用。
