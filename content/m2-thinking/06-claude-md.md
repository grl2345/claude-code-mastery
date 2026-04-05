---
title: "CLAUDE.md：你的项目说明书"
module: m2-thinking
order: 6
group: "上下文工程"
description: "如何写好 CLAUDE.md，让每次对话自动获得项目上下文。"
duration: "12 分钟"
level: "需编程基础"
publishedAt: 2026-03-25
---

## 为什么说它是秘密武器

前面几课我们一直在聊怎么手动管理上下文，但有一个东西能让你省掉大量重复劳动：CLAUDE.md。

它的机制很简单——放在项目根目录下的 CLAUDE.md 文件，Claude Code 每次启动时会自动读取。你可以把它理解成项目的「入职手册」。新同事入职你会给他一份文档，介绍项目背景、技术栈、代码规范、常用命令。CLAUDE.md 就是 Claude Code 的那份入职手册，而且它比人类同事好的地方在于——它真的会认真读完并严格遵守。

我在几个项目里用上 CLAUDE.md 之后，最直观的感受是：不再需要每次开对话都重复一遍「我们用的是 TypeScript + Prisma，错误处理用 AppError 类，API 响应格式是...」这些信息。写一次，永久生效。

## 应该往里面写什么

一份好的 CLAUDE.md 不需要长篇大论，但需要覆盖几个关键信息。

项目概览用一两句话说清楚这个项目是干什么的，让 Claude 有一个基本的心智模型。技术栈要写具体，最好带上版本号——Node.js 20 和 Node.js 16 的最佳实践是不一样的。代码规范是最能提升协作效率的部分，把你团队的核心约定写进去，Claude 就不会生成风格不一致的代码。再加上目录结构说明和常用命令，基本就够了。

下面是一个实际的例子：

```markdown
# TaskFlow — 团队任务管理工具

## 技术栈
- Node.js 20 + Express 4 + TypeScript 5.3
- PostgreSQL 16 + Prisma 5
- React 18 + Vite 5 + TailwindCSS
- 测试：Vitest

## 代码规范
- 函数式风格优先
- 错误统一使用 AppError 类
- API 响应格式：{ data, error, meta }
- 使用 zod 做参数校验

## 目录约定
- src/modules/[module]/ → routes.ts, service.ts, types.ts
- 新模块请参考 src/modules/tasks/

## 常用命令
- npm run dev → 启动开发服务器
- npm test → 运行测试
```

注意一个容易踩的坑：CLAUDE.md 本身也会消耗上下文空间。我建议控制在 500 字以内，超过 1000 字就该考虑精简了。写得太长反而会挤占正式对话的上下文预算，得不偿失。只写 Claude 真正需要知道的信息，那些「知道了也没什么用」的内容就别放了。

## 进阶：分级配置

随着项目变大，你可能会发现一份 CLAUDE.md 不太够用。比如支付模块有一些很具体的规范（所有金额使用整数表示，单位是分，不使用浮点数），放在根目录的 CLAUDE.md 里会显得臃肿，而且其他模块的对话也不需要这些信息。

解决办法是在子目录放各自的 CLAUDE.md。当 Claude Code 在某个子目录下工作时，它会同时读取根目录和当前子目录的 CLAUDE.md，相当于继承加覆盖。根目录放全局规范，子目录放模块特有的约定，各管各的。

最后一点：CLAUDE.md 是活文档，不是写完就扔在那里的。当你发现 Claude 在某个问题上反复犯错——比如总是用 `try/catch` 而不是你们约定的 AppError，或者总是忘记给 API 加参数校验——就把正确做法加到 CLAUDE.md 里。下次对话自动生效，同样的错误不会再出现第三次。
