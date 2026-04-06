---
title: "CLI 常用命令速查"
module: m1-basics
order: 6
group: "日常工作流"
description: "Claude Code CLI 的启动方式、斜杠命令、管道操作和常用参数速查。"
duration: "10 分钟"
level: "零基础"
publishedAt: 2026-03-21
---

## 启动方式

Claude Code 有几种不同的启动方式，适合不同场景：

```bash
# 交互模式——最常用，启动后进入持续对话
$ claude

# 单次命令——适合快速提问，不需要来回对话
$ claude "解释 src/index.ts 的主要逻辑"

# 续接对话——继续上一次的对话上下文
$ claude --continue
```

我日常用得最多的是交互模式，但单次命令在写脚本和自动化时特别有用。比如你可以在 git hook 里放一个 `claude --print "检查这段代码有没有明显问题"`，每次提交前自动过一遍。

## 对话中的斜杠命令

进入交互模式后，这些斜杠命令可以帮你管理对话状态：

| 命令 | 作用 |
|------|------|
| `/help` | 显示帮助 |
| `/clear` | 清除上下文 |
| `/compact` | 压缩对话历史 |
| `/cost` | 查看 token 消耗 |
| `/exit` | 退出对话 |

这里面 `/compact` 值得单独说一下。当对话变长之后，Claude Code 可能会开始"走神"——回答变得不那么精准，或者忘了前面讨论过的约定。这时候用 `/compact` 压缩一下，它会保留关键信息但释放上下文空间。比 `/clear` 好得多，因为 `/clear` 是彻底清空，之前聊的全没了。

> 我一般的习惯是：对话进行到感觉"它好像不太记得之前说过什么了"的时候，先跑一次 `/compact`。如果 compact 之后还是不行，再考虑 `/clear` 重新开始。

## 管道操作

管道是 Claude Code CLI 相比桌面端最大的优势。它让你可以把任何命令行输出直接喂给 Claude Code：

```bash
# git diff 传给 Claude Code 做代码审查
$ git diff | claude "审查这些改动"

# 错误日志传给 Claude Code 分析
$ cat error.log | claude "分析这些错误"

# ESLint 输出传给 Claude Code 修复
$ npx eslint src/ 2>&1 | claude "修复这些 lint 错误"
```

管道的真正威力在于组合。你可以把 Claude Code 嵌入到任何现有工作流中——git hook、CI 脚本、构建流程，甚至是 cron job。举几个我实际用过的例子：

```bash
# 每次 PR 自动生成 review 摘要
$ gh pr diff 42 | claude --print "总结这个 PR 的主要改动，列出潜在风险"

# 构建失败时快速定位原因
$ npm run build 2>&1 | claude "构建失败了，帮我分析原因并给出修复建议"

# 快速理解一段不熟悉的代码
$ cat src/legacy/parser.js | claude --print "用简洁的中文解释这段代码的核心逻辑"
```

> 小技巧：管道配合 `--print` 参数使用时，Claude Code 只输出结果文本，不进入交互模式。这在脚本和自动化场景中非常关键。

## 常用启动参数

| 参数 | 作用 |
|------|------|
| `--print` | 只输出结果，不进入交互 |
| `--model` | 指定模型 |
| `--no-history` | 不加载历史对话 |
| `--verbose` | 显示详细日志 |

这几个参数中，`--print` 用得最频繁。任何时候你想把 Claude Code 当作一个"接受输入、产出文本"的命令行工具来用，就加上它。`--verbose` 则主要在调试时有用，比如你想看 Claude Code 到底读了哪些文件、做了什么决策。
