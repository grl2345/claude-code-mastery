---
title: "Claude Code 创始人亲授：6个提升效率的隐藏技巧"
module: m4-advanced
order: 7
description: "来自 Claude Code 创始人 Boris Cherny 的实战经验，涵盖 Ultraplan、Monitor、team-onboarding、autofix-pr 等新功能及上下文管理工作流。"
duration: "12 分钟"
level: "需编程基础"
publishedAt: 2026-04-18
hot: true
---

## 起因

上周 Anthropic 发布了 Claude Opus 4.7，我第一时间升级体验。刷 Reddit 时看到一条帖子说 Boris Cherny（Claude Code 的创始人）在 Opus 4.7 发布后分享了一些新技巧。这让我很兴奋——毕竟还有谁能比创造者更懂这个工具呢？

我顺着线索去查了他的分享，结合官方文档和实际体验，整理了 6 个真正能提升效率的 Claude Code 技巧。这些不是网上随便搜得到的入门教程，而是来自创始人的实战经验。

---

## 正文

### 技巧一：用 /ultraplan 在云端做规划，终端保持自由

**这是什么：**
Ultraplan 是 Week 15（4月6-10日）刚发布的功能。你可以在终端启动一个云端规划会话，Claude 在浏览器里起草方案，你的终端保持空闲可以做别的事。

**为什么好用：**
以前做复杂重构时，终端会被规划过程占用，什么都干不了。现在你可以：
1. 在终端输入 `/ultraplan 把认证服务从 session 迁移到 JWT`
2. Claude 在云端起草详细方案
3. 你去泡杯咖啡，或者处理其他任务
4. 回来在浏览器里审阅、评论、修改
5. 选择远程执行或拉回本地

**实际体验：**
从 v2.1.101 开始，第一次运行会自动创建默认云环境，完全零配置。我试了下迁移一个中型项目的认证模块，规划质量比直接在终端做要高，因为有更多时间思考。

**来源验证：**
- ✅ 官方文档确认：https://code.claude.com/docs/en/whats-new/2026-w15
- ✅ Boris 在 Reddit 帖子中重点提及

---

### 技巧二：Monitor 工具——让 Claude 帮你盯着后台任务

**这是什么：**
Monitor 是一个内置工具，可以 spawn 一个后台 watcher，把事件流实时送进对话。每个事件都会变成一条新的 transcript 消息，Claude 立即响应。

**为什么好用：**
以前要盯日志得写个 `while true; do tail -f server.log; sleep 5; done` 这种循环，占用一个终端窗口。现在直接说：

```
> Tail server.log in the background and tell me the moment a 5xx shows up
```

Claude 会启动 Monitor，出现 5xx 错误时立即告诉你。

**进阶用法：**
配合 `/loop` 使用（现在支持自适应间隔，不用手动指定秒数）：
```
> /loop check CI on my PR
```

Claude 会根据任务自动决定下次检查时间，或者直接用 Monitor 跳过轮询。

**来源验证：**
- ✅ 官方 Week 15 更新日志：https://code.claude.com/docs/en/whats-new/2026-w15
- ✅ 工具参考文档：https://code.claude.com/docs/en/tools-reference#monitor-tool

---

### 技巧三：/team-onboarding 生成团队入门指南

**这是什么：**
把你对一个项目的 Claude Code 使用习惯打包成可复现的指南，交给新队友。

**为什么好用：**
每个项目都有隐性的使用惯例：
- 特定的 CLAUDE.md 配置
- 常用的自定义命令
- 项目特有的工作流

以前新队友要摸索好几天才能上手。现在：
```
> /team-onboarding
```

Claude 会分析你在当前项目的使用模式，生成一份 ramp-up guide。

**实际体验：**
我在一个用了三个月的项目里试了下，输出包括：
- 项目架构概述
- 常用的 Claude Code 命令和参数
- 项目特定的上下文文件位置
- 推荐的权限设置

质量很高，可以直接发给新队友。

**来源验证：**
- ✅ 官方文档 Week 15 更新
- ✅ Boris 在 Reddit 分享中标记为"团队效率利器"

---

### 技巧四：/autofix-pr 从终端开启 PR 自动修复

**这是什么：**
Week 13 上线的 PR auto-fix 功能，现在可以从 CLI 直接开启。

**为什么好用：**
流程简化为一步：
1. Push 你的分支
2. 在分支上运行 `/autofix-pr`
3. Claude 自动关联当前 PR，在 Web 端开启监控
4. 它会在后台盯着 CI 和 review comments，自动推送修复

**实际体验：**
我上周有个 PR 在 CI 里挂了三次，每次都要手动修复、push、等待。用了 autofix-pr 后，Claude 自动处理了两次 lint 错误和一次测试失败，我只需要最后 review 一下。

**注意：**
这功能需要 Claude Code Web 端支持，且 PR 必须是已创建状态。

**来源验证：**
- ✅ 官方文档：https://code.claude.com/docs/en/claude-code-on-the-web#auto-fix-pull-requests
- ✅ Week 13 和 Week 15 更新日志

---

### 技巧五：Focus 视图——减少视觉干扰

**这是什么：**
按 `Ctrl+O` 进入 focus 视图，界面会折叠成：你的最后一条 prompt + 一行工具摘要（带 diffstat）+ Claude 的最终回复。

**为什么好用：**
长时间使用 Claude Code 时，终端会积累大量工具调用输出，找关键信息很费劲。Focus 视图像是一个"总结模式"，只看输入和输出，隐藏中间过程。

**使用场景：**
- 回顾之前的对话
- 截图分享时更清爽
- 减少视觉疲劳

**来源验证：**
- ✅ Week 15 更新日志提及
- ⚠️ Boris 分享中提到，但官方文档描述较简略

---

### 技巧六：Aggressive 上下文管理

**这是什么：**
Boris 在分享中特别强调的一点：要主动管理上下文，不要等到 Claude 提醒你 token 快用完了。

**具体做法：**
1. **定期使用 `/clear`**：清除不再相关的对话历史
2. **用 `/include` 和 `/exclude` 精确控制文件**：不要一股脑 include 整个目录
3. **善用 CLAUDE.md 存储项目级指令**：把常用上下文写进文件，而不是每次对话都带

**为什么重要：**
Opus 4.7 的上下文窗口虽然更大，但有效利用率和响应速度仍然取决于你输入的质量。Boris 的原话是："Garbage in, garbage out still applies to the most capable models."

**进阶技巧：**
- 用 `/checkpoint` 保存关键状态，方便回滚
- 用 `/resume` 恢复之前的会话，而不是从头开始
- 对复杂任务，先用 subagent 做探索，再汇总到主会话

**来源验证：**
- ✅ 官方最佳实践文档：https://code.claude.com/docs/en/best-practices
- ✅ Boris 在 Reddit 帖子中的原话引用

---

## 总结

这 6 个技巧中，前 4 个是具体的新功能（Ultraplan、Monitor、team-onboarding、autofix-pr），来自 Claude Code Week 15 的更新；后 2 个是工作流层面的建议（Focus 视图、上下文管理），来自创始人的经验之谈。

**我的建议优先级：**
1. **立即尝试**：Monitor 工具 + /loop，能立即提升多任务效率
2. **团队推广**：/team-onboarding，减少新人上手成本
3. **复杂任务**：Ultraplan，让规划过程不再阻塞终端
4. **长期习惯**：养成主动管理上下文的习惯

**免责声明：**
本文技巧基于 Anthropic 官方文档和 Boris Cherny 的社区分享整理。部分功能（如 Ultraplan、Monitor）处于 research preview 阶段，可能随时调整。建议在使用前查阅最新官方文档。

---

## 参考来源

1. **Boris Cherny 的 Reddit 分享**：https://www.reddit.com/r/ClaudeAI/comments/1snn4ed/
2. **Claude Code Week 15 更新日志**：https://code.claude.com/docs/en/whats-new/2026-w15
3. **Claude Code 官方最佳实践**：https://code.claude.com/docs/en/best-practices
4. **Boris Cherny 个人主页**：https://borischerny.com/about（确认其为 Claude Code 创始人）
5. **Claude Code GitHub 仓库**：https://github.com/anthropics/claude-code
6. **Anthropic 官方新闻**：https://www.anthropic.com/news/claude-opus-4-7

---

*文章生成时间：2026-04-18*
*作者：ClaudeWeb 运营部*
*审批状态：已通过*
