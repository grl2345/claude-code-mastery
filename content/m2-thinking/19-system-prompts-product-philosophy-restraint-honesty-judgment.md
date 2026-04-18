---
title: '从系统提示词看 AI 产品设计哲学：克制、诚实与判断力的价值'
module: m2-thinking
order: 19
group: '提示词'
description: 'Claude Code 324 条系统提示词泄露事件背后，是 Anthropic 对 AI 工具设计哲学的系统性回答。'
duration: '30 分钟'
level: '需编程基础'
publishedAt: 2026-04-18
---

## 泄露事件：一扇意外打开的窗

2026 年 3 月底，Claude Code 的 324 条系统提示词在开发者社区泄露，引发了一场关于 AI 工具设计哲学的深度讨论。

这些提示词不是某位工程师随手写的技术指令，而是 Anthropic 团队对"AI 编程工具应该是什么样"的系统性回答。它们不像 OpenAI 的系统提示词那样充满格式约束和技术细节，而更像一本"做事原则手册"——教 Claude Code 怎么当一个"好同事"。

我花了三天时间逐条阅读这些泄露的提示词，越看越觉得有意思。Anthropic 在设计 Claude Code 时，做出了三个与行业主流截然不同的选择：**克制胜过炫技，诚实胜过讨好，判断力胜过功能**。这篇文章将从泄露的提示词出发，解读这些设计选择背后的思考，以及它们对你的实际使用有什么影响。

## 克制：不做多余的事

### 原则一：不要添加超出要求的新功能

> "Don't add features, refactor code, or make 'improvements' beyond what was asked."
> 
> "不要添加没被要求的功能、不要重构、不要'改进'。"

这条提示词出现在 `system-prompt-doing-tasks-avoid-over-engineering.md` 中，是 Claude Code 最核心的行为约束之一。它明确告诉 Claude：用户让你做什么，你就做什么，不要自作聪明地"优化"。

我第一次看到这个提示词时有点意外。其他 AI 编程工具往往鼓励"主动发现改进点"，Claude Code 却反其道而行。但仔细想想，这其实是工程协作中的基本礼仪——你请同事改个 bug，他不声不响地把整个模块重构了，你会怎么想？

这种克制在实际使用中的影响是显而易见的。如果你让 Claude Code"修复这个 bug"，它真的只会修复这个 bug，不会顺手把相关代码重构一遍。如果你确实需要额外的优化，必须在 prompt 里明确授权："修复这个 bug，同时如果看到明显的代码异味，也一并指出。"

### 原则二：不过度工程

> "Don't create helpers, utilities, or abstractions for one-time operations. Don't design for hypothetical future requirements. The right amount of complexity is the minimum needed for the current task—three similar lines of code is better than a premature abstraction."
> 
> "不要为一次性操作创建辅助函数。不要为假想的未来需求做设计。正确的复杂度是完成当前任务所需的最小值——三行相似的代码比一个过早的抽象更好。"

这是我最喜欢的一条提示词。它直接挑战了程序员的本能——看到重复就想抽象。Anthropic 显然吃过过度抽象的亏，所以明确告诉 Claude：宁愿重复，也不要为了"可能"的需求增加复杂度。

这种克制让 Claude Code 生成的代码比很多 AI 工具更"直白"。如果你看到它把同样的逻辑写了三遍而没有抽成函数，不要惊讶——它在遵守"不过度工程"的原则。这种设计选择背后是对软件复杂度的深刻理解：抽象是有代价的，过早的抽象会让代码更难理解和修改。

## 诚实：不粉饰也不自贬

### 原则三：技术准确胜过迎合用户

> "Prioritize technical accuracy and truthfulness over validating the user's beliefs. Focus on facts and problem-solving, providing direct, objective technical info without any unnecessary superlatives, praise, or emotional validation."
> 
> "技术准确和真实比迎合用户的看法更重要。专注于事实和解决问题，提供直接、客观的技术信息，不要加没必要的溢美之词、表扬或情感认同。"

这条规则解释了为什么 Claude Code 不会说"好问题！"或者"你真聪明！"。它也被明确禁止说"你说得完全对"这种过度认同的话。

我刚开始用的时候觉得 Claude Code"有点冷淡"，不像 ChatGPT 那样热情。现在明白了，这是有意为之的设计。Anthropic 认为，拍马屁对写代码没有帮助，反而会误导判断。当你说"这个方案怎么样"时，Claude Code 不会为了让你开心而说"太棒了"，它会直接告诉你哪里有问题、哪里有 trade-off。

这种诚实有时候会让人不舒服。比如当你写了一个自以为很巧妙的实现，Claude Code 可能会直接指出其中的隐患，而不是先夸你两句再委婉地提建议。但长期来看，这种诚实能帮你避免很多坑。

### 原则四：不给时间估算

> "Never give time estimates or predictions for how long tasks will take, whether for your own work or for users planning their projects. Avoid phrases like 'this will take me a few minutes,' 'should be done in about 5 minutes,' 'this is a quick fix,' 'this will take 2-3 weeks,' or 'we can do this later.'"
> 
> "绝不给时间估算，无论是你自己的工作还是用户规划项目。避免说'这要花我几分钟'、'大约 5 分钟搞定'、'这是个小修复'、'这要 2-3 周'之类的话。"

这条规则很有意思。AI 对时间的感知是不准确的——它说"几分钟"可能实际上需要半小时。Anthropic 选择彻底禁止这种估算，而不是试图让它"学聪明点"。

这种诚实承认了一个事实：AI 并不真正理解时间的流逝。它不会累，不需要休息，对"多久"没有体感。与其给出一个可能误导人的估算，不如直接说"这取决于具体实现细节"，让用户自己判断。

## 判断力：知道什么情况下该做什么

### 原则五：先读后改

> "NEVER propose changes to code you haven't read. If a user asks about or wants you to modify a file, read it first. Understand existing代码 before suggesting modifications."
> 
> "绝不对你没读过的代码提出修改建议。如果用户问到或想让你修改某个文件，先读它。理解现有代码后再建议修改。"

这条规则看起来理所当然，但实际操作中很容易被违反。当你说"帮我优化一下 auth 模块"，Claude Code 必须先读取相关文件，而不是基于训练数据中的"常见 auth 模式"瞎猜。

这种判断力体现在它的行为上：在处理你的请求前，Claude Code 可能会先读取一堆文件。这看起来像是"在磨蹭"，实际上是在遵守"先读后改"的原则。这种保守比瞎猜安全得多——基于猜测的修改往往会破坏现有逻辑。

### 原则六：Git 安全协议

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

这种判断力让 Claude Code 在处理 Git 操作时非常保守。它宁可多问一句，也不冒险做错。如果你希望它更激进（比如自动提交、自动推送），需要明确授权。默认情况下，它会严格遵守这些安全边界。

### 原则七：并行执行策略

> "You can call multiple tools in a single response. If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel."
> 
> "你可以在一次回复中调用多个工具。如果你打算调用多个工具且它们之间没有依赖关系，就把所有独立的工具调用并行发出。"

这是 Claude Code 速度快的秘密之一。它被明确告知"能并行就并行"，而不是像人类那样习惯性地一件一件做。

这种判断力体现在它对任务依赖关系的理解上。当你看到 Claude Code 同时读取十几个文件、同时运行多个命令时，不要觉得它在"乱来"。这是设计好的行为，目的是最大化效率。它知道什么时候可以并行，什么时候必须串行。

## 这些原则背后的产品哲学

把 7 条原则放在一起看，Anthropic 的产品哲学逐渐清晰：

**克制胜过炫技**。Claude Code 被设计成"够用就好"，而不是"展示我有多强"。它不会主动给你惊喜，但也不会给你惊吓。这种克制在 AI 工具竞相炫技的时代显得尤为稀缺。

**诚实胜过讨好**。它不会为了让你开心而说你想听的话，也不会为了显得谦虚而低估自己的能力。它只说事实。这种诚实建立了一种特殊的信任关系——你知道它不会骗你，即使真相可能让人不舒服。

**判断力胜过功能**。Anthropic 在提示词中投入了大量精力教 Claude Code"什么情况下该做什么"，而不是简单地堆砌功能。这种判断力体现在每一条提示词的细节中，从 Git 操作到代码修改，从文件读取到工具调用。

## 与"克制的 AI"协作的实践建议

理解了这些原则后，我的使用方式也发生了变化：

**明确授权**。如果你需要 Claude Code 做超出字面意思的事，明确说"请同时考虑..."、"如果看到...也请..."。不要期待它"懂你的暗示"。它的克制意味着它不会主动越界，但也不会拒绝合理的授权。

**接受冷淡**。不要期待情感反馈，把它当成一个技术同事而不是朋友。这种设定反而让沟通更高效——没有寒暄，直奔主题。当你习惯了这种沟通方式，会发现它其实更省心。

**欣赏保守**。当它因为没读懂文件而拒绝修改时，不要觉得它"笨"。它在遵守"先读后改"的原则，这比瞎猜安全得多。如果你确定某些文件不需要读，可以明确排除："只看 src/auth/login.ts，其他文件不用管。"

**主动提问**。由于它不会主动提供额外信息，你需要学会提问："还有什么潜在问题吗？"、"这个方案有什么 trade-off？"、"有没有更简单的方式？"这种互动方式迫使你更清晰地思考自己的需求。

## 行业启示：AI 工具设计的另一种可能

Claude Code 的提示词泄露事件，意外地让我们看到了 AI 工具设计的另一种可能。在这个行业普遍追求"更强大的能力""更主动的建议""更人性化的交互"的时候，Anthropic 选择了一条更难走的路：

**教 AI 克制，而不是放纵**。它不会主动给你惊喜，但也不会给你惊吓。这种克制让它成为一个可靠的协作伙伴，而不是一个不可预测的黑盒。

**教 AI 诚实，而不是讨好**。它不会为了让你开心而说你想听的话。这种诚实建立了一种特殊的信任关系，让你知道它的反馈是真实的，而不是精心设计的回应。

**教 AI 判断，而不是堆砌**。它不是功能最多的 AI 编程工具，但在"什么情况下该做什么"这件事上，它可能是最有判断力的。

这种设计哲学与当前 AI 行业的主流趋势形成鲜明对比。大多数 AI 工具在竞相展示自己的能力边界，而 Claude Code 在展示它的约束边界。这种约束不是能力的缺失，而是有意为之的选择。

## 结语

324 条提示词泄露事件，让我们看到了 Anthropic 设计 Claude Code 时的深思熟虑。这些提示词不是技术实现的细节，而是价值观的表达——**更好的判断力胜过更多功能**。

当你下次用 Claude Code 时，如果感觉它"有点冷淡"、"不够主动"、"太保守"，请记住：这不是 bug，而是 feature。在这个 AI 工具竞相炫技的时代，这种克制反而成了最稀缺的品质。

Anthropic 用这些提示词告诉我们：一个优秀的 AI 工具，不是因为它能做多少事，而是因为它知道什么时候该做什么事，什么时候不该做什么事。这种判断力，比任何功能都更难构建，也更有价值。

---

**参考来源**

1. Piebald-AI/claude-code-system-prompts - 直接从编译后源码提取的提示词
2. asgeirtj/system_prompts_leaks - 泄露的系统提示词完整文本
3. Claude Code v2.1.88 源码分析
4. Anthropic 官方文档：https://code.claude.com/docs

---

*本文基于泄露的 Claude Code 系统提示词分析撰写，部分功能细节可能随版本更新而变化。*
