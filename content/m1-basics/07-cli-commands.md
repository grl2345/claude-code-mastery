---
title: "Claude Code CLI 常用命令有哪些？启动方式、斜杠命令与管道操作速查"
module: m1-basics
order: 7
group: "日常工作流"
description: "Claude Code CLI 支持交互模式、单次命令和续接对话三种启动方式。本文速查斜杠命令（/compact、/clear、/cost）、管道操作实例和常用启动参数。"
duration: "10 分钟"
level: "零基础"
publishedAt: 2026-03-21
---

## Claude Code 有哪几种启动方式？

**Claude Code CLI 有三种启动方式，适合不同场景：**

```bash
# 交互模式——最常用，启动后进入持续对话
$ claude

# 单次命令——适合快速提问，不需要来回对话
$ claude "解释 src/index.ts 的主要逻辑"

# 续接对话——继续上一次的对话上下文
$ claude --continue
```

日常用得最多的是交互模式，但单次命令在写脚本和自动化时特别有用。比如你可以在 git hook 里放一个 `claude --print "检查这段代码有没有明显问题"`，每次提交前自动过一遍。

## 对话中有哪些常用的斜杠命令？

**进入交互模式后，以下斜杠命令帮你管理对话状态：**

| 命令 | 作用 | 使用场景 |
|------|------|---------|
| `/help` | 显示帮助 | 忘记命令时 |
| `/clear` | 清除上下文 | 彻底重新开始 |
| `/compact` | 压缩对话历史 | 对话变长、回答走偏时 |
| `/cost` | 查看 token 消耗 | 监控费用 |
| `/exit` | 退出对话 | 结束会话 |

**`/compact` 是最值得掌握的命令。** 当对话变长后 Claude Code 开始"走神"时，`/compact` 会保留关键信息但释放上下文空间。比 `/clear` 好得多，因为 `/clear` 是彻底清空，之前聊的全没了。

> 建议：感觉"它好像不太记得之前说过什么了"的时候，先跑一次 `/compact`。compact 之后还不行，再考虑 `/clear` 重新开始。

## 如何用管道把命令行输出传给 Claude Code？

**管道是 Claude Code CLI 相比桌面端最大的优势——把任何命令行输出直接喂给 Claude Code 分析。**

基础用法：

```bash
# git diff 传给 Claude Code 做代码审查
$ git diff | claude "审查这些改动"

# 错误日志传给 Claude Code 分析
$ cat error.log | claude "分析这些错误"

# ESLint 输出传给 Claude Code 修复
$ npx eslint src/ 2>&1 | claude "修复这些 lint 错误"
```

进阶组合——嵌入 git hook、CI 脚本、构建流程：

```bash
# 每次 PR 自动生成 review 摘要
$ gh pr diff 42 | claude --print "总结这个 PR 的主要改动，列出潜在风险"

# 构建失败时快速定位原因
$ npm run build 2>&1 | claude "构建失败了，帮我分析原因并给出修复建议"

# 快速理解一段不熟悉的代码
$ cat src/legacy/parser.js | claude --print "用简洁的中文解释这段代码的核心逻辑"
```

> 小技巧：管道配合 `--print` 参数时，Claude Code 只输出结果文本，不进入交互模式。这在脚本和自动化场景中非常关键。

## Claude Code CLI 有哪些常用启动参数？

| 参数 | 作用 | 典型用途 |
|------|------|---------|
| `--print` | 只输出结果，不进入交互 | 脚本、自动化 |
| `--model` | 指定模型 | 切换 Sonnet/Opus |
| `--no-history` | 不加载历史对话 | 全新开始 |
| `--verbose` | 显示详细日志 | 调试、查看读取了哪些文件 |

其中 `--print` 用得最频繁。任何时候你想把 Claude Code 当作一个"接受输入、产出文本"的命令行工具来用，就加上它。
