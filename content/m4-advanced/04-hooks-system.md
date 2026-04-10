---
title: "Hooks 系统：让 Claude Code 自动遵守你的规矩"
module: m4-advanced
order: 4
group: "自动化"
description: "用 Hooks 在工具调用前后自动执行自定义逻辑——格式化、lint、测试、安全检查，一次配置永久生效。"
duration: "18 分钟"
level: "需编程基础"
publishedAt: 2026-03-31
updatedAt: 2026-04-08
---

## Hooks 解决什么问题

用 Claude Code 写代码有一个常见的烦恼：它每次创建或修改文件后，你都得手动跑一遍格式化、lint 检查、类型检查。忘了跑，代码风格就乱了；每次都手动提醒它"记得跑 prettier"，又觉得重复。

Hooks 就是解决这个问题的。它让你定义一些规则："每当 Claude Code 执行某个操作时，自动运行我指定的命令。"

比如：
- 每次写文件后，自动跑 `prettier --write`
- 每次执行 Bash 命令前，检查是不是危险操作
- 每次对话结束时，自动跑一遍测试

这些规则配置一次，后续所有对话自动生效。不需要每次都在 prompt 里叮嘱。

## 配置方式

Hooks 配置在 `.claude/settings.json` 中（项目级）或 `~/.claude/settings.json`（全局级）：

```json
{
  "hooks": {
    "afterWrite": [
      {
        "matcher": "\\.(ts|tsx|js|jsx)$",
        "command": "npx prettier --write \"$CLAUDE_FILE_PATH\""
      }
    ],
    "afterEdit": [
      {
        "matcher": "\\.(ts|tsx|js|jsx)$",
        "command": "npx prettier --write \"$CLAUDE_FILE_PATH\""
      }
    ]
  }
}
```

这段配置的意思是：每当 Claude Code 写入或编辑一个 `.ts/.tsx/.js/.jsx` 文件后，自动运行 Prettier 格式化。

### Hook 类型一览

| Hook | 触发时机 | 常用场景 |
|------|----------|----------|
| `afterWrite` | 创建新文件后 | 格式化、添加文件头 |
| `afterEdit` | 编辑文件后 | 格式化、lint |
| `beforeBash` | 执行 Bash 命令前 | 安全检查、命令拦截 |
| `afterBash` | 执行 Bash 命令后 | 日志记录 |
| `afterSessionStart` | 对话开始时 | 环境初始化 |

### 可用的环境变量

Hook 命令中可以使用以下变量：

- `$CLAUDE_FILE_PATH` — 被操作的文件路径（Write/Edit Hook）
- `$CLAUDE_BASH_COMMAND` — 即将执行的命令（beforeBash Hook）
- `$CLAUDE_SESSION_ID` — 当前会话 ID

## 实战配置：我的项目 Hooks

下面是我在一个 TypeScript 全栈项目中实际使用的配置：

```json
{
  "hooks": {
    "afterWrite": [
      {
        "matcher": "\\.(ts|tsx|js|jsx)$",
        "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" && npx eslint --fix \"$CLAUDE_FILE_PATH\""
      },
      {
        "matcher": "\\.css$",
        "command": "npx prettier --write \"$CLAUDE_FILE_PATH\""
      }
    ],
    "afterEdit": [
      {
        "matcher": "\\.(ts|tsx|js|jsx)$",
        "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" && npx eslint --fix \"$CLAUDE_FILE_PATH\""
      }
    ],
    "beforeBash": [
      {
        "command": "echo \"$CLAUDE_BASH_COMMAND\" | grep -qE '(rm\\s+-rf\\s+/|drop\\s+database|DROP\\s+TABLE)' && echo 'BLOCKED: 危险命令被拦截' && exit 1 || true"
      }
    ]
  }
}
```

这套配置做了三件事：

1. **自动格式化 + lint 修复**：JS/TS 文件写入后自动跑 Prettier 和 ESLint。这意味着 Claude Code 生成的代码会自动适配项目的代码风格，不需要你手动调整。

2. **CSS 文件格式化**：样式文件单独处理，只跑 Prettier。

3. **危险命令拦截**：在执行任何 Bash 命令前，检查是否包含 `rm -rf /`、`drop database`、`DROP TABLE` 等危险操作。如果匹配，命令会被阻止。

## 我踩过的坑

### 坑 1：Hook 命令执行太慢

一开始我把 `tsc --noEmit` 也放到了 afterEdit Hook 里，想让每次编辑后都做类型检查。结果每次 Claude Code 改一个文件就要等 5-8 秒做全量类型检查，严重影响交互效率。

**解决方案**：把耗时操作从 Hook 中移出。类型检查这种事情，在一轮修改结束后手动跑一次就够了。Hook 里只放快速操作（Prettier 通常 200ms 内完成）。

### 坑 2：matcher 正则写错导致所有文件都匹配

我一开始写的是 `"matcher": ".ts"` （没有转义点号），结果 `.json`、`.txt` 这些文件也被匹配了，因为 `.` 在正则里匹配任意字符。

**解决方案**：记得转义，用 `"\\.ts$"` 而不是 `".ts"`。

### 坑 3：Hook 失败阻塞了 Claude Code

如果 Hook 命令返回非零退出码，Claude Code 会将这次操作视为失败。有一次 ESLint 报了一个无法自动修复的 warning，Hook 返回了退出码 1，Claude Code 就一直重试修改文件，陷入循环。

**解决方案**：对于非关键检查，在命令末尾加 `|| true`，确保不会因为 warning 阻塞流程：

```json
{
  "command": "npx eslint --fix \"$CLAUDE_FILE_PATH\" || true"
}
```

只有你确实想"硬性阻止"的操作（比如危险命令拦截）才让它返回非零退出码。

## 进阶：用脚本替代单行命令

当 Hook 逻辑变复杂时，单行命令会变得难以维护。更好的做法是写一个独立脚本：

```json
{
  "hooks": {
    "afterWrite": [
      {
        "matcher": "\\.(ts|tsx)$",
        "command": "bash .claude/hooks/after-write.sh \"$CLAUDE_FILE_PATH\""
      }
    ]
  }
}
```

```bash
#!/bin/bash
# .claude/hooks/after-write.sh
FILE="$1"

# 1. 格式化
npx prettier --write "$FILE" 2>/dev/null

# 2. Lint 修复
npx eslint --fix "$FILE" 2>/dev/null

# 3. 如果是组件文件，检查是否有对应的测试文件
if [[ "$FILE" == *"components/"* ]]; then
  TEST_FILE="${FILE%.tsx}.test.tsx"
  if [ ! -f "$TEST_FILE" ]; then
    echo "提醒：组件 $FILE 缺少测试文件 $TEST_FILE"
  fi
fi

exit 0  # 始终返回成功，不阻塞 Claude Code
```

这个脚本除了格式化和 lint，还会在你创建新组件时提醒你补测试文件。这种"软提醒"很实用——不阻塞流程，但帮你记住容易遗漏的事情。

## 什么该放 Hooks，什么不该

| 适合 Hooks | 不适合 Hooks |
|-----------|------------|
| 代码格式化（< 1s） | 全量类型检查（> 5s） |
| 单文件 lint 修复 | 全量测试（> 10s） |
| 危险命令拦截 | 构建 / 编译 |
| 文件头注入（license） | 需要用户交互的操作 |
| 快速安全扫描 | 网络请求（不稳定） |

原则很简单：**Hook 应该快、可靠、无副作用**。如果一个操作超过 2 秒或者可能失败，不要放到 Hook 里。

## 与 CLAUDE.md 的配合

Hooks 和 CLAUDE.md 是互补关系：

- **CLAUDE.md** 告诉 Claude Code "你应该做什么"（软性指导）
- **Hooks** 确保"不管 Claude Code 做了什么，结果一定符合规范"（硬性保障）

比如你在 CLAUDE.md 里写"所有代码必须通过 Prettier 格式化"，Claude Code 会尽量遵守。但 AI 有时候会忘记或做不到。加上 afterWrite Hook 后，即使 Claude Code 输出了未格式化的代码，Hook 也会自动修正。

两者配合使用，效果最好。
