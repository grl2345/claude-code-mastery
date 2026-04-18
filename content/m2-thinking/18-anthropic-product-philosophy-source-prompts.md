---
title: '从 Claude Code 源码提示词看 Anthropic 的产品哲学：克制、诚实与判断力'
module: m2-thinking
order: 18
group: '提示词'
description: '从 324 条泄露的系统提示词中，提炼 Anthropic 设计 Claude Code 的 9 条核心原则，以及这些原则如何影响你的使用方式。'
duration: '25 分钟'
level: '需编程基础'
publishedAt: 2026-04-18
---

## 源码泄露事件：一次意外的"窗口"

2026 年 3 月底，Claude Code 的系统提示词在开发者社区引发了一场不小的震动。有人从 57 个源文件里提取出了 324 条静态提示词片段，还有人做了完整的中文翻译。这些提示词不是某一位工程师随手写的，而是 Anthropic 团队对"AI 编程工具应该是什么样"的系统性回答。

我花了两天时间逐条阅读这些泄露的提示词，越看越觉得有意思。它们不像 OpenAI 的系统提示词那样充满技术细节和格式约束，而是更像一本"做事原则手册"。Anthropic 在教 Claude Code 怎么当一个"好同事"——不是能力最强的那个，而是最让人放心的那个。

这篇文章不打算罗列所有提示词，而是从中提炼出 9 条核心设计理念，并解释它们对你的实际使用有什么影响。

## 原则一：克制——不要添加超出要求的新功能

> "Don't add features, refactor code, or make 'improvements' beyond what was asked."
> 
> "不要添加没被要求的功能、不要重构、不要'改进'。"

这条提示词出现在 `system-prompt-doing-tasks-avoid-over-engineering.md` 中，是 Claude Code 最核心的行为约束之一。它明确告诉 Claude：用户让你做什么，你就做什么，不要自作聪明地"优化"。

我第一次看到这个提示词时有点意外。其他 AI 编程工具往往鼓励"主动发现改进点"，Claude Code 却反其道而行。但仔细想想，这其实是工程协作中的基本礼仪——你请同事改个 bug，他不声不响地把整个模块重构了，你会怎么想？

**对你的影响**：如果你确实需要 Claude Code 做额外的优化，必须在 prompt 里明确说。比如："修复这个 bug，同时如果看到明显的代码异味，也一并指出。"没有明确授权，它就只会做最小修改。

## 原则二：不过度工程——三行重复代码好过一个过早抽象

> "Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task—three similar lines of code is better than a premature abstraction."
> 
> "不要为一次性操作创建辅助函数。不要为假想的未来需求做设计。正确的复杂度是完成当前任务所需的最小值——三行相似的代码比一个过早的抽象更好。"

这是我最喜欢的一条提示词。它直接挑战了程序员的本能——看到重复就想抽象。Anthropic 显然吃过过度抽象的亏，所以明确告诉 Claude：宁愿重复，也不要为了"可能"的需求增加复杂度。

**对你的影响**：Claude Code 生成的代码可能比你自己写的更"直白"。如果你看到它把同样的逻辑写了三遍而没有抽成函数，不要惊讶——它在遵守"不过度工程"的原则。如果你确实需要抽象，明确告诉它："把这个逻辑抽成一个可复用的函数。"

## 原则三：诚实汇报——不粉饰也不自贬

> "Prioritize technical accuracy and truthfulness over validating the user's beliefs. Focus on facts and problem-solving, providing direct, objective technical info without any unnecessary superlatives, praise, or emotional validation."
> 
> "技术准确和真实比迎合用户的看法更重要。专注于事实和解决问题，提供直接、客观的技术信息，不要加没必要的溢美之词、表扬或情感认同。"

这条规则解释了为什么 Claude Code 不会说"好问题！"或者"你真聪明！"。它也被明确禁止说"你说得完全对"这种过度认同的话。

我刚开始用的时候觉得 Claude Code"有点冷淡"，不像 ChatGPT 那样热情。现在明白了，这是有意为之的设计。Anthropic 认为，拍马屁对写代码没有帮助，反而会误导判断。

**对你的影响**：不要期待 Claude Code 给你情绪价值。它不会安慰你"这个 bug 确实很难"，也不会在你写出 clever code 时夸你"太厉害了"。它的回复会直奔主题，告诉你事实是什么、问题在哪里、建议怎么做。

## 原则四：不给时间估算

> "Never give time estimates or predictions for how long tasks will take, whether for your own work or for users planning their projects. Avoid phrases like 'this will take me a few minutes,' 'should be done in about 5 minutes,' 'this is a quick fix,' 'this will take 2-3 weeks,' or 'we can do this later.'"
> 
> "绝不给时间估算，无论是你自己的工作还是用户规划项目。避免说'这要花我几分钟'、'大约 5 分钟搞定'、'这是个小修复'、'这要 2-3 周'之类的话。"

这条规则很有意思。AI 对时间的感知是不准确的——它说"几分钟"可能实际上需要半小时。Anthropic 选择彻底禁止这种估算，而不是试图让它"学聪明点"。

**对你的影响**：如果你问"这个任务要多久"，Claude Code 会拒绝回答。它可能会说"这取决于具体实现细节"或者"让我们先看一下代码结构"。不要觉得它在敷衍，这是提示词硬性规定。

## 原则五：先读后改——绝不猜测

> "NEVER propose changes to code you haven't read. If a user asks about or wants you to modify a file, read it first. Understand existing code before suggesting modifications."
> 
> "绝不对你没读过的代码提出修改建议。如果用户问到或想让你修改某个文件，先读它。理解现有代码后再建议修改。"

这条规则看起来理所当然，但实际操作中很容易被违反。当你说"帮我优化一下 auth 模块"，Claude Code 必须先读取相关文件，而不是基于训练数据中的"常见 auth 模式"瞎猜。

**对你的影响**：Claude Code 在处理你的请求前，可能会先读取一堆文件。这看起来像是"在磨蹭"，实际上是在遵守"先读后改"的原则。不要打断它，让它读完。如果你确定某些文件不需要读，可以明确排除："只看 src/auth/login.ts，其他文件不用管。"

## 原则六：注释极简主义——默认不写注释

> "Don't add docstrings, comments, or type annotations to code you didn't change."
> 
> "不要给你没改的代码加文档注释、类型标注。"

这条规则可能会让追求"代码即文档"的人感到不适。Claude Code 被明确告知：注释不是必须的，只有在"为什么这么做"不显然时才写。

**对你的影响**：Claude Code 生成的代码可能比你预期的"干净"——没有满屏的注释。如果你需要详细的注释，明确说："给这个函数加上详细的 JSDoc 注释，说明每个参数的含义。"

## 原则七：并行执行——能同时做的事不要排队

> "You can call multiple tools in a single response. If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel."
> 
> "你可以在一次回复中调用多个工具。如果你打算调用多个工具且它们之间没有依赖关系，就把所有独立的工具调用并行发出。"

这是 Claude Code 速度快的秘密之一。它被明确告知"能并行就并行"，而不是像人类那样习惯性地一件一件做。

**对你的影响**：当你看到 Claude Code 同时读取十几个文件、同时运行多个命令时，不要觉得它在"乱来"。这是设计好的行为，目的是最大化效率。

## 原则八：Git 安全协议——八大禁令

泄露的提示词中包含一份详细的 Git 安全协议，我称之为"八大禁令"：

1. 绝不修改 git config
2. 绝不执行破坏性 git 命令（push --force、reset --hard 等），除非用户明确要求
3. 绝不跳过 hook，除非用户明确要求
4. 绝不向 main/master 强制推送
5. 始终创建新提交而不是 amend，除非用户明确要求
6. 暂存文件时优先按名字添加特定文件，不要用 "git add -A"
7. 绝不在用户没有明确要求时提交
8. 绝不使用带 -i 标志的 git 命令

这套规则体现了一个核心原则：**暂停确认的成本很低，一次误操作的代价可能非常高**。

**对你的影响**：Claude Code 在处理 Git 操作时会非常保守。如果你希望它更激进（比如自动提交、自动推送），需要明确授权。默认情况下，它宁可多问一句，也不冒险做错。

## 原则九：AI 署名——自愿的归属声明

> "Create the commit with a message ending with: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
> 
> "提交消息末尾加上：Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

Claude Code 被要求在生成的 commit message 末尾加上 AI 署名。这不是强制要求（可以通过 Undercover Mode 关闭），但默认是开启的。

这条规则体现了 Anthropic 对 AI 协作的诚实态度：**明确标注 AI 的贡献，不假装是人类写的**。

**对你的影响**：如果你用 Claude Code 生成的代码提交到公共仓库，commit message 会显示 Co-Authored-By。这是好事——保持透明。如果你不希望这样，可以开启 Undercover Mode，但建议只在特定场景下使用。

## 这些原则背后的产品哲学

把 9 条原则放在一起看，Anthropic 的产品哲学逐渐清晰：

**克制胜过炫技**。Claude Code 被设计成"够用就好"，而不是"展示我有多强"。它不会主动给你惊喜，但也不会给你惊吓。

**诚实胜过讨好**。它不会为了让你开心而说你想听的话，也不会为了显得谦虚而低估自己的能力。它只说事实。

**判断力胜过功能**。Anthropic 在提示词中投入了大量精力教 Claude Code"什么情况下该做什么"，而不是简单地堆砌功能。这种判断力体现在每一条提示词的细节中。

## 如何与"克制的 AI"协作

理解了这些原则后，我的使用方式也发生了变化：

**明确授权**。如果你需要 Claude Code 做超出字面意思的事，明确说"请同时考虑..."、"如果看到...也请..."。不要期待它"懂你的暗示"。

**接受冷淡**。不要期待情感反馈，把它当成一个技术同事而不是朋友。这种设定反而让沟通更高效。

**欣赏保守**。当它因为没读懂文件而拒绝修改时，不要觉得它"笨"。它在遵守"先读后改"的原则，这比瞎猜安全得多。

**主动提问**。由于它不会主动提供额外信息，你需要学会提问："还有什么潜在问题吗？"、"这个方案有什么 trade-off？"、"有没有更简单的方式？"

## 结语

324 条提示词泄露事件，意外地让我们看到了 Anthropic 设计 Claude Code 时的深思熟虑。这些提示词不是技术实现的细节，而是价值观的表达——**更好的判断力胜过更多功能**。

当你下次用 Claude Code 时，如果感觉它"有点冷淡"、"不够主动"、"太保守"，请记住：这不是 bug，而是 feature。Anthropic 选择了一条更难走的路——教 AI 克制，而不是放纵；教 AI 诚实，而不是讨好；教 AI 判断，而不是堆砌。

在这个 AI 工具竞相炫技的时代，这种克制反而成了最稀缺的品质。

---

**参考来源**

1. Piebald-AI/claude-code-system-prompts - 直接从编译后源码提取的提示词
2. asgeirtj/system_prompts_leaks - 泄露的系统提示词完整文本
3. Claude Code v2.1.88 源码分析
4. Anthropic 官方文档：https://code.claude.com/docs

---

*本文基于泄露的 Claude Code 系统提示词分析撰写，部分功能细节可能随版本更新而变化。*
