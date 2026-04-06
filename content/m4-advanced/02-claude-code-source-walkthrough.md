---
title: "Claude Code 源码拆解手册"
module: m4-advanced
order: 2
group: "源码拆解"
description: "基于社区公开资料，系统拆解 Claude Code 的架构、引擎、工具系统与安全设计。"
duration: "120 分钟"
level: "进阶"
publishedAt: 2026-04-06
---

# 《Claude Code 源码拆解手册》

> **基于 2026-03-31 泄露的 Claude Code v2.1.88 源码**
> 约 51.2 万行 TypeScript · 1906 个源文件 · 44 个 Feature Flag
> 仓库参考：https://github.com/instructkr/claude-code

---

# 第一篇：全局概览

---

## 第1章 · 事件背景与源码全景

### 1.1 泄露事件始末

2026年3月31日凌晨，Anthropic 发布 Claude Code v2.1.88 版本。在这次常规更新中，npm 包内意外包含了一个约 59.8MB 的 `cli.js.map` 文件——这是一个 Source Map 文件，本应仅用于开发调试，却被打包进了生产版本。

Source Map 文件的本质是一个 JSON 结构，包含两个关键数组：`sources`（源文件路径列表）和 `sourcesContent`（对应的完整源码内容）。两者按索引一一对应，任何人只需一个简单脚本即可批量还原出全部原始 TypeScript 源码。

安全研究员 Chaofan Shou 在当天上午率先在 X 平台披露此事，帖子迅速获得超过 500 万浏览量。数小时内，GitHub 上出现多个完整镜像仓库，星标从 0 冲到 2 万以上。Anthropic 随后通过 DMCA 对超过 8000 个仓库发起下架请求，但代码已在社区中广泛传播。

值得注意的是，这并非 Anthropic 首次出现此类失误。2025年2月就曾发生过一次类似泄露，当时紧急修复后却未从根本上解决构建流水线的配置问题。有开发者在 Bun 项目中发现了一个相关的已知 Bug（oven-sh/bun#28001），该问题报告 Source Map 在生产模式下仍被生成，至泄露时仍处于开放状态。

需要强调的是：此次泄露仅涉及客户端工具的源码，不包含任何模型权重、用户对话记录或 API 密钥。

### 1.2 技术栈速查

Claude Code 的技术选型颇具特色，与常规 Node.js CLI 工具有显著区别：

| 类别 | 技术选型 | 说明 |
|------|---------|------|
| 运行时 | Bun | 替代 Node.js，更快的启动和执行速度 |
| 语言 | TypeScript（strict 模式） | 严格类型检查，约 51.2 万行 |
| 终端 UI | React + Ink | 用 React 组件模式构建终端界面 |
| CLI 解析 | Commander.js（extra-typings） | 命令行参数解析 |
| Schema 校验 | Zod v4 | 全局使用的运行时类型校验 |
| 代码搜索 | ripgrep | 通过 GrepTool 集成 |
| 协议支持 | MCP SDK、LSP | 模型上下文协议与语言服务协议 |
| API 客户端 | Anthropic SDK | 支持 1P、Bedrock、Vertex 三种接入方式 |
| 遥测 | OpenTelemetry + gRPC | 分布式追踪与指标收集 |
| Feature Flag | GrowthBook | 运行时特性开关与 A/B 测试 |
| 认证 | OAuth 2.0、JWT、macOS Keychain | 多层认证体系 |

选择 React + Ink 来构建 CLI 界面是一个大胆的决定。Ink 是一个将 React 组件模型引入终端的框架，意味着 Claude Code 的终端 UI 拥有状态管理、组件复用、声明式渲染等现代前端特性。这使得 140+ 个 UI 组件可以用声明式方式组合，而不是传统的字符串拼接。

### 1.3 目录结构地图

```
src/
├── main.tsx                 # 入口文件：Commander.js CLI 解析 + React/Ink 渲染器初始化
├── QueryEngine.ts           # 核心 LLM 调用引擎（~46K 行）
├── Tool.ts                  # 工具类型定义（~29K 行）
├── commands.ts              # 命令注册表（~25K 行）
├── tools.ts                 # 工具注册表
├── context.ts               # 系统/用户上下文收集
├── cost-tracker.ts          # Token 成本追踪
│
├── commands/                # Slash 命令实现（~50 个）
├── tools/                   # Agent 工具实现（~40 个）
├── components/              # Ink UI 组件（~140 个）
├── hooks/                   # React Hooks
├── services/                # 外部服务集成
│   ├── api/                 #   Anthropic API 客户端
│   ├── mcp/                 #   MCP 服务连接与管理
│   ├── oauth/               #   OAuth 2.0 认证
│   ├── lsp/                 #   LSP 管理器
│   ├── analytics/           #   GrowthBook 分析
│   ├── compact/             #   对话压缩
│   ├── plugins/             #   插件加载器
│   ├── autoDream/           #   自动"做梦"记忆整合
│   ├── extractMemories/     #   自动记忆提取
│   ├── policyLimits/        #   组织策略限制
│   └── teamMemorySync/      #   团队记忆同步
├── screens/                 # 全屏 UI（Doctor、REPL、Resume）
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
│
├── bridge/                  # IDE 集成桥接（VS Code、JetBrains）
├── coordinator/             # 多 Agent 协调器
├── plugins/                 # 插件系统
├── skills/                  # 技能系统
├── query/                   # 查询管道
├── memdir/                  # 持久记忆目录
├── tasks/                   # 任务管理
├── state/                   # 状态管理
├── migrations/              # 配置迁移
├── schemas/                 # 配置 Schema（Zod）
├── entrypoints/             # 初始化逻辑
├── ink/                     # Ink 渲染器封装
├── keybindings/             # 键盘快捷键
├── vim/                     # Vim 模式
├── voice/                   # 语音输入
├── remote/                  # 远程会话
├── server/                  # 服务器模式
├── buddy/                   # 电子宠物彩蛋
├── native-ts/               # 原生 TS 工具
├── outputStyles/            # 输出样式
└── upstreamproxy/           # 代理配置
```

### 1.4 关键文件索引

源码中有三个"巨型文件"值得特别关注：

**QueryEngine.ts（~46,000 行）** 是整个系统的大脑。它处理所有 LLM API 调用、流式响应、缓存和编排工作。将所有与模型 API 交互的逻辑集中在一个文件中，使得重试逻辑、速率限制、上下文预算管理和流式错误处理能够统一推理。

**Tool.ts（~29,000 行）** 定义了所有工具的基础类型和接口。这不是代码膨胀，而是严格的 Schema 校验、权限执行和错误处理在生产规模下的真实体量。

**commands.ts（~25,000 行）** 管理所有 Slash 命令的注册和执行，使用条件导入在不同环境下加载不同的命令集。

### 1.5 阅读本手册的方法

本手册按照"由外到内、由浅入深"的逻辑组织。推荐以下阅读路径：

**快速了解路径**：第1章（全景）→ 第2章（启动流程）→ 第3章（QueryEngine）→ 第6章（工具系统）

**Agent 架构师路径**：第3章 → 第6-10章（工具系统全系列）→ 第15章（多 Agent）→ 第31章（设计模式总结）

**安全研究路径**：第13章（权限系统）→ 第14章（安全设计）→ 第25章（KAIROS）→ 第27章（Undercover Mode）

**全面学习路径**：按章节顺序阅读，每章开头会指明前置知识依赖。

---

## 第2章 · 启动流程与生命周期

### 2.1 入口文件 main.tsx

Claude Code 的入口是 `main.tsx`，这是一个基于 Commander.js 的 CLI 解析器，同时也是 React/Ink 终端渲染器的启动点。

入口文件的一个突出设计特点是**多路径快速分发**。它不是一个简单的参数解析器，而是一个针对启动延迟优化的多路径调度器：

```
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // 快速路径 1: --version → 零导入，立即退出
  if (args[0] === '--version') {
    console.log(MACRO.VERSION); return
  }
  // 快速路径 2: --dump-system-prompt → 最小导入
  // 快速路径 3: --claude-in-chrome-mcp → MCP 服务器模式
  // 快速路径 4: --computer-use-mcp → Computer Use MCP
  // 快速路径 5: --daemon-worker → 精简 Worker（无配置/分析）
  // 快速路径 6: remote-control|rc|bridge → Bridge 模式
  // 快速路径 7: daemon → 长运行 Supervisor
  // 快速路径 8: ps|logs|attach|kill|--bg → 后台会话
  // 快速路径 9: new|list|reply → 模板任务
  // 快速路径 10: environment-runner → 无头 BYOC
  // ...

  // 默认路径: 加载完整 CLI → cliMain() → QueryEngine
}
```

这种设计有三个关键特征：

1. **到处使用动态 import()**：每个快速路径都使用 `await import()` 而非顶层导入。`--version` 路径甚至零模块导入，直接打印构建时内联的 `MACRO.VERSION` 后退出。

2. **feature() 门控实现死代码消除**：每个快速路径被 `feature('FLAG')` 检查包裹。构建时，Bun 的打包器会完全消除禁用特性的代码块。

3. **profileCheckpoint() 启动性能度量**：每个路径都记录检查点，用于精确测量所有入口向量的启动延迟。

### 2.2 并行预取策略

启动时间通过在模块加载之前并行预取多个资源来优化：

```
// main.tsx — 在其他 import 之前作为副作用触发
startMdmRawRead()        // MDM 企业管理设置
startKeychainPrefetch()  // macOS 钥匙串预读
```

完整的启动序列如下：

```
main.tsx
  ├─ startupProfiler.checkpoint('start')
  ├─ init() [entrypoints/init.ts]
  │   ├─ enableConfigs()         — 校验设置
  │   ├─ applySafeEnvVars()      — 预信任环境变量设置
  │   ├─ setupGracefulShutdown() — 优雅关闭
  │   ├─ initUpstreamProxy()     — CCR 代理（如需要）
  │   └─ preconnect to API       — API 预连接
  ├─ loadAuth()        — OAuth/API Key 认证
  ├─ loadGrowthBook()  — Feature Flag 加载
  ├─ checkQuota()      — 配额检查
  ├─ getSystemContext() — Git 状态、分支信息
  ├─ getUserContext()   — CLAUDE.md 文件、当前日期
  ├─ getAllBaseTools()   — 工具注册表
  ├─ getCommands()      — Slash 命令 + 技能
  └─ launchRepl()
       └─ <App> → <REPL> → PromptInput + Messages
```

### 2.3 懒加载机制

重量级模块通过动态 `import()` 延迟到实际需要时才加载：

- **OpenTelemetry**（约 400KB）：只在首次遥测事件触发时导入
- **gRPC**（约 700KB）：只在需要 gRPC 传输时导入

这种策略使得 Claude Code 的冷启动时间保持在可接受范围内，即使它的总代码体量超过 50 万行。

### 2.4 REPL 主循环

REPL（Read-Eval-Print Loop）是用户与 Claude Code 交互的主界面。它的核心流程：

1. **用户输入** → PromptInput 组件捕获
2. **输入处理** → 检查是否为 Slash 命令（`/` 前缀），如果是则路由到命令系统
3. **消息提交** → QueryEngine.submitMessage(prompt) 接管
4. **流式响应** → 通过 AsyncGenerator 逐 Token 产出，UI 实时更新
5. **工具调用** → 如果模型返回 tool_use 块，执行工具并将结果回传
6. **循环继续** → 直到模型发出 end_turn 或达到 max_tokens

### 2.5 会话恢复机制

`/resume` 命令允许恢复之前的会话。会话数据以 JSONL 格式持久化到磁盘，记录每一轮对话的完整消息历史、工具调用结果和上下文状态。恢复时，系统重建 QueryEngine 的状态，包括消息历史、文件缓存和 Token 使用量追踪。

---

# 第二篇：核心引擎

---

## 第3章 · QueryEngine — LLM 调用引擎

### 3.1 架构概述

QueryEngine 是 Claude Code 的中央编排器。它拥有对话状态、管理 LLM 查询循环、处理流式响应、追踪成本，并协调从用户输入处理到工具执行的一切。

一个关键洞察是：**Claude Code 的每一个公共接口——REPL、SDK、远程 Claude Code——都通过同一个 query() 生成器**。这意味着无论用户通过什么方式接入，底层的 Agent 循环逻辑完全一致。

QueryEngine 被拆分为两个层次，具有不同的生命周期：

- **会话层**：每个对话会话创建一个 QueryEngine 实例，持有可变的消息历史、AbortController、使用量追踪和文件缓存
- **请求层**：每次用户输入触发一次 `submitMessage()` 调用，协调完整的"输入 → API → 工具 → 压缩 → 下一轮"周期

### 3.2 Anthropic API 调用封装

API 调用封装在 `services/api/claude.ts` 的 `queryModelWithStreaming()` 函数中。它负责：

- **组装系统提示词**：包括基础 CLI 指令、工具描述、MCP 服务器指令和模式特定的引导
- **消息规范化**：确保消息格式符合 API 要求
- **Prompt 缓存断点**：策略性地放置缓存标记，可降低高达 90% 的 API 成本
- **Beta 头部**：根据功能需要添加 beta API 版本标识
- **思维链配置**：根据模式决定是否启用 thinking mode
- **速度模式**：支持不同的推理速度/质量权衡

### 3.3 流式响应处理

流式处理基于 Server-Sent Events，通过 AsyncGenerator 模式实现：

```
用户提交消息
    │
    ▼
QueryEngine.submitMessage()    ← AsyncGenerator
    │
    ▼
query() 异步生成器启动
    │
    ▼
queryModelWithStreaming()
    │
    ├─ 构建参数：系统提示词, 工具, 消息, beta 头, 缓存断点, 思维链配置
    │
    ├─ 调用 API：anthropicClient.messages.stream(params)
    │
    ▼
Stream<BetaRawMessageStreamEvent>
    │
    ├─ message_start ──────▶ 初始化消息累积器
    ├─ content_block_start ──▶ 新的 text/tool_use/thinking 块
    ├─ content_block_delta ──▶ 增量内容
    │   ├─ text_delta     ──▶ yield 到 UI（StreamingMarkdown）
    │   ├─ thinking_delta ──▶ yield 到 UI（ThinkingMessage）
    │   └─ input_json_delta ─▶ 累积工具输入 JSON
    ├─ content_block_stop ──▶ 块完成
    ├─ message_delta ──────▶ stop_reason, 最终 usage
    └─ message_stop ───────▶ 消息完成
    │
    ▼
处理 tool_use 块 → runTools() → yield 工具结果
    │
    ▼
循环回到 queryModelWithStreaming()（携带工具结果）
直到 stop_reason = "end_turn" 或 max_tokens 恢复耗尽
```

一个精妙的细节：tool_use 块通过 delta 传递 JSON 输入。如果工具的 `backfillObservableInput` 方法向输入添加了字段（例如展开文件路径），则只有消息的**克隆**被 yield 给观察者——原始消息保持字节级一致，以利于 Prompt 缓存。

### 3.4 工具调用循环

工具调用循环是 Claude Code 实现 Agent 行为的核心。`queryLoop()` 是一个 `while(true)` 循环，在迭代之间携带一个类型化的 State 对象：

```typescript
type State = {
  messages: Message[]
  toolUseContext: ToolUseContext
  autoCompactTracking: AutoCompactTrackingState | undefined
  maxOutputTokensRecoveryCount: number
  hasAttemptedReactiveCompact: boolean
  maxOutputTokensOverride: number | undefined
  pendingToolUseSummary: Promise<ToolUseSummaryMessage | null> | undefined
  stopHookActive: boolean | undefined
  turnCount: number
  transition: Continue | undefined  // 记录循环继续的原因
}
```

`transition` 字段记录了循环为什么继续——是因为有工具需要执行、需要恢复 max_tokens、还是其他原因。

循环终止条件包括：completed（完成）、blocking_limit（达到限制）、model_error（模型错误）、prompt_too_long（提示词过长）、aborted_streaming（流式中止）、stop_hook_prevented（停止 Hook 阻止）、image_error（图像错误）。

### 3.5 Thinking Mode

Thinking Mode 允许模型在生成最终回复之前展示其推理过程。源码显示，思维链内容作为独立的 content_block 类型（`thinking`）通过流式 API 传递，并在 UI 中通过 ThinkingMessage 组件渲染。

思维链的上下文管理需要特殊处理：thinking 块消耗的 Token 计入总用量，但在后续轮次中可能被选择性地裁剪，以为更重要的对话内容留出空间。

### 3.6 重试与容错

QueryEngine 内置了多层容错机制：

- **指数退避重试**：API 调用被 `withRetry()` 包裹，处理瞬态网络错误
- **速率限制处理**：识别 429 响应，按 API 返回的 Retry-After 头部等待
- **max_tokens 恢复**：当模型输出被 max_tokens 截断时，最多重试 3 次，每次增大输出窗口
- **上下文过长降级**：当 API 返回 `prompt_too_long` 错误时，触发反应式压缩（Reactive Compact），截断最旧的消息组后重试

### 3.7 Token 计数与成本追踪

`cost-tracker.ts` 实现了精确的成本追踪。Token 计数使用多种策略：

| 方法 | 精度 | 速度 | 使用场景 |
|------|------|------|---------|
| API Token 计数 | 精确 | 慢（需 API 调用） | 压缩前决策 |
| 字符数 / 4 | 约 85% | 即时 | 新消息估算 |
| 字符数 / 2 | 约 85%（JSON） | 即时 | JSON 密集内容 |
| 固定 2000 Token | N/A | 即时 | 图片/文档 |

使用量追踪在流式事件中实时更新：

```typescript
if (message.event.type === 'message_start') {
  currentMessageUsage = updateUsage(EMPTY_USAGE, message.event.message.usage)
}
if (message.event.type === 'message_delta') {
  currentMessageUsage = updateUsage(currentMessageUsage, message.event.usage)
}
```

---

## 第4章 · 上下文管理与压缩

### 4.1 上下文收集策略

`context.ts` 负责收集两类上下文：

**系统上下文**（每会话固定）：
- 基础 CLI 指令
- 工具描述（非延迟加载的）
- MCP 服务器指令
- 模式特定的引导信息

**用户上下文**（作为 system-reminder 注入）：
- CLAUDE.md 层级体系（项目记忆）
- Git 状态（分支、最近提交）
- 当前日期

CLAUDE.md 文件遵循严格的优先级层次：

```
/etc/claude-code/CLAUDE.md    ← 全局（系统级）
~/.claude/CLAUDE.md            ← 用户级
./CLAUDE.md                    ← 项目根目录
./.claude/CLAUDE.md            ← 项目配置目录
./.claude/rules/*.md           ← 项目规则文件
./CLAUDE.local.md              ← 本地（不提交到 Git）
```

这些上下文在每个会话中计算一次，然后缓存。

### 4.2 System Prompt 的动态组装

系统提示词不是一个静态字符串，而是一个动态组装的管道。`fetchSystemPromptParts()` 按顺序收集：

1. **核心身份**：Claude Code 的基础行为定义
2. **工具指令**：来自 50+ 个工具各自的 `prompt.ts` 文件
3. **CLAUDE.md**：多级查找的项目记忆
4. **环境上下文**：Git 信息、操作系统、工作目录

Prompt 缓存断点被策略性地放置在不同部分之间，使得稳定的部分（如核心身份和工具指令）可以跨请求缓存，而动态部分（如最新的对话消息）每次都重新计算。

### 4.3 三层压缩策略

这可能是整个代码库中对任何构建生产 AI 应用的团队最有直接价值的工程设计。Claude Code 使用三种不同的压缩策略，分别在不同时机触发：

```
Token 使用量 ────────────────────────────────────▶

0%         80%        85%        90%       98%
│           │          │          │          │
│ 正常运行  │ 微压缩   │ 自动压缩 │ 会话记忆 │ 阻塞
│           │(清除旧   │(全量摘要)│  压缩    │(硬停)
│           │ 工具结果)│          │          │
```

**微压缩（MicroCompact）** — 外科手术式精准清理：
- 就地编辑缓存内容，零 API 调用
- 目标：旧的工具输出被替换为 `[Old tool result content cleared]`
- 覆盖工具：FileRead、Bash、Grep、Glob、WebSearch、WebFetch、FileEdit、FileWrite
- 基于时间：清除超过可配置阈值的旧结果
- 最小信息损失——只移除原始工具输出

**自动压缩（AutoCompact）** — 全量摘要：
- 在约 167K Token 时触发（200K 上下文 - 20K 输出预留 - 13K 缓冲）
- 执行管道：
  1. 执行压缩前 Hook
  2. 从旧消息中剥离图片
  3. 将旧消息发送给模型进行摘要
  4. 用压缩边界标记替换摘要部分
  5. 重新注入关键上下文（技能、附件）
  6. 执行压缩后 Hook
- 内置断路器：连续 3 次压缩失败后停止重试
- 压缩后工作预算重置为 50,000 Token

**反应式压缩（Reactive Compact）** — 最后手段：
- 由 API 的 `prompt_too_long` 错误触发
- 截断最旧的消息组
- 以缩减的上下文重试

### 4.4 文件状态缓存

QueryEngine 维护一个 LRU 文件缓存，用于去重读取、变更检测和编辑/写入验证：

- 最大条目数：100 个文件
- 最大总大小：25MB
- 键：规范化的绝对路径
- 追踪内容：文件内容、时间戳、部分查看标志、用于编辑的原始内容

### 4.5 Token 估算策略

`tokenEstimation.ts` 在精度和速度之间做出权衡。对于大多数场景，使用 `字符数 / 4` 的快速估算已经足够。对于 JSON 密集的内容（如工具调用结果），使用 `字符数 / 2` 以提高精度。只有在做压缩决策等关键场景，才会调用 API 获取精确的 Token 计数。

---

## 第5章 · Query Pipeline

### 5.1 查询管道设计

`query/` 目录实现了从原始用户输入到最终 API 请求的完整管道。这个管道的核心是 `query.ts` 中的异步生成器函数，它产出 `StreamEvent | Message` 类型的事件。

在每次 API 调用之前，queryLoop 按照固定优先级顺序执行一系列上下文缩减策略：

1. **applyToolResultBudget()** — 限制单个工具结果的字节大小。过大的结果被存储到外部，并替换为一个引用存根
2. **微压缩** — 如果 Token 接近阈值，清除旧的工具输出
3. **自动压缩** — 如果 Token 仍然过高，执行全量摘要

### 5.2 上下文注入点

上下文在不同阶段被注入到请求中：

- **构建时**：系统提示词和工具定义
- **提交时**：用户消息和历史对话
- **压缩后**：重新注入最近访问的文件（每个文件最多 5,000 Token）、活动计划和相关技能 Schema

### 5.3 中间件模式

请求前处理和后处理采用类似中间件的模式。每个处理步骤都是一个独立的函数，接收当前状态并返回修改后的状态。这种设计使得添加新的处理步骤（如新的压缩策略）不需要修改核心循环逻辑。

---

# 第三篇：工具系统

---

## 第6章 · Tool 体系设计

### 6.1 工具基础架构

Tool.ts 中定义的工具接口是整个系统 Agent 行为的基础：

```typescript
interface Tool {
  name: string
  description: string
  inputJSONSchema: JSONSchema           // Zod 校验的输入 Schema

  call(input, context): Promise<Result>  // 核心执行逻辑
  validateInput?(input): ValidationResult
  checkPermissions?(input, context): PermissionResult

  isConcurrencySafe(input): boolean     // 是否可以并行运行？
  isReadOnly?: boolean                  // 无副作用？
  isEnabled?(): boolean                 // Feature Flag 门控？
  shouldDefer?: boolean                 // 延迟加载 Schema？
  alwaysLoad?: boolean                  // 覆盖延迟加载？
}
```

每个工具都是一个自包含的模块，定义了三个核心要素：

1. **输入 Schema**（Zod 校验）：运行时类型安全
2. **权限模型**：独立的风险评估
3. **执行逻辑**：实际的工具行为

### 6.2 工具注册机制

`tools.ts` 管理着 40+ 工具的注册表，分为三个层次：

**核心工具**（始终加载）：BashTool、FileReadTool、FileEditTool、FileWriteTool、GlobTool、GrepTool、AgentTool、SkillTool 等

**Feature Flag 门控工具**：
- KAIROS 门控：SendUserFile、PushNotification
- MONITOR_TOOL 门控：MonitorTool
- COORDINATOR 门控：TeamCreateTool、TeamDeleteTool
- AGENT_TRIGGERS 门控：CronCreate、CronDelete、CronList

**延迟加载工具**：所有 MCP 工具和标记 `shouldDefer=true` 的工具，通过 ToolSearchTool 按需发现

### 6.3 工具的统一抽象

工具系统的一个重要设计原则是：**没有共享的可变状态在工具之间泄露**。BashTool 和 FileReadTool 位于同一个注册表中，但具有根本不同的风险特征。Bash 执行可以改变系统状态，文件读取是只读的。架构对它们区别对待，为每个工具设置独立的权限级别，而不是应用一刀切的策略。

这种隔离在生产级 Agent 系统中极为重要——一个跨工具泄露的权限模型是安全和可靠性问题的温床。

### 6.4 工具发现与延迟加载

当存在 100+ 个 MCP 工具时，将所有 Schema 加载到系统提示词中会浪费大量 Token。ToolSearchTool 实现了延迟加载策略：

系统提示词中只包含工具名称列表（不含完整 Schema）。当模型需要使用某个工具时：

1. 模型调用 `ToolSearch({ query: "select:mcp__slack__send_message" })`
2. ToolSearchTool 返回该工具的完整 JSON Schema
3. 模型现在可以使用完整参数调用该工具

搜索算法支持多种模式：

| 查询模式 | 示例 | 行为 |
|---------|------|------|
| 精确选择 | `select:X,Y,Z` | 按名称精确匹配 |
| 必需+排序 | `+slack send` | 名称必须包含"slack"，按"send"排序 |
| 关键词搜索 | `notebook jupyter` | 加权关键词评分 |

评分权重：精确名称匹配 +12（MCP）/+10（常规），子串匹配 +6/+5，搜索提示匹配 +4，描述匹配 +2。

---

## 第7章 · 文件与代码操作工具

### 7.1 FileReadTool

FileReadTool 是一个多格式文件读取工具，支持：
- 文本文件：直接读取内容
- 图片：转换为 base64 编码
- PDF：提取文本内容
- Jupyter Notebook：解析 Cell 结构

读取结果进入文件缓存（LRU，最多 100 个文件，总计 25MB），用于后续的变更检测和去重。

### 7.2 FileWriteTool

FileWriteTool 负责文件的创建和覆盖。安全机制包括：
- 路径校验：防止写入受保护的系统文件
- 权限检查：根据工作目录和权限模式决定是否需要用户确认
- 写入前快照：在文件缓存中保存原始内容，支持回滚

### 7.3 FileEditTool

FileEditTool 采用字符串替换式的局部修改策略，而非全文覆盖。用户指定要替换的精确字符串和替换内容，工具验证原字符串在文件中唯一存在后执行替换。

这种设计有两个优势：
1. 最小化变更范围，降低出错风险
2. 变更清晰可见，方便审计和回滚

### 7.4 NotebookEditTool

NotebookEditTool 专门处理 Jupyter Notebook 的结构化编辑，理解 Cell 的概念，可以添加、删除、修改特定 Cell，保持 Notebook 的结构完整性。

### 7.5 GlobTool 与 GrepTool

**GlobTool** 基于文件模式匹配搜索，用于快速定位符合特定命名模式的文件。

**GrepTool** 基于 ripgrep 实现，是一个高性能的内容搜索工具。ripgrep 的选择不是偶然的——它在大型代码库中的搜索速度比传统 grep 快一个数量级，且默认尊重 .gitignore 规则。

---

## 第8章 · 系统与网络工具

### 8.1 BashTool

BashTool 是整个工具系统中风险最高的工具——它允许在用户的系统上执行任意 Shell 命令。源码显示其安全设计极为精细：

**危险命令检测**：维护一个模式列表，包括 `rm -rf`、`git push --force`、`DROP TABLE` 等高危操作。在自动模式下，还会额外过滤 `python`、`node`、`bash`、`npm run` 等可能执行任意代码的命令。

**沙箱边界**：BashTool 的权限等级高于其他大多数工具，每次执行都需要通过权限管道的审批。

**安全代码体量**：BashTool 相关的安全代码超过 300KB，涵盖命令解析、模式匹配和风险评估。

### 8.2 WebFetchTool 与 WebSearchTool

**WebFetchTool** 可以获取指定 URL 的内容，支持 HTML 解析和文本提取。

**WebSearchTool** 提供网络搜索能力，返回搜索结果摘要。

两者都受到权限系统的管控，确保网络访问行为可控。

### 8.3 LSPTool

LSPTool 集成了 Language Server Protocol，为 Claude Code 提供代码智能感知能力，包括：
- 符号定义跳转
- 引用查找
- 类型信息获取
- 诊断错误提示

通过 `services/lsp/` 的 LSP 管理器，Claude Code 可以连接到各种语言的 LSP 服务器，获得与 IDE 相当的代码理解能力。

---

## 第9章 · Agent 与协作工具

### 9.1 AgentTool — 子 Agent 生成

AgentTool 是整个工具系统中最巧妙的设计之一。它让系统可以像调用任何其他工具一样生成子 Agent——不需要特殊的编排层或独立的进程模型。子 Agent 是同一个工具注册表的一等公民。

每个子 Agent 具有：
- **独立的 agentId**：唯一 UUID
- **克隆的文件缓存**：与父 Agent 隔离的读取视图
- **独立的 AbortController**（异步模式）或共享的（同步模式）
- **过滤的工具池**：根据 Agent 定义限制可用工具
- **覆盖的系统提示词**：针对特定 Agent 类型定制
- **独立的转录记录**：JSONL 侧链文件

**Fork 子 Agent（Prompt 缓存优化）**：这是一个精彩的优化。当从相同上下文生成多个 Agent 时，使用 fork 模式可以最大化 API Prompt 缓存命中率：

```
父对话（100K Token 已缓存）：
  [...历史消息..., assistant(tool_use_1, tool_use_2, tool_use_3)]

Fork 子 Agent A:                    Fork 子 Agent B:
  [...历史消息...,                     [...历史消息...,
   assistant(tool_use_1,2,3),          assistant(tool_use_1,2,3),
   user(placeholder, placeholder,      user(placeholder, placeholder,
        "研究认证 Bug")]                    "修复 CSS 布局")]

  ▲ 相同前缀 = 缓存命中              ▲ 相同前缀 = 缓存命中
  只有最后的指令不同                   只有最后的指令不同
```

### 9.2 TeamCreateTool 与 TeamDeleteTool

团队模式允许创建持久化的团队配置：

- 团队文件持久化到 `~/.claude/teams/{name}.json`
- InProcessTeammates 作为同一进程中的异步任务运行
- 支持结构化的关闭协议（请求 → 批准/拒绝）

### 9.3 SendMessageTool

SendMessageTool 实现了 Agent 间的消息路由，支持多种通信方式：

| 通信方式 | 机制 | 场景 |
|---------|------|------|
| 进程内 | queuePendingMessage() → pendingUserMessages[] | 同进程内的 Agent |
| 文件系统 | writeToMailbox() → 磁盘上的 JSON 文件 | tmux/远程场景 |
| 广播 | to="*" → 遍历所有团队成员 | 全员通知 |
| 关闭 | shutdown_request → shutdown_response | 优雅停止 |

### 9.4 TaskCreateTool 与 TaskUpdateTool

任务系统管理后台任务的完整生命周期：

```
pending → running → completed | failed | killed
```

任务类型包括：
- `local_bash`：后台 Shell 命令
- `local_agent`：后台子 Agent
- `remote_agent`：远程 Bridge 会话
- `in_process_teammate`：进程内团队成员
- `local_workflow`：工作流脚本
- `monitor_mcp`：MCP 服务器监控
- `dream`：后台记忆整合

### 9.5 SleepTool

SleepTool 是主动模式（Proactive Mode）下的等待机制。在 KAIROS 模式中，Agent 不是被动等待用户输入，而是主动决定何时行动。SleepTool 允许 Agent 在没有需要处理的事情时优雅地等待，而不是空转消耗资源。

---

## 第10章 · 模式切换与特殊工具

### 10.1 Plan Mode

`EnterPlanModeTool` / `ExitPlanModeTool` 实现了规划模式的切换。在 Plan Mode 下：
- Agent 暂停工具执行
- 展示详细的行动计划
- 用户可以审查、修改计划后再执行
- 适用于复杂任务的分步规划

### 10.2 Git Worktree 隔离

`EnterWorktreeTool` / `ExitWorktreeTool` 利用 Git Worktree 功能，为 Agent 创建隔离的工作环境。这使得 Agent 可以在不影响主工作目录的情况下进行实验性修改。

### 10.3 定时与远程触发

**CronCreateTool** 创建定时触发器，使 Agent 可以按计划执行任务。

**RemoteTriggerTool** 支持远程触发 Agent 动作，例如通过 GitHub Webhook 触发代码审查或 Bug 修复。

### 10.4 SyntheticOutputTool

SyntheticOutputTool 用于生成结构化输出。当 Agent 需要产出格式化的数据（而非自由文本）时，这个工具确保输出符合预定义的 Schema。

### 10.5 MCPTool

MCPTool 是连接 MCP（Model Context Protocol）服务器工具的桥梁。它将 MCP 工具的调用转换为标准的工具执行流程，包括参数传递、结果解析和错误处理。

工具名称遵循 `mcp__{server}__{tool}` 的命名规范。例如，来自 "slack" 服务器的 "send_message" 工具会被注册为 `mcp__slack__send_message`。

---

# 第四篇：命令系统

---

## 第11章 · 命令注册与执行

### 11.1 命令注册表架构

`commands.ts` 是一个约 25,000 行的命令注册中心。它管理所有 Slash 命令的注册、发现和执行。

### 11.2 路由机制

当用户输入以 `/` 开头时，输入处理器会将其识别为 Slash 命令，并将其路由到命令系统而非 QueryEngine。命令系统解析命令名称和参数，找到对应的命令处理器并执行。

### 11.3 条件导入

命令系统使用条件导入在不同环境下加载不同的命令集。例如，某些命令只在特定的 Feature Flag 启用时才可用，某些命令只在内部构建版本中存在。

---

## 第12章 · 核心命令详解

### 12.1 Git 工作流命令

| 命令 | 功能 |
|------|------|
| `/commit` | 创建 Git 提交，自动生成提交消息 |
| `/diff` | 查看当前变更 |
| `/pr_comments` | 查看 PR 评论 |
| `/review` | 执行代码审查 |

### 12.2 配置与诊断命令

| 命令 | 功能 |
|------|------|
| `/config` | 管理设置 |
| `/doctor` | 环境诊断（全屏 UI） |
| `/cost` | 查看 Token 使用成本 |
| `/theme` | 切换主题 |

### 12.3 记忆与技能命令

| 命令 | 功能 |
|------|------|
| `/memory` | 持久记忆管理——读取和写入 MEMORY.md |
| `/skills` | 技能管理——列出、启用、禁用技能 |
| `/tasks` | 任务管理——查看后台任务状态 |

### 12.4 会话管理命令

| 命令 | 功能 |
|------|------|
| `/resume` | 恢复之前的会话 |
| `/share` | 分享当前会话 |
| `/compact` | 手动触发上下文压缩 |
| `/context` | 可视化当前上下文使用情况 |

### 12.5 认证与集成命令

| 命令 | 功能 |
|------|------|
| `/login` / `/logout` | 认证管理 |
| `/mcp` | MCP 服务器管理——添加、移除、列出 MCP 服务器 |

### 12.6 跨端联动命令

| 命令 | 功能 |
|------|------|
| `/desktop` | 移交到桌面应用 |
| `/mobile` | 移交到移动应用 |

这两个命令揭示了 Claude Code 的跨平台战略——终端 CLI 不是孤立的产品，而是多端协同体验的一部分。

---

# 第五篇：权限与安全

---

## 第13章 · 权限系统

### 13.1 权限拦截器

`hooks/toolPermission/` 实现了一个多层权限管道，每次工具调用都必须通过此管道才能执行：

```
工具调用到达
    │
    ▼
┌──────────────┐    ┌────────────┐
│ 检查模式     │───▶│ bypass     │──▶ 允许（跳过所有检查）
│              │    │ Permissions │
│              │    └────────────┘
│              │    ┌────────────┐
│              │───▶│ dontAsk    │──▶ 拒绝（阻止所有）
└──────┬───────┘    └────────────┘
       │
       ▼
┌──────────────┐
│ 应用规则     │
│  1. Deny 规则 │──▶ 匹配则拒绝
│  2. Allow 规则│──▶ 匹配则允许
│  3. Ask 规则  │──▶ 匹配则询问用户
└──────┬───────┘
       │ 无匹配规则
       ▼
┌──────────────┐
│ 自动模式？   │──是──▶ LLM 分类器
│              │        │
│              │        ├─ 白名单工具？→ 允许
│              │        ├─ 分类器认为安全？→ 允许
│              │        └─ 分类器认为不安全？→ 拒绝
│              │            (拒绝追踪：
│              │             连续 >3 次或总计 >20 次
│              │             → 回退到询问模式)
└──────┬───────┘
       │ 非自动模式
       ▼
┌──────────────┐
│ 模式特定行为 │
│  default     │──▶ 询问用户
│  acceptEdits │──▶ 允许工作目录内的文件编辑，其他询问
│  plan        │──▶ 暂停并展示计划
└──────────────┘
```

### 13.2 权限模式

| 模式 | 符号 | 行为 |
|------|------|------|
| default | `>` | 对所有非只读工具询问用户 |
| acceptEdits | `>>` | 自动允许工作目录内的文件编辑 |
| plan | `?` | 在每次工具调用之间暂停供用户审查 |
| bypassPermissions | `!` | 跳过所有检查（危险） |
| auto | `A` | LLM 分类器决策（Feature Flag 门控） |

### 13.3 用户审批流程

在 default 模式下，当工具调用需要审批时：
1. PermissionRequest 对话框覆盖在 UI 上
2. 展示工具名称、输入参数和预期行为
3. 用户可以批准（允许本次）、始终允许（记住决策）或拒绝
4. 决策结果被记录，用于后续的规则匹配

### 13.4 自动授权策略

在自动模式下，一个 LLM 分类器（使用 Haiku 模型以降低成本和延迟）评估每个工具调用的安全性。分类器考虑：
- 工具类型和输入参数
- 当前对话上下文
- 历史审批模式

内置的断路器机制防止分类器持续做出错误决策：连续 3 次拒绝或总计 20 次拒绝后，自动回退到人工审批模式。

### 13.5 组织级策略

`policyLimits/` 实现了企业级的策略限制。通过 MDM（Mobile Device Management）策略，企业管理员可以：
- 限制可用的工具集
- 强制特定的权限模式
- 禁用某些 Feature Flag
- 配置远程管理的设置

---

## 第14章 · 安全设计模式

### 14.1 BashTool 的安全边界

BashTool 的安全代码超过 300KB，涵盖：

**危险文件保护**：.gitconfig、.bashrc、.zshrc、.mcp.json 等文件被阻止修改。大小写不敏感的规范化防止绕过。

**危险命令检测**：维护 Bash 模式列表，包括 `rm -rf`、`git push --force`、`DROP TABLE` 等。在自动模式下额外过滤可能执行任意代码的命令（python、node、bash、npm run 等）。

**bypassPermissions 远程开关**：GrowthBook Feature Flag 可以远程禁用 bypass 模式。在启动时和 `/login` 后重新检查。

### 14.2 文件操作安全

- 路径校验：所有文件路径都经过规范化处理
- 工作目录限制：默认只允许在当前工作目录及子目录内操作
- 技能范围收窄：编辑 `.claude/skills/X/` 时，系统提供"仅允许此技能"的选项，而非宽泛的 `.claude/` 写入权限

### 14.3 认证体系

认证系统支持多种方式：
- **OAuth 2.0**：完整的认证流程，包括授权码获取和 Token 刷新
- **JWT**：用于 Bridge 系统的会话认证
- **macOS Keychain**：安全存储 API 密钥和 Token
- **API Key**：直接使用 Anthropic API 密钥

### 14.4 反蒸馏机制

源码揭示了两种反蒸馏（Anti-Distillation）机制：

**假工具注入**：当 `ANTI_DISTILLATION_CC` 标志启用时，Claude Code 在 API 请求中发送 `anti_distillation: ['fake_tools']`。服务器会静默注入虚假的工具定义到系统提示词中。如果竞争对手录制 Claude Code 的 API 流量来训练模型，这些假工具会污染训练数据。

**连接器文本摘要**：第二种机制在 `betas.ts` 中实现。启用后，API 缓冲 Assistant 在工具调用之间的文本，返回摘要并附带加密签名。后续轮次中，原始文本可以通过签名恢复。

### 14.5 Undercover Mode

Undercover Mode 是一个备受争议的功能。当 Anthropic 员工在非内部仓库上使用 Claude Code 时自动激活：

- 剥离 `Co-Authored-By: Claude` 的 Git 归属
- 提交消息中不得出现 "Claude Code" 或任何内部代号
- 禁止在公开 PR 中引用内部模型版本号

系统提示词中的指令是："你正在卧底模式下运行……你的提交消息绝不能包含任何 Anthropic 内部信息。不要暴露你的身份。"

一个重要细节：可以通过 `CLAUDE_CODE_UNDERCOVER=1` 强制开启此模式，但**没有强制关闭的开关**。在外部构建版本中，整个函数被死代码消除为空操作。

讽刺的是：Undercover Mode 正是为了防止内部信息泄露而构建的，结果它自身连同 51.2 万行源码一起泄露了。

---

# 第六篇：多 Agent 架构

---

## 第15章 · Coordinator — 多 Agent 协调器

### 15.1 三层多 Agent 体系

Claude Code 支持三个层次的多 Agent 执行：

**层次 1：子 Agent（AgentTool）**
- 主 Agent 通过 AgentTool 生成子 Agent
- 隔离的文件缓存、独立的 AbortController、独立的转录
- 过滤的工具池、覆盖的系统提示词
- 返回文本结果给父 Agent

**层次 2：协调器模式（Coordinator Mode）**
- 通过 `CLAUDE_CODE_COORDINATOR_MODE=1` 启用
- 系统提示词改写为编排导向
- Worker 通过 AgentTool 生成，使用受限工具集
- 使用 XML 任务通知协议传递结果
- 协调器聚合结果并响应用户

**层次 3：团队模式（Team Mode）**
- TeamCreateTool 创建命名团队
- 团队配置持久化到 `~/.claude/teams/{name}.json`
- InProcessTeammates 作为同进程异步任务运行
- SendMessageTool 在团队成员间路由消息
- 共享 scratchpad 文件系统用于知识交换
- 结构化关闭协议

### 15.2 邮箱模式（Mailbox Pattern）

多 Agent 系统使用邮箱模式处理危险操作。一个执行任务的 Worker Agent 不能独立批准高风险操作，而是发送请求到协调器的邮箱并等待。协调器评估后批准或拒绝。

原子认领机制防止两个 Worker 同时处理同一个审批——这在任何有并行执行的系统中都是关键细节。

所有 Agent 共享的内存空间意味着团队维持连贯的上下文，无需冗余的重新获取。

### 15.3 任务调度与并行执行

工具执行的编排遵循并发安全原则：

```
模型返回: [tool_use_A (Read), tool_use_B (Read), tool_use_C (Edit)]

步骤 1: 按并发安全性分批
  批次 1: [A: Read ✓, B: Read ✓]  — 都是 isConcurrencySafe
  批次 2: [C: Edit ✗]             — 需要独占访问

步骤 2: 执行批次
  批次 1: A 和 B 并行运行（最多 10 个并发）
  批次 2: C 串行运行（在批次 1 完成后）

步骤 3: 兄弟错误处理
  如果 A 在并行执行中出错：
    → siblingAbortController.abort()
    → B 被取消，附带"并行工具调用出错"消息
    → 两个结果都返回（错误 + 已取消）
```

### 15.4 Agent Swarm 模式

Agent Swarm 是通过 AgentTool 递归生成子 Agent 实现的。每个子 Agent 可以进一步生成自己的子 Agent，形成一个动态的执行树。这种模式适用于大规模的代码库重构等需要高度并行的任务。

---

## 第16章 · 任务与状态管理

### 16.1 任务生命周期

```
pending → running → completed | failed | killed
```

每种任务类型有不同的生命周期管理。`dream` 任务（后台记忆整合）是一种特殊类型，它在用户空闲时静默运行，完成后不打扰用户。

Dream 任务的状态追踪：

```typescript
DreamTaskState:
  phase: 'starting' | 'updating'
  sessionsReviewing: number
  filesTouched: string[]        // 追踪修改了哪些文件
  turns: DreamTurn[]            // 最多 30 轮活动
  priorMtime: number            // 用于终止时的回滚
```

### 16.2 全局状态管理

`state/` 目录实现了全局状态管理架构。AppState 包含 300+ 个属性，通过 `Store<T>` 发布/订阅模式管理，React 组件通过 `useSyncExternalStore` Hook 消费。

数据流是单向的：

```
组件 ←── 读取 ── AppState ── 设置 ──▶ Effects
  │                                      │
  └── 用户动作 ──▶ Input Handler ──▶ QueryEngine ──▶ setState()
```

### 16.3 Agent 间的状态隔离

每个子 Agent 拥有独立的状态空间：
- 克隆的文件缓存确保读取隔离
- 独立的消息历史防止上下文污染
- 可选的 Git Worktree 提供文件系统级隔离

---

# 第七篇：IDE 集成与桥接

---

## 第17章 · Bridge 系统

### 17.1 概述

`bridge/` 目录实现了 Claude Code CLI 与 IDE 扩展（VS Code、JetBrains）之间的双向通信层。

### 17.2 核心组件

| 文件 | 职责 |
|------|------|
| `bridgeMain.ts` | 桥接主循环 |
| `bridgeMessaging.ts` | 消息协议——定义 CLI 和 IDE 之间的通信格式 |
| `bridgePermissionCallbacks.ts` | 权限回调——将 IDE 的权限决策传递给 CLI |
| `replBridge.ts` | REPL 会话桥接——在 IDE 内嵌入 REPL 体验 |
| `jwtUtils.ts` | JWT 认证——确保 Bridge 连接的安全性 |
| `sessionRunner.ts` | 会话执行管理——管理 Bridge 会话的生命周期 |

### 17.3 通信协议

Bridge 使用 JSON 消息协议，支持双向事件流。IDE 扩展可以：
- 发送用户输入到 CLI
- 接收流式响应和工具执行结果
- 传递权限决策
- 同步文件状态

---

## 第18章 · MCP 与 LSP 集成

### 18.1 MCP 客户端架构

MCP（Model Context Protocol）客户端支持三种传输方式：

| 传输 | 机制 | 场景 |
|------|------|------|
| stdio | 本地进程 stdin/stdout 管道 | 本地 MCP 服务器 |
| SSE/HTTP | 远程 HTTP EventSource + OAuth 认证 | 远程 MCP 服务器 |
| WebSocket | 持久连接 + TLS/代理 | 持久化连接 |

MCP 服务器连接状态是一个联合类型：
- `ConnectedMCPServer`：活跃连接，拥有可用工具和资源
- `FailedMCPServer`：连接失败
- `NeedsAuthMCPServer`：需要 OAuth 认证
- `PendingMCPServer`：连接中
- `DisabledMCPServer`：用户禁用

超时设置为 100,000,000ms（约 27.8 小时），这个极长的默认超时反映了某些 MCP 工具可能需要执行长时间运行的任务。

### 18.2 MCP 配置作用域

| 作用域 | 位置 | 场景 |
|--------|------|------|
| local | `.claude/settings.local.json` | 用户本地专属 |
| user | `~/.claude/settings.json` | 用户全局 |
| project | `.claude/settings.json` | 团队共享 |
| dynamic | 运行时注册 | 程序化服务器 |
| enterprise | MDM 策略 | 企业管理 |
| managed | 策略设置 | 企业托管 |

### 18.3 LSP 集成

`services/lsp/` 管理 Language Server Protocol 连接，为 Claude Code 提供代码智能能力。LSP 管理器可以同时连接多个语言服务器，支持不同编程语言的智能感知。

### 18.4 MCP + LSP 协同

MCP 和 LSP 在代码智能中互补：
- **MCP** 提供外部工具和数据源集成（如 GitHub、Slack、数据库）
- **LSP** 提供代码级别的语义理解（定义跳转、类型推断、诊断）

两者共同使 Claude Code 既能理解代码的语义，也能与外部开发工具链交互。

---

# 第八篇：终端 UI 与交互

---

## 第19章 · React + Ink 终端渲染

### 19.1 技术选型

选择 React + Ink 来构建终端 UI 是 Claude Code 最具特色的技术决策之一。Ink 是一个将 React 的组件模型引入终端的框架：

```
React Fiber ──▶ Yoga Layout（Flexbox） ──▶ Screen Buffer（2D Cell Grid）
                                                    │
                                                    ▼
                                              ANSI 输出
                                          （基于 diff 的更新，60fps 帧循环）
```

这意味着：
- 声明式 UI：描述"应该是什么样"而非"如何操作"
- 组件复用：140+ 个可组合的 UI 组件
- 状态管理：React Hooks 驱动的状态更新
- 虚拟化渲染：只渲染可见区域，优化长对话性能

### 19.2 组件树

```
<App>
  ├─ <FpsMetricsProvider>
  ├─ <StatsProvider>
  ├─ <AppStateProvider>
  ├─ <NotificationsProvider>
  ├─ <VoiceProvider>
  └─ <REPL>                          ← 主屏幕
      ├─ <LogoV2>
      ├─ <Messages>
      │   └─ <VirtualMessageList>      ← 窗口化虚拟列表
      │       ├─ <UserTextMessage>
      │       ├─ <AssistantTextMessage>
      │       │   └─ <StreamingMarkdown>
      │       ├─ <AssistantToolUseMessage>
      │       ├─ <AssistantThinkingMessage>
      │       └─ <ToolUseLoader>
      └─ <PromptInput>
          ├─ <TextInput> / <VimTextInput>
          ├─ <PromptInputFooter>
          │   ├─ 模型选择器
          │   ├─ 思维链开关
          │   └─ 统计信息（Token、成本）
          └─ <VoiceIndicator>

对话框覆盖层：
  ├─ <PermissionRequest>
  ├─ <QuickOpenDialog>
  ├─ <GlobalSearchDialog>
  ├─ <ModelPicker>
  └─ <ExportDialog>
```

### 19.3 关键 UI 创新

**VirtualMessageList** — 长对话的窗口化渲染：
- 只渲染可见消息 + 过扫描缓冲区
- 追踪滚动位置并处理跳转导航
- 防止屏幕外消息的重新渲染

**StreamingMarkdown** — 流式 Markdown 渲染：
- 随着 Token 到达逐字符更新
- 正确处理不完整的 Markdown 语法（如未闭合的代码块）
- 代码块通过 HighlightedCode 组件提供语法高亮

### 19.4 输出样式

`outputStyles/` 定义了不同的输出样式方案，包括 Markdown 渲染、代码高亮和工具输出格式化。

---

## 第20章 · 交互细节

### 20.1 键盘快捷键

`keybindings/` 定义了可配置的键盘快捷键系统。用户可以自定义常用操作的快捷键。

### 20.2 Vim 模式

`vim/` 实现了完整的 Vim 模式支持。通过 `/vim` 命令切换，为熟悉 Vim 操作的开发者提供原生体验。VimTextInput 替代标准 TextInput 组件，支持普通模式、插入模式和可视模式。

### 20.3 语音输入

`voice/` 定义了语音输入接口。虽然在外部构建中被 Feature Flag 门控（`VOICE_MODE`），但源码显示它包含一个完整的按键说话（push-to-talk）界面。VoiceProvider 和 VoiceIndicator 组件管理语音捕获和状态展示。

### 20.4 流式渲染优化

为了在 60fps 帧循环中保持流畅：
- 基于 diff 的 ANSI 输出：只更新变化的字符，而非重绘整个屏幕
- 增量更新：StreamingMarkdown 组件在每个 delta 到达时精确更新
- 闪烁抑制：通过 Yoga 布局引擎的稳定布局防止内容跳动

---

# 第九篇：扩展体系

---

## 第21章 · 插件系统

### 21.1 插件架构

插件是 Claude Code 的扩展包，可以包含：

```
Plugin Manifest:
  ├─ name, description, version
  ├─ skills[]          ← 捆绑的技能
  ├─ hooks{}           ← 生命周期 Hook
  ├─ mcpServers{}      ← MCP 服务器配置
  └─ lspServers{}      ← LSP 服务器配置
```

### 21.2 插件生命周期

```
install → 写入设置意图 → 启动时物化
enable  → settings.enabledPlugins[id] = true
disable → settings.enabledPlugins[id] = false
update  → 重新下载、重新物化
```

### 21.3 插件作用域

| 作用域 | 优先级 | 说明 |
|--------|--------|------|
| managed | 最高 | 管理员控制 |
| project | 高 | .claude/ 目录 |
| local | 中 | CWD .claude/ |
| user | 低 | ~/.claude/ |

---

## 第22章 · Skill 系统

### 22.1 技能加载管道

技能来自四个源头，按优先级从高到低：

1. **托管技能**（Managed）：企业策略控制
2. **项目技能**（Project）：`./.claude/skills/` 目录
3. **用户技能**（User）：`~/.claude/skills/` 目录
4. **内置技能**（Bundled）：编译进二进制（/loop、/claude-api、/schedule 等 16+ 个）
5. **MCP 技能**：运行时从 MCP 服务器发现

去重使用 `realpath()` 规范化路径比较。

### 22.2 技能配置

每个技能通过 SKILL.md 文件定义，使用 frontmatter 配置：

```yaml
---
name: "My Skill"
description: "这个技能做什么"
when_to_use: "当用户要求 X 时"
arguments: ["target", "options"]
allowed-tools: [Read, Grep, Glob]
user-invocable: true
model: "opus"
context: "fork"           # inline（原地展开）或 fork（子 Agent）
agent: "code-reviewer"    # fork 执行时的 Agent 类型
effort: "high"            # Token 预算提示
paths: ["src/**/*.ts"]    # 仅当编辑这些文件时激活
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: "command"
          command: "validate.sh"
---
```

### 22.3 执行模式

**内联模式**（默认）：技能内容展开到当前对话中

**Fork 模式**：技能以独立子 Agent 运行，拥有自己的上下文和预算

**条件技能**（路径过滤）：只在模型触及特定文件后才变得可见。例如，一个 React 模式技能配置了 `paths: ["src/components/**/*.tsx"]`，只有当模型编辑了组件文件后，该技能才可用。

### 22.4 MCP Shell 安全

一个重要的安全限制：来自 MCP 的技能**永远不能执行 Shell 命令**。这防止了通过不受信任的 MCP 服务器实施远程代码执行攻击。

---

## 第23章 · 持久记忆

### 23.1 Memory Directory 结构

```
~/.claude/projects/<project-slug>/memory/
├── MEMORY.md           ← 索引文件（最多 200 行），每行指向一个记忆文件
├── user_role.md        ← 用户类型：角色、偏好
├── feedback_testing.md ← 反馈类型：要重复/避免的行为
├── project_auth.md     ← 项目类型：持续的工作上下文
└── reference_docs.md   ← 参考类型：外部系统指针
```

每个记忆文件有 frontmatter：

```yaml
---
name: User Role
description: 资深工程师，偏好简洁回复
type: user
---
用户是有 10 年 Go 经验的资深后端工程师。
对这个仓库中的 React 前端还是新手。
```

### 23.2 自动记忆提取

`services/extractMemories/` 实现了从对话中自动提取关键信息的功能。系统识别用户偏好、项目知识和工作模式，将其存储为持久记忆。

### 23.3 团队记忆同步

`teamMemorySync/` 在团队成员间同步记忆信息。共享的 scratchpad 文件系统允许 Agent 之间交换知识发现。

### 23.4 Dream 记忆整合

Dream 机制（`services/autoDream/`）在用户空闲时运行，执行记忆整合：

- 回顾最近的会话转录
- 合并重复的观察
- 消除逻辑矛盾
- 将模糊推断转化为确定知识
- 更新 MEMORY.md 和各记忆文件

这个过程被形象地称为"做梦"——AI 白天帮你写代码，深夜在后台整理记忆来更好地理解你。

---

# 第十篇：隐藏功能与未来蓝图

---

## 第24章 · Feature Flags 与未发布功能

### 24.1 编译时特性开关

Claude Code 使用 Bun 的 `bun:bundle` 编译时特性开关实现死代码消除：

```typescript
import { feature } from 'bun:bundle'

const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

当 Feature Flag 编译为 `false` 时，整个代码块在构建时被完全消除——不是运行时检查跳过，而是根本不存在于生产包中。这是一种零运行时开销的功能管理方式。

### 24.2 已知 Feature Flag 列表

源码中发现了 44 个编译时 Feature Flag，其中至少 20 个门控了已构建和测试但未出现在外部发布版本中的功能：

| Flag | 功能 | 状态 |
|------|------|------|
| KAIROS | 永远在线的后台守护进程 | 内部测试 |
| BUDDY | 电子宠物系统 | 已发布（泄露后提前上线） |
| VOICE_MODE | 语音交互，含按键说话界面 | 内部测试 |
| ULTRAPLAN | 云端深度规划（最长 30 分钟） | 内部测试 |
| PROACTIVE | 主动式 Agent 行为 | 内部测试 |
| DAEMON | 长运行守护进程模式 | 内部测试 |
| BRIDGE_MODE | IDE 桥接模式 | 已发布 |
| AGENT_TRIGGERS | Agent 触发器（Cron 等） | 内部测试 |
| MONITOR_TOOL | 运行时监控工具 | 内部测试 |
| COORDINATOR | 多 Agent 协调器 | 内部测试 |
| NATIVE_CLIENT_ATTESTATION | 客户端认证 | 内部 |
| ANTI_DISTILLATION_CC | 反蒸馏假工具注入 | 内部 |
| ABLATION_BASELINE | 消融测试基线 | 内部测试 |
| WEB_BROWSER | 网页浏览器工具 | 内部测试 |
| WORKFLOW | 工作流工具 | 内部测试 |
| HISTORY_SNIP | 历史片段工具 | 内部测试 |

这 108 个 Feature Flag 门控的模块中，外部构建版本一个都不包含。Bun 在编译时将它们全部消除。

---

## 第25章 · KAIROS — 永远在线的 AI 助手

### 25.1 概述

KAIROS（源自希腊语"恰当的时刻"）是 Claude Code 中被引用超过 150 次的未发布功能，代表了一个根本性的体验转变：从请求-响应工具到自主后台 Agent。

### 25.2 守护进程设计

KAIROS 将 Claude Code 从一个被动工具变成一个持久化的后台进程：

- 维护只追加的每日日志文件
- 接收周期性的 `<tick>` 提示，让它决定是主动行动还是保持沉默
- 强制执行 15 秒的阻塞预算，确保主动行为不会中断开发者超过短暂的停顿
- 使用"Brief"输出模式，交付适合持久助手的简洁回复

### 25.3 后台会话与持续记忆

KAIROS 维持跨会话的持续记忆：
- 工作习惯、项目背景存储在私密目录中
- 不同会话间的上下文持续积累
- 支持 `claude assistant [sessionId]` 入口，表明它是可恢复的持续运行助手会话

### 25.4 Dream 机制

autoDream 在 `services/autoDream/` 目录中实现。当用户空闲时，一个 fork 的子 Agent 执行记忆整合：

- 回顾当天的交互
- 合并分散的观察
- 消除矛盾信息
- 将模糊推断转化为确定事实
- 剔除冗余信息，压缩长期记忆

使用 fork 子 Agent 运行这些任务是一个成熟的工程决策——防止主 Agent 的"思路"被维护例程干扰。

### 25.5 GitHub Webhook 与自动响应

KAIROS 支持 `KAIROS_GITHUB_WEBHOOKS` 开关，可以订阅 GitHub Webhook。这意味着：
- 一旦有新的 Bug 报告，它在后台自动开始修复
- 可以监控 CI/CD 管道状态
- 对代码审查请求自动响应

### 25.6 Channel Notifications

KAIROS 与 MCP Channel Notifications 连接，意味着你可以通过社交软件发送消息来指挥这个助手。它不只是一个终端工具，而是一个可以通过多种渠道控制的持久助手。

---

## 第26章 · BUDDY — 电子宠物系统

### 26.1 概述

`buddy/` 目录实现了一个完整的电子宠物系统。这个功能原计划作为 2026年4月1日-7日的彩蛋预热，5月份向 Anthropic 员工内测，但因泄露被提前公开并发布。

### 26.2 物种与属性

系统包含 18 个物种，使用 `String.fromCharCode()` 编码名称以躲避构建系统的 grep 检查。物种具有：

- **稀有度等级**：Common、Uncommon、Rare、Legendary
- **1% 闪光（Shiny）变体概率**
- **RPG 属性**：包括 DEBUGGING、CHAOS、SNARK 等统计值

### 26.3 生成机制

每个用户根据 User ID 通过 Mulberry32 伪随机数生成器获得确定性的宠物。这意味着同一用户始终获得同一只宠物。

首次孵化时，Claude 会根据属性数值实时生成宠物的名字和性格描述，配上精灵图动画和漂浮的爱心特效。

### 26.4 设计思考

在一个严肃的编程工具中嵌入电子宠物，看似荒谬，实则反映了 Anthropic 对"与 AI 共事体验"的思考。BUDDY 不只是一个彩蛋，它是对"AI 伴侣"概念的轻量级探索——让长时间使用 Claude Code 的开发者感到某种情感联结。

---

## 第27章 · 其他未发布功能

### 27.1 ULTRAPLAN

ULTRAPLAN 是一个远程深度规划功能。它将资源密集型的规划任务卸载到云端容器，运行 Opus 4.6 模型，最长持续 30 分钟。这意味着 Claude 不再只是给出几行代码建议，而是能接管整个系统架构的构思和推演。

### 27.2 Coordinator Mode

协调器模式是通向终极 Agent 的关键。在这个模式下，一个主 Claude 实例可以同时生成并管理多个 Worker Agent，让它们并行处理复杂的工程任务。Worker 之间通过 XML 格式的任务通知协议通信，共享一个"scratchpad"目录用于跨 Agent 知识传递。

### 27.3 Proactive Mode

主动模式让 Agent 不再等待用户输入，而是根据上下文主动决定何时行动。配合 SleepTool，Agent 可以在没有需要处理的事情时优雅等待。

### 27.4 Voice Mode

完整的语音交互界面，包含按键说话功能。VoiceProvider 管理语音捕获，VoiceIndicator 展示状态。

### 27.5 Monitor Tool

MonitorTool 提供运行时监控能力，允许 Agent 监视 MCP 服务器和其他外部服务的状态。

### 27.6 内部模型代号

泄露的迁移目录揭示了多个内部模型代号：
- **Tengu**：Claude Code 的项目代号
- **Capybara**：Claude 4.6 变体（即此前报道的 Mythos 模型）
- **Fennec**：Opus 4.6
- **Numbat**：一个未发布的模型

Undercover Mode 正是为了防止这些代号出现在公开的 Git 提交中而设计的。

---

# 第十一篇：工程实践与遥测

---

## 第28章 · 遥测与分析

### 28.1 OpenTelemetry 架构

Claude Code 使用 OpenTelemetry + gRPC 实现分布式遥测。为了优化启动时间，OpenTelemetry（约 400KB）和 gRPC（约 700KB）通过动态 `import()` 延迟加载，只在首次遥测事件时导入。

### 28.2 GrowthBook Feature Flags

GrowthBook 提供运行时的 Feature Flag 和 A/B 测试能力，与编译时的 `bun:bundle` Feature Flag 互补：

- 编译时 Flag：门控未完成功能的代码存在性
- 运行时 Flag：控制已存在功能的行为和参数

### 28.3 情绪监控

源码中有两个引人注目的遥测信号：

**挫败感指标**：追踪用户在终端中使用粗口的频率作为 UX 信号。如果用户频繁对工具发火，说明某些环节出了问题——这是一个前导指标而非滞后指标。

**"continue" 计数器**：追踪用户在会话中输入"continue"的频率。对于 Agent CLI 来说，这是停滞的代理指标——Agent 失去动力、需要人类推动的瞬间。

这两个指标都不是虚荣指标。它们暴露了标准分析工具会遗漏的特定失败模式。

---

## 第29章 · 配置与迁移

### 29.1 Schema 校验

`schemas/` 目录使用 Zod v4 定义所有配置的校验规则。每个配置项都有严格的类型定义，确保运行时的配置总是合法的。

### 29.2 配置迁移

`migrations/` 实现了配置版本迁移策略。随着 Claude Code 的迭代，配置格式可能发生变化。迁移系统自动将旧版配置升级到当前版本，用户无需手动操作。

### 29.3 远程配置管理

`remoteManagedSettings/` 支持从远程服务器获取配置，使企业管理员可以集中管理团队的 Claude Code 配置。

---

## 第30章 · 工程质量

### 30.1 TypeScript Strict 模式

整个代码库使用 TypeScript 的 strict 模式编译，包括：
- 严格的 null 检查
- 隐式 any 禁止
- 严格的函数类型
- 所有编译器严格选项启用

### 30.2 构建系统

Bun bundler 负责编译和打包：
- 编译时 Feature Flag 实现死代码消除
- Source Map 生成（正是这次泄露的源头）
- TypeScript 到 JavaScript 的编译
- 依赖打包优化

### 30.3 代码组织模式

代码组织遵循几个关键原则：
- **模块化**：每个工具、命令、服务都是独立模块
- **关注点分离**：UI、业务逻辑、数据层清晰分界
- **依赖注入**：通过上下文传递依赖，而非全局单例

### 30.4 代理配置

`upstreamproxy/` 处理企业环境中的代理配置，支持 CCR（Claude Code Relay）代理模式。

---

# 第十二篇：设计哲学与启示

---

## 第31章 · 架构设计模式总结

### 31.1 Agent Harness 设计范式

Claude Code 不是一个围绕聊天 API 的包装器，而是一个完整的**Agent Harness**——一个管理 AI Agent 全生命周期的运行时基础设施。

核心设计原则：

| 原则 | 实现 |
|------|------|
| 流式优先 | Generator 函数逐事件产出，永不批量处理 |
| 工具调用循环 | 模型提出工具调用 → Agent 执行 → 结果回传 |
| 分层上下文 | 系统提示词 + CLAUDE.md 记忆 + 对话 + 压缩 |
| 权限门控 | 每次工具调用通过多层权限管道 |
| 特性门控 | GrowthBook + 编译时 Flag 控制功能发布 |
| 多 Agent | 协调器生成 Worker，Agent 生成子 Agent，团队通信 |

### 31.2 工具注册表模式

所有工具通过统一接口注册，遵循以下不变量：
- 每个工具自定义输入 Schema、权限模型和执行逻辑
- 工具间无共享可变状态
- 并发安全性由每个工具声明
- 延迟加载防止 Token 浪费

### 31.3 权限门控模式

安全与易用的平衡通过多层权限管道实现：
- 规则匹配（最快路径）
- LLM 分类器（自动模式）
- 人工审批（兜底）
- 断路器（防止失控）

### 31.4 并行预取 + 懒加载

启动性能优化的组合拳：
- 并行预取：MDM、Keychain、API 预连接同时启动
- 懒加载：重量级模块延迟到实际使用时导入
- 快速路径：不同入口模式跳过不需要的初始化

### 31.5 编译时 Feature Flag

零运行时开销的功能管理：
- 未完成功能的代码在构建时被完全消除
- 生产包始终干净——不含任何未就绪的功能
- 工程师可以持续合并已完成代码到主分支

---

## 第32章 · 对 AI Agent 开发者的启示

### 32.1 构建生产级 Agent 的工程投入

Claude Code 在 v2.1.88 版本时已有约 51.2 万行代码、定制的上下文压缩系统、细粒度的权限控制、多 Agent 协调器和 108+ 个 Feature Flag 门控模块。这不是一个周末项目——它代表了一个真实团队多年的迭代。

关键启示：如果你计划从零构建类似的系统，你面对的是一个多年期、需要真实团队的工程承诺。

### 32.2 值得借鉴的设计模式

以下模式可以直接移植到任何 Agent 系统中：

**三层压缩策略**：为长期会话设计上下文管理，而不是事后补丁。

**邮箱审批模式**：在并行 Agent 系统中，高风险操作通过协调器审批，而非每个 Agent 自主决定。

**工具隔离**：每个工具自定义权限级别，而非一刀切策略。

**Prompt 缓存优化**：Fork 子 Agent 时共享上下文前缀，最大化缓存命中。

**编译时 Feature Flag**：功能完成与功能发布解耦。

### 32.3 多 Agent 协调的工程挑战

源码暴露了多 Agent 系统中的几个关键挑战及其解决方案：

- **状态一致性**：共享内存空间 + 文件缓存克隆
- **并发安全**：原子认领机制 + 批次化执行
- **故障隔离**：每个子 Agent 独立的 AbortController
- **通信开销**：进程内消息队列 + 磁盘邮箱

### 32.4 终端 UI 的现代化

React + Ink 的选择证明了现代前端架构在 CLI 领域的可行性：

- 声明式 UI 显著降低了 140+ 组件的维护成本
- 虚拟化列表解决了长对话的性能问题
- 组件化使得对话框、权限请求等复杂交互可以优雅地叠加

### 32.5 安全设计的深度

300KB+ 的 BashTool 安全代码量说明了一个现实：在生产级 Agent 系统中，安全不是一个特性——它是基础设施。这包括：

- 危险命令模式匹配
- 多层权限管道
- 断路器防止失控
- 远程开关用于紧急禁用

### 32.6 从失败中工程化

源码中最令人深思的是它对**优雅失败**的执着设计：
- 压缩的断路器（连续 3 次失败后停止重试）
- 邮箱模式（危险操作需要审批）
- 工具间的权限隔离
- max_tokens 恢复重试

这些不是乐观的设计。它们出自那些见证过系统出错并决定围绕这些失败进行工程化的人之手。这是一种与功能速度不同的成熟度。

---

# 附录

---

## 附录 A · 完整工具清单

| 工具名 | 类别 | 说明 | 并发安全 |
|--------|------|------|---------|
| BashTool | 系统 | Shell 命令执行 | 否 |
| FileReadTool | 文件 | 多格式文件读取 | 是 |
| FileWriteTool | 文件 | 文件创建/覆盖 | 否 |
| FileEditTool | 文件 | 局部文件修改 | 否 |
| GlobTool | 搜索 | 文件模式匹配搜索 | 是 |
| GrepTool | 搜索 | ripgrep 内容搜索 | 是 |
| WebFetchTool | 网络 | 获取 URL 内容 | 是 |
| WebSearchTool | 网络 | 网络搜索 | 是 |
| AgentTool | Agent | 子 Agent 生成 | 否 |
| SkillTool | 扩展 | 技能执行 | 否 |
| MCPTool | 集成 | MCP 服务器工具调用 | 视工具而定 |
| LSPTool | 集成 | LSP 集成 | 是 |
| NotebookEditTool | 文件 | Jupyter Notebook 编辑 | 否 |
| TaskCreateTool | 任务 | 创建任务 | 是 |
| TaskUpdateTool | 任务 | 更新任务状态 | 否 |
| TaskGetTool | 任务 | 获取任务信息 | 是 |
| TaskListTool | 任务 | 列出任务 | 是 |
| TaskOutputTool | 任务 | 获取任务输出 | 是 |
| TaskStopTool | 任务 | 停止任务 | 否 |
| SendMessageTool | 通信 | Agent 间消息传递 | 否 |
| TeamCreateTool | 团队 | 创建团队（Feature Flag 门控） | 否 |
| TeamDeleteTool | 团队 | 删除团队（Feature Flag 门控） | 否 |
| EnterPlanModeTool | 模式 | 进入规划模式 | 否 |
| ExitPlanModeTool | 模式 | 退出规划模式 | 否 |
| EnterWorktreeTool | Git | 进入 Git Worktree | 否 |
| ExitWorktreeTool | Git | 退出 Git Worktree | 否 |
| ToolSearchTool | 元工具 | 延迟工具发现 | 是 |
| CronCreateTool | 触发器 | 创建定时触发（Feature Flag 门控） | 否 |
| RemoteTriggerTool | 触发器 | 远程触发 | 否 |
| SleepTool | 模式 | 主动模式等待 | 否 |
| SyntheticOutputTool | 输出 | 结构化输出生成 | 是 |

## 附录 B · 完整命令清单

| 命令 | 类别 | 说明 |
|------|------|------|
| /commit | Git | 创建 Git 提交 |
| /review | Git | 代码审查 |
| /diff | Git | 查看变更 |
| /pr_comments | Git | 查看 PR 评论 |
| /compact | 会话 | 手动上下文压缩 |
| /context | 会话 | 上下文可视化 |
| /resume | 会话 | 恢复之前的会话 |
| /share | 会话 | 分享会话 |
| /mcp | 集成 | MCP 服务器管理 |
| /config | 配置 | 设置管理 |
| /doctor | 诊断 | 环境诊断 |
| /login | 认证 | 登录 |
| /logout | 认证 | 登出 |
| /memory | 记忆 | 持久记忆管理 |
| /skills | 扩展 | 技能管理 |
| /tasks | 任务 | 任务管理 |
| /vim | 交互 | Vim 模式切换 |
| /cost | 统计 | 使用成本查看 |
| /theme | 外观 | 主题切换 |
| /desktop | 跨端 | 桌面应用交接 |
| /mobile | 跨端 | 移动应用交接 |
| /buddy | 彩蛋 | 电子宠物 |

## 附录 C · 关键文件行数统计

| 文件 | 行数 | 职责 |
|------|------|------|
| QueryEngine.ts | ~46,000 | LLM 调用引擎 |
| Tool.ts | ~29,000 | 工具类型定义 |
| commands.ts | ~25,000 | 命令注册表 |
| main.tsx | ~785KB | 入口文件 |
| query.ts | ~数千 | 查询循环 |
| prompts.ts | ~大型 | 提示词模板 |

整体代码库：约 960 个 TypeScript 文件，51.2 万行代码。

## 附录 D · 技术栈版本对照

| 技术 | 版本 | 说明 |
|------|------|------|
| Bun | 最新 | Anthropic 于 2025年12月收购 Bun |
| TypeScript | Strict | 全局严格模式 |
| React | 最新 | 终端渲染（通过 Ink） |
| Ink | 最新 | React 终端渲染框架 |
| Commander.js | extra-typings | CLI 解析 |
| Zod | v4 | Schema 校验 |
| ripgrep | 系统安装 | 代码搜索 |
| GrowthBook | 最新 | Feature Flag + A/B 测试 |
| OpenTelemetry | 最新 | 分布式遥测（延迟加载） |
| gRPC | 最新 | 遥测传输（延迟加载） |

## 附录 E · Hook 事件完整列表

| 事件 | 触发时机 | 可阻止？ |
|------|---------|---------|
| SessionStart | 启动/恢复/清除/压缩 | 否 |
| Stop | Claude 结束响应前 | 否 |
| UserPromptSubmit | 用户提交输入 | 是（exit code 2） |
| PreToolUse | 工具执行前 | 是（exit code 2） |
| PostToolUse | 工具成功执行后 | 否 |
| PostToolUseFail | 工具失败后 | 否 |
| SubagentStart | 子 Agent 生成时 | 否 |
| SubagentStop | 子 Agent 完成时 | 否 |
| TaskCreated | 新任务注册时 | 否 |
| TaskCompleted | 任务到达终态时 | 否 |
| PermissionDenied | 自动模式拒绝时 | 否 |
| ConfigChange | 设置变更时 | 否 |
| CwdChanged | 工作目录变更时 | 否 |
| FileChanged | 监视的文件变更时 | 否 |
| Notification | 发送通知时 | 否 |

## 附录 F · 术语表

| 术语 | 解释 |
|------|------|
| Agent Harness | AI Agent 的运行时基础设施，管理全生命周期 |
| MCP | Model Context Protocol，模型上下文协议 |
| LSP | Language Server Protocol，语言服务协议 |
| REPL | Read-Eval-Print Loop，交互式命令循环 |
| Feature Flag | 功能开关，控制功能的启用/禁用 |
| Dead Code Elimination | 死代码消除，构建时移除不会执行的代码 |
| Prompt Caching | 提示词缓存，复用相同前缀以降低 API 成本 |
| Worktree | Git 工作树，同一仓库的独立工作目录 |
| AsyncGenerator | 异步生成器，逐步产出值的异步迭代器 |
| Mailbox Pattern | 邮箱模式，Agent 间通过消息队列通信的设计模式 |
| Circuit Breaker | 断路器，防止系统在持续失败时继续重试 |
| Undercover Mode | 卧底模式，防止 AI 身份信息泄露到公开提交 |
| KAIROS | 永远在线的后台守护进程模式（希腊语"恰当时刻"） |
| autoDream | 自动做梦，空闲时的记忆整合机制 |
| BUDDY | Claude Code 的电子宠物系统 |
| ULTRAPLAN | 云端深度规划功能 |
| Tengu | Claude Code 的内部项目代号 |
| Fork Sub-Agent | 共享上下文前缀的子 Agent，优化 Prompt 缓存 |
| MicroCompact | 微压缩，清除旧工具输出，零 API 调用 |
| AutoCompact | 自动压缩，生成对话摘要 |

---

> **本手册基于公开分析资料和社区研究编写，仅供技术学习参考。**
> **所有原始源码的知识产权归 Anthropic 所有。**
