---
title: "第一课：搜索意图判断（Search Intent）"
module: m7-seo
order: 1
group: "找词 · 挖需求"
description: "AI 工具站 SEO 的第一道关卡：判断一个词值不值得做，取决于背后的「搜索意图」而非搜索量。"
duration: "15 分钟"
level: "零基础可读"
publishedAt: 2026-04-20
hot: true
---

> AI 工具站 SEO 学习笔记 · 第一课
> 学习日期：2026-04-20

## 本课核心观点

**"找词"不是在找一个字符串，而是在挖需求。**

大多数新手的错误思路是"找一个搜索量大、难度低的词就行"，但这套思路早就失效了——如果真这么简单，Semrush 筛一下就出一堆金矿，人人都能做站赚钱。

真相是：**同一个词，不同的人搜，动机完全不同。这些不同的动机叫"搜索意图"（Search Intent）**。意图决定了用户想要什么、你该给他什么页面、你能不能赚到他的钱。

**意图没对上，再好的 SEO 都白搭。**

## 一、四种搜索意图

![四种搜索意图：只做 T 和 C](/seo-intent-four-types.svg)

| 意图 | 英文 | 用户心理 | 典型词 | 做 AI 工具站？ |
|---|---|---|---|---|
| 信息型 | Informational (I) | 想学知识、想看教程 | how to, what is, why, tutorial | ❌ 不做 |
| 导航型 | Navigational (N) | 直奔某个品牌/网站 | chatgpt login, midjourney pricing | ❌ 不做 |
| 商业调查型 | Commercial (C) | 比较方案、看评测后再决定 | best, top, vs, review, alternative | ✅ 做评测页 |
| 交易型 | Transactional (T) | 现在就要用 | free, online, tool, generator, maker | ✅✅ 主战场 |

### 为什么只做 T 和 C？

- **T（交易型）**：用户已经有明确需求，你给他一个工具页，他点进来就用 → 转化链路最短
- **C（商业调查型）**：用户在几个方案中犹豫，你写一篇"Top 10"评测，把自己的工具推进去 → 典型的"蹭流量"打法
- **I（信息型）**：来学知识的人不会用你的工具，流量再大也不值钱
- **N（导航型）**：用户心里已经有答案，跟你无关

## 二、判断意图的三招

### 第一招：看词本身的"信号词"（优先级最高）

一些信号词几乎是**意图的铁证**，只要出现就能直接判断：

```
【Informational 信号词】
how to / what is / why / tutorial / guide / learn / explained

【Commercial 信号词】
best / top / vs / review / alternative / comparison

【Transactional 信号词】
free / online / tool / generator / maker / remover /
editor / converter / download / create

【Navigational 信号词】
品牌名（chatgpt, midjourney, canva 等）
品牌名 + login / pricing / signup
```

### 第二招：看 SERP 前 10 的页面类型

打开 Google（无痕 + 美国地区），搜这个词，看前 10 名：

| 前 10 名主要是... | 意图判断 |
|---|---|
| 工具网站 | T ✅ |
| "10 Best XX" 榜单、评测文章 | C ✅ |
| 教程博客、WikiHow、YouTube 教程 | I ❌ |
| 某个品牌官网、登录页 | N ❌ |

### 第三招：Semrush 的 Intent 标签

Semrush 付费工具会直接标注 I / N / C / T，但我们新手阶段用前两招就够了。

## 三、意图判断的优先级规则（重要！）

![意图判断的优先级流程](/seo-intent-decision-flow.svg)

当你拿到一个词，按这个顺序判断：

```
【优先级 1】看词里有没有"意图杀手"信号词

出现以下词，直接无条件判定：
- "how to / what is / why" → I
- "best / top / vs / alternative" → C
- "free / online / download" → T

【优先级 2】看有没有品牌名

- 只有品牌名（如 "chatgpt"） → N
- 品牌名 + login / pricing → N
- 品牌名 + alternative / vs → C（蹭流量型，这是金矿）

【优先级 3】以上都没有，看 SERP 前 10 的页面类型
```

## 四、我犯过的错误与正确答案

### ❌ 错题 1：`best ai headshot generator` 判断为 T

**正确答案：C（Commercial）**

**错误原因：**
只看 SERP 前几名是"工具页"，就直接判断 T。忽略了"best"这个信号词。

**关键认知：**
> "best / top / review / vs / alternative" 这些词一出现，意图就从 T 变成 C 了，**不管 SERP 前几名长什么样**。

**为什么这个错误致命？**

| 意图 | 用户想要什么 | 应该做什么页面 |
|---|---|---|
| T | 直接用工具 | 一个干净的工具页，进来就能用 |
| C | 看评测、做对比 | 一篇"Top 10 XX Tools"文章，把自己工具放在第 3 名 |

如果看到 `best ai headshot generator` 就去做一个工具页，结果会是：

- 用户来了发现没对比、没评测，直接跳出
- Google 看到页面和搜索意图不匹配，排名上不去
- 就算流量进来也不转化

**正确做法：**
对于"best XX"这种 C 意图的词，写评测文章，在文章里把自己的工具推荐进去（一般放在第 3 名或第 5 名，放第 1 太假）。

### ❌ 错题 2：`how to remove background from image` 判断为 T

**正确答案：I（Informational，带少量 T）**

**错误原因：**
看到"remove background from image"就联想到抠图工具，以为用户是来用工具的。

**关键认知：**
> **"how to" 是 Informational 意图的铁证**，不管后面跟的是什么事情。用户搜"how to"说明他当下想学的是**方法**，不是找工具。

**对比两个词：**

```
A. ai background remover free online  → T（要工具）
B. how to remove background from image → I（学方法）
```

说的是同一件事，但用户心理状态完全不同：

- A 的心理："我要一个工具，现在就用"
- B 的心理："我想知道怎么做这件事"

**实际 SERP 验证：**

搜 `how to remove background from image`，你会发现前 10 名是：

- 教程博客（"How to Remove Background - Step by Step"）
- Adobe / Canva 的教程页
- WikiHow 文章
- YouTube 教程视频
- **即使是工具站排在前面的，也是他们的"博客文章"页，不是工具页**

这说明工具站也明白：搜"how to"的人是来学东西的，不是来用工具的。

**新概念：混合意图**

`how to` 类词严格说是 **I 为主 + T 为辅** 的混合意图：

- 主意图 I：用户想学方法
- 副意图 T：一部分人看完教程觉得麻烦，会转到工具

**这种词新手不要碰**，原因：

1. 要和海量教程博客竞争 I 的排名，太难
2. 就算排上去，转化率也低（大部分人来学习）
3. Google 算法会把这种词优先给教程内容

**专注做纯 T 词**，比如 `ai background remover free online`，一步到位。

## 五、一个彩蛋金矿：`alternative` 词

![alternative 词的金矿效应](/seo-alternative-goldmine.svg)

### 答对但可能没想透：`chatgpt alternative` → C

按信号词规则，有品牌名应该倾向 N，但答案是 C。为什么？

**因为 "alternative" 彻底改变了意图：**

```
"chatgpt"             → N（去官网）
"chatgpt login"       → N（登录）
"chatgpt pricing"     → N（看价格）
"chatgpt alternative" → C（不想用 chatgpt 了，找替代品）
```

### 为什么 "alternative" 词是金矿？

- 用户**对现有方案不满意**，主动寻找新方案
- 付费意愿和转化意愿都非常高
- **可以蹭大品牌的流量**

### 标准打法

如果你做了一个 AI 聊天工具，可以做一个页面叫：

- "Best ChatGPT Alternatives in 2026"
- "10 Free Alternatives to ChatGPT"

借 ChatGPT 的搜索量，把用户导到你自己的工具。这是 AI 工具站非常经典的获客打法。

## 六、全部 8 道练习题汇总

| # | 关键词 | 意图 | 判断依据 |
|---|---|---|---|
| 1 | ai tattoo generator | T | generator 信号词 + SERP 前 10 是工具站 |
| 2 | how does stable diffusion work | I | "how does"铁证 |
| 3 | midjourney pricing | N | 品牌名 + pricing |
| 4 | best ai headshot generator | **C** ⚠️ | "best"铁证，不看 SERP |
| 5 | ai background remover free online | T | free + online + remover，满分 T 词 |
| 6 | midjourney vs dall-e | C | "vs"铁证，两个品牌在比较 |
| 7 | how to remove background from image | **I** ⚠️ | "how to"铁证，不看主题 |
| 8 | chatgpt alternative | C | "alternative"让品牌词变成 C |
| 9 | pokemon champions release date | I | "release date"是查信息 |

## 七、本课记忆要点

### 必须记住的 3 件事

1. **找词 = 挖需求**，不是找字符串
2. **只做 T 和 C 两种意图**，别碰 I 和 N
3. **信号词优先级高于 SERP**——"how to / best / vs" 这些词出现直接定性，不用看 SERP

### 最容易犯的 3 个错

1. 看到工具站在 SERP 前列就判断 T → 忽略了"best"这种 C 信号词
2. 看到主题和工具相关就判断 T → 忽略了"how to"这种 I 信号词
3. 看到品牌名就判断 N → 忽略了"alternative / vs"让它变成 C

### 判断意图的"黄金口诀"

```
词里有 how to → 铁定 I
词里有 best / top / vs / alternative → 铁定 C
词里有 free / online / generator / maker → 铁定 T
啥信号词都没有 → 看 SERP 前 10

意图错了，全盘皆输。
```

## 八、下一步预告

第一课学会了**判断意图**——这决定了这个词"值不值得做"。

第二课我们要学**看 SERP 竞争格局**——这决定了这个词"我能不能做"。

即使意图对了，如果 SERP 前 10 都是 5 年老站，新手一样打不动。第二课教你：

- 怎么把 SERP 前 10 分成四类（大站 / 老工具站 / niche 小站 / 内容站）
- 怎么查竞品域名年龄（决定它"看起来小"是不是真的小）
- 怎么识别 SERP 顶部的"截流元素"（AI Overview 等）

学完第二课，你就能看着一个词，准确判断"我这个新站能不能挤进前 10"。

---

*第一课笔记完*
