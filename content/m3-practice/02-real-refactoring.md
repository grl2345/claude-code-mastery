---
title: "一次真实的重构：把 400 行的 God Component 拆干净"
module: m3-practice
order: 2
group: "项目搭建"
description: "一个 React 项目里的巨型组件重构实录——拆分策略、Claude Code 的表现、以及差点翻车的依赖问题。"
duration: "25 分钟"
level: "需编程基础"
publishedAt: 2026-03-08
---

## 问题

接手了一个内部的管理后台项目。React + TypeScript，前任开发者走得急，留下了一个 `DashboardPage.tsx`——**427 行，包含 6 个功能区块，混着数据获取、状态管理和 UI 渲染，全部塞在一个文件里。**

这种文件大家都见过。没人想碰它，但每次改需求都绕不过去。我决定趁一个相对空闲的下午，用 Claude Code 把它拆了。

完整过程花了 **3 个小时**，拆成了 **9 个文件**。中间有一次差点把线上功能搞挂，具体怎么回事后面会讲。

## 第一步：让 Claude Code 做现状分析

开工之前我没有急着拆。先让 Claude Code 帮我梳理这个文件的结构：

```bash
$ claude "分析 src/pages/DashboardPage.tsx：
   1. 列出所有的 state 变量和它们的作用
   2. 列出所有的 useEffect 和它们的依赖关系
   3. 识别可以独立拆分的功能区块
   不要动代码，只做分析"
```

Claude Code 很快给出了分析结果。核心发现：

- **11 个 useState**，其中 4 个互相关联（筛选条件和数据列表）
- **5 个 useEffect**，有 2 个存在隐式依赖（effect A 修改的 state 是 effect B 的依赖）
- **6 个功能区块**：顶部统计卡片、筛选栏、数据表格、分页、侧边详情面板、操作弹窗

这个分析基本准确。但它漏了一个关键信息：其中两个 useEffect 之间存在**竞态条件**——当用户快速切换筛选条件时，旧的请求可能覆盖新的请求结果。这个问题在原始代码里就存在，只是没人发现过。Claude Code 做静态分析的时候也没识别出来。

**经验**：Claude Code 的代码分析对于结构梳理很靠谱，但涉及到运行时行为（竞态、并发、时序）的问题，它经常识别不到。这类问题还是得靠你自己的经验判断。

## 第二步：确定拆分策略

基于分析结果，我规划了拆分方案。这个方案是我自己定的，没有让 Claude Code 来决定，原因在[架构决策那篇](/m2/11-architecture)里讲过——拆分策略属于"影响大、难回退"的决策，必须自己拿主意。

最终方案：

```
DashboardPage.tsx (427行)
├── components/
│   ├── StatsCards.tsx        -- 统计卡片（纯展示）
│   ├── FilterBar.tsx         -- 筛选栏（含本地状态）
│   ├── DataTable.tsx         -- 数据表格（纯展示）
│   ├── Pagination.tsx        -- 分页（已有全局组件，复用）
│   ├── DetailPanel.tsx       -- 侧边详情面板
│   └── ActionModal.tsx       -- 操作弹窗
├── hooks/
│   └── useDashboardData.ts   -- 数据获取 + 筛选逻辑
└── DashboardPage.tsx         -- 组合层（约 60 行）
```

## 第三步：从最简单的开始拆

按照[小步快跑](/m2/07-small-steps)的原则，我从最简单、依赖最少的组件开始。

### 对话 1：拆 StatsCards

```bash
$ claude "从 DashboardPage.tsx 中提取统计卡片区块：
   - 新建 components/StatsCards.tsx
   - props 接收 stats 数据对象
   - 保持现有的 UI 和样式不变
   - 更新 DashboardPage.tsx 的导入
   确保两个文件都能通过 TypeScript 编译"
```

一次成功。StatsCards 是纯展示组件，没有内部状态，拆起来最简单。

### 对话 2：拆 FilterBar

筛选栏稍微复杂一些——它有自己的本地状态（下拉菜单的展开/收起），同时需要把筛选条件回调给父组件。

Claude Code 的第一版把筛选条件的 state 留在了 FilterBar 内部，通过 onChange 回调通知父组件。这样做功能是对的，但我发现一个问题：当用户从 URL 参数恢复筛选条件时（比如刷新页面），FilterBar 的内部状态和父组件的状态会不同步。

我指出了这个问题，让它改成受控组件模式——筛选条件由父组件持有，FilterBar 只负责渲染和触发回调。第二轮改对了。

### 对话 3-5：拆 DataTable、DetailPanel、ActionModal

这三个组件的拆分比较顺利，各用了一次对话。DataTable 是纯展示，DetailPanel 有一个展开/收起的本地状态，ActionModal 有表单验证逻辑。

拆 ActionModal 的时候有个小插曲：原代码里的表单验证用了一种很粗暴的方式——在 submit 的时候同步校验所有字段，然后用一个字符串数组收集错误信息。Claude Code 在提取的时候"顺手"把它重构成了用 `react-hook-form` 的方案。

我拒绝了这个改动。**重构的时候不应该同时引入新的依赖。** 先保持现有逻辑不变地提取出来，后面如果要升级表单方案，那是另一个独立的任务。Claude Code 有时候会忍不住"优化"，这正是[它的提示词里反复强调"克制"](/m2/13-claude-code-system-prompts)的原因。

## 第四步：提取自定义 Hook——差点翻车

这是整个重构里最关键也最危险的一步。

Dashboard 的数据获取逻辑涉及：
- 根据筛选条件请求列表数据
- 分页参数管理
- 加载状态和错误状态
- 列表数据缓存（切换筛选条件再切回来时不重新请求）

```bash
$ claude "从 DashboardPage.tsx 提取数据获取逻辑到 hooks/useDashboardData.ts：
   - 接收筛选条件和分页参数
   - 返回 { data, loading, error, refetch }
   - 保留现有的缓存逻辑
   - 不要改变任何业务逻辑，只做提取"
```

Claude Code 的产出看起来很干净。我快速审查了一遍，TypeScript 编译通过，就 commit 了。

然后我在本地跑了一下——**列表数据加载正常，但分页坏了。** 点"下一页"没反应。

排查了 15 分钟才发现问题：原代码里 `setPage` 和 `fetchData` 之间有一个微妙的时序依赖。原来的写法是在 `setPage` 的回调里调用 `fetchData`，但 Claude Code 在提取 hook 的时候，把它改成了用 `useEffect` 监听 `page` 变化来触发请求。

问题在于：这个 `useEffect` 的依赖数组里还包含了 `filters` 对象。在 React 中，如果 `filters` 是一个每次渲染都新建的对象（引用不稳定），`useEffect` 就会在每次渲染时都触发，导致无限请求循环。原代码没有这个问题，因为它不依赖 `useEffect`。

**修复过程**：

```bash
$ claude "useDashboardData 里的分页有 bug：
   useEffect 的依赖数组包含 filters 对象，
   但 filters 每次渲染都是新引用，导致无限触发。
   改回原来的方案：不用 useEffect 监听 page，
   而是在 setPage 的调用处直接触发 fetchData。
   同时用 useCallback 稳定 fetchData 的引用。"
```

这次修复成功了。但这个经验非常重要——**Claude Code 在提取 Hook 的时候，经常会改变副作用的触发方式，而这种改变可能引入 bug。** 特别是涉及到 useEffect 依赖数组的时候，一定要仔细核对。

## 第五步：整合和验证

最后一步是把 DashboardPage.tsx 变成纯组合层：

```bash
$ claude "现在所有子组件和 hook 都提取完了。
   清理 DashboardPage.tsx，只保留：
   - 导入所有子组件和 hook
   - 调用 useDashboardData
   - 组合渲染所有子组件
   - 传递 props
   目标是这个文件不超过 80 行"
```

最终 DashboardPage.tsx 从 427 行降到了 63 行。

## 重构结果

| 指标 | 重构前 | 重构后 |
|------|-------|-------|
| 主文件行数 | 427 | 63 |
| 文件数 | 1 | 9 |
| 最大单文件 | 427 行 | 87 行 |
| useState 数量 | 11（同一作用域） | 分散到 3 个组件和 1 个 hook |
| useEffect 数量 | 5（互相纠缠） | 2（独立） |
| TypeScript 编译 | 通过 | 通过 |
| 现有测试 | 通过 | 通过 |

总耗时约 3 小时，其中：
- 分析和规划：30 分钟
- 组件提取（6 个对话）：90 分钟
- 排查分页 bug：25 分钟
- 最终整合和验证：25 分钟

## 复盘

**Claude Code 做得好的地方**：结构分析、纯展示组件提取、TypeScript 类型推导。这些任务模式清晰、规则明确，它处理得很高效。

**Claude Code 容易出问题的地方**：涉及副作用时序的逻辑提取。它倾向于用 useEffect 来"统一管理"副作用，但这种重构可能改变原有的执行顺序。另外，它"顺手优化"的冲动需要你主动遏制。

**最关键的一课**：重构的时候，**保持行为不变**是第一原则。不要同时做提取和优化。先拆干净，确认行为完全一致，再考虑优化。这两件事混在一起做，出了 bug 你都不知道是拆的问题还是优化的问题。
