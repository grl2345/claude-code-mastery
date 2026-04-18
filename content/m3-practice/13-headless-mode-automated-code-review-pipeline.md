---
title: 'Headless 模式实战：搭建本地自动化代码审查流水线'
module: m3-practice
order: 13
group: '自动化实战'
description: '从零开始用 Claude Code Headless 模式搭建完整的本地代码审查流水线，包括 Git Hook 集成、Shell 函数封装和团队级配置方案。'
duration: '25 分钟'
level: '需编程基础'
publishedAt: 2026-04-18
---

## 为什么需要本地自动化代码审查

每次提交代码前，你是否经历过这些场景：

- 提交后才想起忘了检查边界情况
- Code Review 时被同事指出明显的逻辑错误
- 上线后发现一个本可以在本地发现的低级 bug
- 团队代码风格不一致，每次 Review 都要花大量时间讨论格式问题

传统解决方案是依赖 CI/CD 流程中的自动化检查，但问题在于：**问题发现得越晚，修复成本越高**。如果在本地提交前就能拦截 80% 的常见问题，Code Review 就可以聚焦于业务逻辑和架构设计，而不是语法错误和拼写问题。

Claude Code 的 Headless 模式（`--print` 参数）让这一切成为可能。你可以把它嵌入到 Git Hook、Shell 函数、甚至编辑器插件中，在提交代码前自动进行多维度审查。

这篇文章会带你从零开始，搭建一套完整的本地自动化代码审查流水线。

## 第一环节：基础审查脚本

### 1.1 最简单的审查命令

先从最基础的用法开始。在任意 Git 仓库中运行：

```bash
git diff --staged | claude -p "审查这段代码变更，检查：
1. 明显的逻辑错误
2. 安全隐患（SQL注入、XSS、硬编码密码）
3. 边界情况处理
4. 代码可读性问题

如果没有问题，只输出'LGTM'。
如果有问题，简洁列出，不要重复代码内容。"
```

这条命令做了什么：
- `git diff --staged` 获取暂存区的变更
- 通过管道传给 Claude Code
- `-p`（即 `--print`）让 Claude Code 直接输出结果，不进入交互模式
- 几秒钟后得到审查结果

### 1.2 封装成可复用的 Shell 函数

每次都打这么长的命令不现实。把下面这段代码添加到 `~/.zshrc` 或 `~/.bashrc`：

```bash
# ~/.zshrc

# Claude Code 代码审查函数
ccreview() {
    # 检查是否在 Git 仓库中
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo "错误：当前目录不是 Git 仓库"
        return 1
    fi

    # 获取暂存区的变更
    local diff=$(git diff --staged)
    
    if [ -z "$diff" ]; then
        echo "没有暂存的变更，请先 git add"
        return 1
    fi

    echo "正在运行 Claude Code 代码审查..."
    echo ""
    
    # 运行审查
    echo "$diff" | claude -p "你是一位经验丰富的代码审查员。请审查以下代码变更：

审查维度：
1. 逻辑正确性：是否有明显的逻辑错误或遗漏
2. 安全性：是否存在 SQL 注入、XSS、硬编码密钥、不安全的数据处理
3. 健壮性：边界情况、错误处理、空值检查
4. 可读性：命名是否清晰、函数是否过长、是否有不必要的复杂度
5. 一致性：是否符合常见代码规范

输出格式：
- 如果没有问题，只输出：✓ 审查通过
- 如果有问题，按严重程度分组（严重/警告/建议），每条问题包含：问题描述、位置（文件:行号）、修复建议
- 保持简洁，不要输出代码片段"
}

# 快速审查模式（只检查严重问题）
ccreview-quick() {
    local diff=$(git diff --staged)
    
    if [ -z "$diff" ]; then
        echo "没有暂存的变更"
        return 1
    fi

    echo "$diff" | claude -p "快速审查这段代码变更，只关注：
1. 明显的 bug
2. 安全问题
3. 可能导致崩溃的边界情况

如果没有严重问题，只输出'OK'。
如果有问题，简洁列出。"
}
```

添加后运行 `source ~/.zshrc` 使配置生效。现在你只需要在仓库中输入 `ccreview` 就能启动审查。

### 1.3 实际使用效果示例

假设你修改了一个用户认证的函数：

```typescript
// 你的变更
function loginUser(username: string, password: string) {
    const user = db.query(`SELECT * FROM users WHERE username = '${username}'`);
    if (user.password === password) {
        return user;
    }
    return null;
}
```

Claude Code 的审查输出可能是：

```
严重问题：
1. SQL 注入风险（auth.ts:2）
   - 问题：直接拼接用户输入到 SQL 查询
   - 建议：使用参数化查询或 ORM

2. 明文密码比较（auth.ts:3）
   - 问题：直接比较明文密码
   - 建议：使用 bcrypt 等库比较哈希值

3. 缺少错误处理（auth.ts:2）
   - 问题：db.query 可能抛出异常
   - 建议：添加 try-catch 块
```

这种即时反馈比等到 CI 失败或 Code Review 时才发现问题高效得多。

## 第二环节：Git Hook 自动触发

### 2.1 Pre-commit Hook 基础版

让审查在每次提交前自动运行。创建 `.git/hooks/pre-commit`：

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 获取暂存区的变更
diff=$(git diff --staged)

if [ -z "$diff" ]; then
    exit 0
fi

echo "Running Claude Code pre-commit review..."

# 运行审查
result=$(echo "$diff" | claude -p "审查这段代码变更，只关注严重问题（bug、安全、崩溃风险）。
如果没有严重问题，只输出'PASS'。
如果有问题，列出问题并输出'BLOCK'。" 2>/dev/null)

# 检查是否通过
if echo "$result" | grep -q "PASS"; then
    echo "✓ Claude Code 审查通过"
    exit 0
else
    echo ""
    echo "========================================"
    echo "Claude Code 审查发现问题："
    echo "========================================"
    echo "$result"
    echo ""
    echo "如需跳过审查，使用 git commit --no-verify"
    exit 1
fi
```

给 hook 添加执行权限：`chmod +x .git/hooks/pre-commit`

现在每次 `git commit` 都会自动触发审查。如果发现问题，提交会被拦截，并显示审查结果。

### 2.2 进阶版：可配置的严重程度分级

基础版的问题是"一刀切"——有时候你想快速提交一个临时改动，却被拦下来。进阶版支持通过环境变量控制审查严格程度：

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 读取配置（可通过环境变量覆盖）
CC_REVIEW_MODE=${CC_REVIEW_MODE:-"strict"}  # strict/normal/quick/off
CC_REVIEW_TIMEOUT=${CC_REVIEW_TIMEOUT:-"30"}

# 如果设置为 off，跳过审查
if [ "$CC_REVIEW_MODE" = "off" ]; then
    exit 0
fi

diff=$(git diff --staged)
[ -z "$diff" ] && exit 0

# 根据模式选择提示词
case "$CC_REVIEW_MODE" in
    "strict")
        prompt="严格审查这段代码变更，检查：
1. 逻辑错误和潜在 bug
2. 安全漏洞（注入、XSS、硬编码密钥等）
3. 边界情况和错误处理
4. 代码可读性和维护性
5. 性能问题

如果发现任何问题，输出'BLOCK'并列出问题。"
        ;;
    "normal")
        prompt="审查这段代码变更，检查：
1. 明显的逻辑错误
2. 安全问题
3. 严重的边界情况遗漏

如果没有严重问题，输出'PASS'。如果有，输出'BLOCK'并列出。"
        ;;
    "quick")
        prompt="快速检查这段代码变更，只关注可能导致崩溃或安全漏洞的严重问题。输出'PASS'或'BLOCK'。"
        ;;
esac

echo "Running Claude Code review (mode: $CC_REVIEW_MODE)..."

result=$(echo "$diff" | claude -p "$prompt" 2>/dev/null)

if echo "$result" | grep -q "PASS"; then
    echo "✓ 审查通过"
    exit 0
else
    echo ""
    echo "$result"
    echo ""
    echo "使用 git commit --no-verify 跳过审查"
    echo "或使用 CC_REVIEW_MODE=quick git commit 使用快速模式"
    exit 1
fi
```

使用方式：

```bash
# 默认严格模式
$ git commit -m "feat: add user auth"

# 快速模式（只检查严重问题）
$ CC_REVIEW_MODE=quick git commit -m "fix: typo"

# 跳过审查（紧急修复）
$ git commit --no-verify -m "hotfix: critical bug"
```

### 2.3 团队级配置：共享 Hook

`.git/hooks` 目录下的 hook 不会被提交到仓库，每个团队成员都需要手动配置。解决方案是使用 Git 的模板目录或 Husky：

**方案一：使用 Husky（推荐）**

```bash
# 项目初始化
npm install --save-dev husky
npx husky init

# 创建 pre-commit hook
echo '#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Claude Code 审查脚本
sh .github/scripts/claude-review.sh
' > .husky/pre-commit
```

创建 `.github/scripts/claude-review.sh`：

```bash
#!/bin/bash
# .github/scripts/claude-review.sh

diff=$(git diff --staged)
[ -z "$diff" ] && exit 0

echo "Running Claude Code review..."

result=$(echo "$diff" | claude -p "审查这段代码变更..." 2>/dev/null)

if echo "$result" | grep -q "PASS"; then
    echo "✓ 审查通过"
    exit 0
else
    echo "$result"
    exit 1
fi
```

这样整个团队都能共享相同的审查配置。

## 第三环节：多维度审查流水线

### 3.1 分层审查策略

单一的通用审查往往不够精准。更好的做法是建立分层审查流水线，针对不同场景使用不同的审查策略：

```bash
# ~/.zshrc

# 安全审查（专注于安全问题）
ccreview-security() {
    local diff=$(git diff --staged)
    [ -z "$diff" ] && return 1

    echo "$diff" | claude -p "进行安全专项审查，重点检查：
1. SQL 注入风险（字符串拼接查询）
2. XSS 漏洞（未转义的用户输入输出）
3. 命令注入（exec/system 调用用户输入）
4. 路径遍历（文件操作使用用户输入路径）
5. 硬编码密钥/密码
6. 不安全的反序列化
7. 敏感信息泄露（日志、错误信息）
8. CSRF 防护缺失

如果发现任何安全问题，输出'SECURITY_ISSUE'并详细说明。
如果没有安全问题，输出'SECURITY_PASS'。"
}

# 性能审查（专注于性能问题）
ccreview-performance() {
    local diff=$(git diff --staged)
    [ -z "$diff" ] && return 1

    echo "$diff" | claude -p "进行性能专项审查，重点检查：
1. 循环中的低效操作（如循环内查询数据库）
2. 内存泄漏风险（未释放的资源、闭包）
3. 不必要的重复计算
4. 大数据集的全量加载
5. 阻塞操作（同步 I/O、长时间计算）
6. N+1 查询问题
7. 未使用的导入和变量

如果发现性能问题，输出'PERF_ISSUE'并说明。
如果没有问题，输出'PERF_PASS'。"
}

# API 接口审查（专注于接口设计）
ccreview-api() {
    local diff=$(git diff --staged)
    [ -z "$diff" ] && return 1

    echo "$diff" | claude -p "进行 API 接口专项审查，重点检查：
1. 输入验证和参数校验
2. 错误处理（是否返回合适的 HTTP 状态码）
3. 认证和授权检查
4. 响应格式一致性
5. 幂等性设计
6. 限流和防刷考虑

如果发现接口设计问题，输出'API_ISSUE'并说明。
如果没有问题，输出'API_PASS'。"
}

# 完整流水线（依次运行多种审查）
ccreview-full() {
    echo "=== Claude Code 完整审查流水线 ==="
    echo ""
    
    local has_issue=0
    
    # 通用审查
    echo "[1/4] 运行通用审查..."
    local general=$(git diff --staged | claude -p "通用代码审查..." 2>/dev/null)
    if echo "$general" | grep -q "BLOCK\|ISSUE"; then
        echo "$general"
        has_issue=1
    else
        echo "✓ 通用审查通过"
    fi
    echo ""
    
    # 安全审查
    echo "[2/4] 运行安全审查..."
    local security=$(ccreview-security 2>/dev/null)
    if echo "$security" | grep -q "SECURITY_ISSUE"; then
        echo "$security"
        has_issue=1
    else
        echo "✓ 安全审查通过"
    fi
    echo ""
    
    # 性能审查
    echo "[3/4] 运行性能审查..."
    local perf=$(ccreview-performance 2>/dev/null)
    if echo "$perf" | grep -q "PERF_ISSUE"; then
        echo "$perf"
        has_issue=1
    else
        echo "✓ 性能审查通过"
    fi
    echo ""
    
    # API 审查（如果包含路由/controller 文件）
    if git diff --staged --name-only | grep -qE "(route|controller|api|handler)"; then
        echo "[4/4] 运行 API 审查..."
        local api=$(ccreview-api 2>/dev/null)
        if echo "$api" | grep -q "API_ISSUE"; then
            echo "$api"
            has_issue=1
        else
            echo "✓ API 审查通过"
        fi
    else
        echo "[4/4] 跳过 API 审查（无相关文件）"
    fi
    
    echo ""
    if [ $has_issue -eq 0 ]; then
        echo "=== 所有审查通过 ==="
        return 0
    else
        echo "=== 审查发现问题，请修复后重试 ==="
        return 1
    fi
}
```

### 3.2 文件类型感知审查

不同类型的文件需要不同的审查重点。创建一个智能审查脚本：

```bash
#!/bin/bash
# claude-smart-review.sh

# 获取变更的文件列表
changed_files=$(git diff --staged --name-only)

# 分类文件
typescript_files=$(echo "$changed_files" | grep -E '\.(ts|tsx)$' || true)
python_files=$(echo "$changed_files" | grep -E '\.py$' || true)
markdown_files=$(echo "$changed_files" | grep -E '\.md$' || true)
config_files=$(echo "$changed_files" | grep -E '\.(json|yaml|yml|toml)$' || true)

# TypeScript 专项审查
if [ -n "$typescript_files" ]; then
    echo "=== TypeScript 专项审查 ==="
    git diff --staged -- "$typescript_files" | claude -p "审查 TypeScript 代码，重点关注：
1. 类型安全（any 的使用、类型断言）
2. 空值检查（undefined/null 处理）
3. 异步错误处理（try-catch、Promise 错误）
4. React 组件问题（hook 规则、依赖数组）
5. 导入/导出规范

只输出发现的问题。"
    echo ""
fi

# Python 专项审查
if [ -n "$python_files" ]; then
    echo "=== Python 专项审查 ==="
    git diff --staged -- "$python_files" | claude -p "审查 Python 代码，重点关注：
1. 异常处理
2. 可变默认参数
3. 资源管理（with 语句）
4. 类型注解
5. 列表/字典推导式使用

只输出发现的问题。"
    echo ""
fi

# Markdown 文档审查
if [ -n "$markdown_files" ]; then
    echo "=== 文档审查 ==="
    git diff --staged -- "$markdown_files" | claude -p "审查 Markdown 文档变更，检查：
1. 拼写和语法错误
2. 链接是否有效
3. 格式一致性
4. 清晰度

只输出发现的问题。"
    echo ""
fi
```

## 第四环节：与编辑器集成

### 4.1 VS Code 集成

创建 `.vscode/tasks.json`：

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Claude Code Review",
            "type": "shell",
            "command": "git diff --staged | claude -p \"审查这段代码变更...\"",
            "group": "none",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            }
        }
    ]
}
```

创建 `.vscode/keybindings.json`：

```json
[
    {
        "key": "ctrl+shift+r",
        "command": "workbench.action.tasks.runTask",
        "args": "Claude Code Review"
    }
]
```

现在按 `Ctrl+Shift+R` 就能在 VS Code 中触发审查。

### 4.2 Vim/Neovim 集成

在 `.vimrc` 或 `init.vim` 中添加：

```vim
" Claude Code 代码审查
function! ClaudeCodeReview()
    let diff = system('git diff --staged')
    if empty(diff)
        echo "No staged changes"
        return
    endif
    
    let output = system('echo ' . shellescape(diff) . ' | claude -p "审查这段代码变更，列出发现的问题。"')
    echo output
endfunction

command! CCReview call ClaudeCodeReview()
nnoremap <leader>cr :CCReview<CR>
```

## 第五环节：成本与效率优化

### 5.1 控制审查成本

每次 `claude -p` 调用都消耗 API Token。对于大型项目，需要一些策略来控制成本：

**策略一：限制审查范围**

```bash
# 只审查特定目录
ccreview-src() {
    git diff --staged -- src/ | claude -p "审查 src 目录的变更..."
}

# 只审查特定类型的文件
ccreview-ts() {
    git diff --staged -- '*.ts' '*.tsx' | claude -p "审查 TypeScript 变更..."
}
```

**策略二：diff 大小限制**

```bash
ccreview-safe() {
    local diff=$(git diff --staged)
    local size=$(echo "$diff" | wc -c)
    
    # 如果 diff 超过 50KB，只审查文件列表
    if [ $size -gt 51200 ]; then
        echo "变更过大（$size 字节），切换到文件级审查"
        local files=$(git diff --staged --name-only)
        echo "变更文件：$files" | claude -p "这些文件有大量变更，建议拆分提交。"
        return
    fi
    
    echo "$diff" | claude -p "审查这段代码变更..."
}
```

**策略三：缓存审查结果**

```bash
# 使用 staged 内容的 hash 作为缓存 key
ccreview-cached() {
    local diff=$(git diff --staged)
    local hash=$(echo "$diff" | md5sum | cut -d' ' -f1)
    local cache_file="/tmp/claude-review-$hash"
    
    if [ -f "$cache_file" ]; then
        echo "（使用缓存结果）"
        cat "$cache_file"
        return
    fi
    
    echo "$diff" | claude -p "审查..." | tee "$cache_file"
}
```

### 5.2 审查质量优化

**添加项目上下文**

如果项目有 `CLAUDE.md` 文件，可以在审查时引用：

```bash
ccreview-with-context() {
    local diff=$(git diff --staged)
    local context=""
    
    if [ -f "CLAUDE.md" ]; then
        context=$(cat CLAUDE.md)
    fi
    
    echo "$diff" | claude -p "审查这段代码变更。

项目上下文：
$context

审查要求：...
"
}
```

**渐进式审查**

对于大型变更，先进行文件级概览审查，再针对问题文件进行详细审查：

```bash
ccreview-progressive() {
    local files=$(git diff --staged --name-only)
    
    # 第一步：文件级概览
    echo "步骤 1/2：文件级概览审查..."
    local overview=$(echo "$files" | claude -p "这些文件将被变更。基于文件名和常见模式，指出哪些文件可能存在风险（如核心逻辑、安全相关）。只输出高风险文件列表。")
    
    # 第二步：针对高风险文件详细审查
    echo "步骤 2/2：详细审查高风险文件..."
    for file in $overview; do
        if echo "$files" | grep -q "$file"; then
            git diff --staged -- "$file" | claude -p "详细审查 $file 的变更..."
        fi
    done
}
```

## 第六环节：团队推广与规范

### 6.1 渐进式引入策略

在团队中推广新工具时，建议采用渐进式策略：

**第一阶段（1-2 周）：可选使用**
- 将审查脚本作为可选工具提供
- 收集反馈，调整提示词
- 统计使用率和拦截的问题类型

**第二阶段（2-4 周）：推荐但非强制**
- 在 PR 模板中增加"是否已运行本地审查"选项
- Code Review 时优先检查 AI 发现的问题
- 分享审查发现的典型案例

**第三阶段（4 周后）：团队规范**
- 将审查脚本纳入项目模板
- 对核心模块强制审查
- 建立审查问题知识库

### 6.2 建立审查问题知识库

记录 Claude Code 发现的典型问题，用于团队学习：

```markdown
# 代码审查问题知识库

## 安全问题

### SQL 注入
- 发现次数：12
- 常见场景：动态拼接 SQL 查询
- 修复方案：使用参数化查询

### XSS
- 发现次数：8
- 常见场景：直接渲染用户输入
- 修复方案：使用转义函数

## 逻辑问题

### 边界情况遗漏
- 发现次数：23
- 常见场景：数组操作、除法运算
- 修复方案：添加空值和边界检查

...
```

## 总结

这篇文章带你从零搭建了一套完整的本地自动化代码审查流水线：

1. **基础审查**：Shell 函数封装，随时可用
2. **Git Hook 集成**：提交前自动触发
3. **多维度审查**：安全、性能、API 专项审查
4. **编辑器集成**：VS Code、Vim 快捷键
5. **成本优化**：范围限制、缓存、渐进式审查
6. **团队推广**：渐进式引入、知识库建设

这套流水线的核心价值在于**把问题发现提前到提交前**。虽然它不能替代人工 Code Review，但可以拦截 80% 的常见问题，让 Code Review 聚焦于真正需要人类判断的地方。

最后提醒一点：AI 审查也会出错，有时会误报，有时会漏过真正的问题。把它当作一个**辅助工具**而不是**绝对权威**。如果审查结果看起来不合理，相信自己的判断。

---

**参考配置**

完整的配置代码已整理在 [GitHub Gist](https://gist.github.com/example/claude-code-review-setup)（示例链接），可以直接复制使用。

**延伸阅读**

- [Headless 模式基础](/m4-advanced/01-headless-mode)
- [CI/CD 自动化实战](/m3-practice/09-cicd-automation)
- [代码审查思维方法](/m2-thinking/08-code-review)
