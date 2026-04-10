---
title: "Headless 模式：让 Claude Code 在后台替你干活"
module: m4-advanced
order: 1
group: "自动化"
description: "用 --print 和管道把 Claude Code 嵌入脚本和工作流，实现代码审查自动化、批量文件处理和 Git Hook 集成。"
duration: "20 分钟"
level: "需编程基础"
publishedAt: 2026-03-15
updatedAt: 2026-04-05
---

## 什么是 Headless 模式

到目前为止，我们讲的都是"交互式"用法——你打开终端，和 Claude Code 一问一答地对话。但 Claude Code 还有另一种用法：**不需要你坐在电脑前，它自己在后台跑。**

这就是 Headless 模式。核心是两个参数：

- `--print`（简写 `-p`）：不进入交互对话，执行完直接输出结果到 stdout
- 管道 `|`：把其他命令的输出喂给 Claude Code 处理

这两个东西组合起来，Claude Code 就从一个"对话工具"变成了一个"可编程的代码处理引擎"。你可以把它塞进 shell 脚本、Git Hook、CI 流水线，甚至 cron 定时任务里。

我自己用得最多的场景有三个：自动化代码审查、批量文件处理、Git 工作流集成。下面逐个说。

## 场景一：自动化代码审查

这是我每天都在用的功能。每次 commit 之前，让 Claude Code 自动审查变更：

```bash
$ git diff --staged | claude -p "审查这段代码变更：
   1. 有没有明显的 bug 或逻辑错误
   2. 有没有安全隐患（SQL注入、XSS、硬编码密码）
   3. 有没有遗漏的边界情况
   只报告问题，没有问题就说'未发现问题'。不要重复代码内容。"
```

这条命令做了什么：`git diff --staged` 输出你暂存的变更，通过管道传给 Claude Code，Claude Code 审查后直接打印结果。整个过程不需要你交互，几秒钟就完成。

### 进阶：封装成 Shell 函数

每次手打这么长的命令不现实。我在 `.zshrc` 里加了一个函数：

```bash
# ~/.zshrc
review() {
  local diff=$(git diff --staged)
  if [ -z "$diff" ]; then
    echo "没有暂存的变更"
    return 1
  fi
  echo "$diff" | claude -p "审查这段代码变更，重点检查：
    1. 逻辑错误和边界遗漏
    2. 安全隐患
    3. 和项目现有风格不一致的地方
    简洁报告，没问题就说'LGTM'。"
}
```

现在只要在 commit 之前打一个 `review` 就行了。

用了一个多月，这个函数帮我拦截过几次真实的问题：一次是忘了给新加的 API 路由加鉴权中间件，一次是 TypeScript 类型断言写错了方向（`as string` 写成了 `as number`）。这种低成本的额外检查，长期累积下来价值很大。

当然它也有局限——和[思维篇代码审查那篇](/m2/08-code-review)讲的一样，它发现不了业务逻辑层面的问题。但语法错误、类型问题、安全疏漏这类"机械性"检查，它做得比人可靠。

### 更进一步：Git Pre-commit Hook

如果你想强制每次 commit 都审查，可以写成 Git Hook：

```bash
#!/bin/sh
# .git/hooks/pre-commit

DIFF=$(git diff --staged)
if [ -z "$DIFF" ]; then
  exit 0
fi

RESULT=$(echo "$DIFF" | claude -p "审查代码变更，只报告严重问题（bug、安全漏洞）。
如果没有严重问题，只输出 OK。" 2>/dev/null)

if echo "$RESULT" | grep -qi "OK"; then
  exit 0
fi

echo "====== Claude Code 审查发现问题 ======"
echo "$RESULT"
echo "======================================="
echo ""
echo "如果确认无误，使用 git commit --no-verify 跳过检查"
exit 1
```

这个 Hook 会在每次 commit 时自动运行。如果 Claude Code 发现严重问题，commit 会被拦截，并显示问题描述。

**一个重要的注意事项**：`--no-verify` 是跳过 Hook 的逃生门，一定要保留。有些时候你明确知道代码没问题（比如只改了注释或文档），不需要等 AI 审查。另外，Claude Code 有时候会误报，你需要一个覆盖机制。

## 场景二：批量文件处理

Headless 模式的另一个强项是批量处理。比如你要给项目里所有的 TypeScript 函数加上 JSDoc 注释：

```bash
$ find src/utils -name "*.ts" | while read f; do
    echo "处理: $f"
    claude -p "给这个文件里的所有导出函数加上 JSDoc 注释。
    只加注释，不改动任何代码逻辑。
    输出完整的修改后文件内容。" < "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  done
```

这个脚本遍历 `src/utils` 下所有 TypeScript 文件，逐个让 Claude Code 添加 JSDoc，然后覆盖原文件。

**但我不建议直接这样跑。** 原因有三个：

1. **没有审查环节**。AI 可能会改动代码逻辑，不只是加注释。
2. **没有回退点**。如果某个文件处理出错，你很难恢复。
3. **成本不可控**。每个文件都是一次 API 调用，文件多了费用会上去。

我实际用的版本是这样的：

```bash
$ git stash  # 先保存当前工作

$ find src/utils -name "*.ts" | while read f; do
    claude -p "给导出函数加 JSDoc 注释，不改代码。输出完整文件。" < "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  done

$ git diff  # 审查所有变更
# 不满意的部分手动 git checkout -- 恢复
$ git add -p  # 逐块选择要保留的变更
```

关键改进是：先 stash、处理完后用 `git diff` 审查所有变更、用 `git add -p` 逐块选择。这样你对每一处改动都有控制权。

### 实际案例：批量迁移 API 调用

有一次项目要把 HTTP 客户端从 axios 换成 fetch。涉及 23 个文件，手动改至少半天。我用 Headless 模式批量处理：

```bash
$ grep -rl "import axios" src/ | while read f; do
    claude -p "把这个文件里的 axios 调用改成 fetch API。
    保持错误处理逻辑不变。
    保持返回值类型不变。
    输出完整的修改后文件。" < "$f" > "$f.tmp"
    mv "$f.tmp" "$f"
  done
```

23 个文件大约跑了 8 分钟。然后我花了 40 分钟审查所有变更。其中 19 个文件改动正确，4 个文件有小问题需要手动修正（主要是 axios 的 interceptor 逻辑没有完美对应到 fetch 的中间件模式）。

总耗时约 50 分钟，如果纯手动改估计要 4-5 小时。效率提升很明显，但审查环节不能省。

## 场景三：Commit Message 生成

这是最简单也最实用的 Headless 用法：

```bash
$ git diff --staged | claude -p "根据这段代码变更生成一条 commit message。
   格式：类型(范围): 简要描述
   类型从 feat/fix/refactor/docs/test/chore 中选择。
   用中文写描述。只输出一行。"
```

封装成函数：

```bash
# ~/.zshrc
cm() {
  local msg=$(git diff --staged | claude -p "根据变更生成 commit message。
    格式：类型(范围): 中文描述。只输出一行。")
  echo "建议的 commit message："
  echo "  $msg"
  echo ""
  read "confirm?使用这条消息？(y/n) "
  if [[ "$confirm" == "y" ]]; then
    git commit -m "$msg"
  fi
}
```

注意：我特意加了确认步骤，不会自动 commit。因为 AI 生成的 message 有时候抓不准重点——比如你改了一个 bug 顺便重命名了一个变量，它可能把 message 写成"重命名变量"而不是"修复 XX bug"。人工确认一下只要 2 秒，但能避免产生误导性的 commit 历史。

## 场景四：日志分析

生产环境报错时，可以把日志直接喂给 Claude Code 分析：

```bash
$ tail -100 /var/log/app/error.log | claude -p "分析这些错误日志：
   1. 有几种不同类型的错误
   2. 哪种最频繁
   3. 是否有关联性（比如同一个请求链路上的连锁错误）
   4. 建议排查方向"
```

这在半夜被报警叫醒的时候特别有用。你脑子还没清醒，先让 Claude Code 帮你做初步分类，比自己盯着满屏日志找规律快得多。

但需要注意**数据安全**：日志里可能包含用户数据、token、密码等敏感信息。在把日志喂给 Claude Code 之前，最好先过滤掉敏感字段：

```bash
$ tail -100 /var/log/app/error.log \
  | sed 's/token=[^ ]*/token=***/g' \
  | sed 's/password=[^ ]*/password=***/g' \
  | claude -p "分析错误日志..."
```

## 使用 Headless 模式的注意事项

### 成本意识

每次 `claude -p` 调用都会消耗 API 额度。交互式对话里你可能每天用几十轮，但批量脚本一跑可能就是几百次调用。在写批量处理脚本之前，先用 2-3 个文件测试效果和成本，确认可行再全量跑。

### 输出稳定性

Headless 模式的输出不像交互模式那样有上下文积累。每次调用都是独立的，Claude Code 不知道上一次调用的结果。所以如果你的任务有前后依赖（比如"先分析结构，再基于分析结果做修改"），不能拆成两次 Headless 调用，而应该在一次调用里把所有信息都给够。

### 错误处理

Headless 模式下如果 Claude Code 处理失败（比如输入太大、网络超时），它可能输出错误信息而不是预期结果。批量脚本里一定要加错误检查：

```bash
result=$(echo "$input" | claude -p "..." 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$result" ]; then
  echo "处理失败: $f" >> errors.log
  continue
fi
```

## 我现在的 Headless 工作流

总结一下我日常在用的几个自动化：

1. **`review`**：commit 前自动审查暂存变更（每天 3-5 次）
2. **`cm`**：自动生成 commit message + 人工确认（每天 5-8 次）
3. **Pre-commit Hook**：拦截明显的安全问题（被动运行）
4. **批量处理脚本**：按需使用，比如迁移 API、补注释、格式统一（每月 1-2 次）

这些自动化累计起来，每天大约省 20-30 分钟。不算多，但它省掉的是最枯燥的部分——审查样板代码、想 commit message、排查明显错误。把这些交给 AI，你可以把注意力留给真正需要思考的工作。
