---
title: "CI/CD 自动化实战"
module: "m3-practice"
order: 9
group: "进阶实战"
description: "将 Claude Code 集成到 GitHub Actions 工作流, 实现自动化代码审查、测试生成和部署流程"
duration: "30 分钟"
level: "需编程基础"
publishedAt: 2026-03-29
---

# CI/CD 自动化实战

Claude Code 不仅可以在本地终端使用, 还能集成到 CI/CD 流水线中, 实现自动化的代码审查、测试生成和质量检查。本文以 GitHub Actions 为主, 演示如何将 Claude Code 融入自动化工作流。

---

## 一、Claude Code 在 CI/CD 中的定位

### 1.1 传统 CI/CD vs AI 增强 CI/CD

传统 CI/CD 流水线:

```
代码提交 -> 代码检查 (lint) -> 编译构建 -> 运行测试 -> 部署
```

AI 增强后的 CI/CD 流水线:

```
代码提交 -> AI 代码审查 -> 代码检查 (lint) -> AI 生成补充测试
-> 编译构建 -> 运行测试 -> AI 分析测试结果 -> 部署
```

### 1.2 适合自动化的场景

| 场景 | 自动化价值 | 复杂度 |
|------|-----------|--------|
| PR 代码审查 | 高 | 低 |
| 测试覆盖率补充 | 高 | 中 |
| 变更日志生成 | 中 | 低 |
| 安全漏洞扫描辅助 | 高 | 中 |
| 文档自动更新 | 中 | 中 |
| 性能回归分析 | 高 | 高 |

---

## 二、GitHub Actions 集成

### 2.1 基础配置

Claude Code 提供了 GitHub Actions 的官方集成方式。首先, 在仓库中设置 API Key:

```
Settings -> Secrets and variables -> Actions -> New repository secret
Name: ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxxxx
```

### 2.2 PR 自动审查工作流

创建 `.github/workflows/claude-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Get changed files
        id: changed
        run: |
          echo "files=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | tr '\n' ' ')" >> $GITHUB_OUTPUT

      - name: Run Claude Code Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "审查以下文件的代码变更, 重点关注:
          1. 潜在 Bug
          2. 安全问题
          3. 性能问题
          4. 代码可读性
          变更文件: ${{ steps.changed.outputs.files }}
          用中文输出审查报告, 格式为 Markdown" > review.md

      - name: Post review comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

### 2.3 使用非交互模式

CI/CD 环境中, Claude Code 必须以非交互模式运行:

```bash
# -p 标志表示直接传入提示词, 非交互模式
claude -p "你的提示词"

# 从文件读取提示词
claude -p "$(cat prompts/review.txt)"

# 指定输出格式
claude -p "分析代码" --output-format json
```

关键参数:

- `-p`: 非交互模式, 传入提示词后直接输出结果
- `--output-format`: 指定输出格式 (text/json/stream-json)
- `--max-turns`: 限制最大交互轮次
- `--model`: 指定使用的模型

---

## 三、自动化测试生成

### 3.1 为新代码自动生成测试

```yaml
name: Auto Generate Tests

on:
  pull_request:
    types: [opened, synchronize]
    paths:
      - 'src/**/*.ts'
      - '!src/**/*.test.ts'
      - '!src/**/*.spec.ts'

jobs:
  generate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          npm install -g @anthropic-ai/claude-code

      - name: Find files without tests
        id: find
        run: |
          changed=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep 'src/.*\.ts$' | grep -v '\.test\.\|\.spec\.')
          missing=""
          for f in $changed; do
            test_file="${f%.ts}.test.ts"
            if [ ! -f "$test_file" ]; then
              missing="$missing $f"
            fi
          done
          echo "files=$missing" >> $GITHUB_OUTPUT

      - name: Generate tests
        if: steps.find.outputs.files != ''
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          for file in ${{ steps.find.outputs.files }}; do
            claude -p "为 $file 生成单元测试文件。
            要求:
            - 使用 Vitest 框架
            - 覆盖主要分支和边界情况
            - 使用 describe/it 结构
            - Mock 外部依赖
            直接输出测试代码, 不要解释"
          done

      - name: Run tests
        run: npm test
```

### 3.2 测试覆盖率补充

```yaml
- name: Check coverage and generate missing tests
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    # 运行覆盖率检查
    npx vitest run --coverage --reporter=json > coverage.json 2>&1 || true

    # 让 Claude Code 分析覆盖率报告
    claude -p "分析 coverage.json 中覆盖率低于 80% 的文件,
    为覆盖率最低的 3 个文件生成补充测试。
    输出格式: 每个文件的测试代码, 用文件路径作为标题"
```

---

## 四、自动化代码质量检查

### 4.1 安全审查

```yaml
name: Security Review

on:
  pull_request:
    paths:
      - 'src/**'

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Security scan
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          diff=$(git diff origin/${{ github.base_ref }}...HEAD)
          claude -p "审查以下代码变更的安全问题:

          $diff

          检查项:
          1. SQL 注入风险
          2. XSS 漏洞
          3. 硬编码的密钥或密码
          4. 不安全的反序列化
          5. 路径遍历漏洞
          6. 不安全的随机数使用
          7. 敏感信息泄露

          如果发现问题, 输出:
          - 严重程度 (高/中/低)
          - 问题描述
          - 修复建议
          - 相关代码行号

          如果没有问题, 输出: 未发现安全问题" > security-report.md

      - name: Post security report
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('security-report.md', 'utf8');
            if (!report.includes('未发现安全问题')) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: '## 安全审查报告\n\n' + report
              });
            }
```

### 4.2 变更日志自动生成

```yaml
name: Generate Changelog

on:
  push:
    tags:
      - 'v*'

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Get commits since last tag
        id: commits
        run: |
          prev_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -z "$prev_tag" ]; then
            commits=$(git log --oneline)
          else
            commits=$(git log --oneline ${prev_tag}..HEAD)
          fi
          echo "log<<EOF" >> $GITHUB_OUTPUT
          echo "$commits" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Generate changelog
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "根据以下 Git 提交记录生成变更日志:

          ${{ steps.commits.outputs.log }}

          格式要求:
          - 按类别分组: 新功能、Bug 修复、性能优化、重构、文档
          - 每条变更用一句话描述
          - 忽略 merge commit 和版本号 commit
          - 输出 Markdown 格式
          - 使用中文" > CHANGELOG_ENTRY.md
```

---

## 五、高级自动化场景

### 5.1 自动修复 Lint 错误

```yaml
name: Auto Fix Lint

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  auto-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm ci
          npm install -g @anthropic-ai/claude-code

      - name: Run lint and capture errors
        id: lint
        continue-on-error: true
        run: |
          npx eslint src/ --format json > lint-results.json 2>&1

      - name: Auto fix with Claude Code
        if: steps.lint.outcome == 'failure'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p "读取 lint-results.json 中的 ESLint 错误,
          修复所有可以安全自动修复的问题。
          对于不确定的修复, 在代码中添加 TODO 注释。
          不要修改业务逻辑。"

      - name: Commit fixes
        run: |
          git config user.name "Claude Code Bot"
          git config user.email "bot@example.com"
          if git diff --quiet; then
            echo "No changes to commit"
          else
            git add -A
            git commit -m "style: auto-fix lint errors via Claude Code"
            git push
          fi
```

### 5.2 PR 描述自动生成

```yaml
name: Auto PR Description

on:
  pull_request:
    types: [opened]

jobs:
  describe:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Generate description
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          diff=$(git diff origin/${{ github.base_ref }}...HEAD)
          commits=$(git log --oneline origin/${{ github.base_ref }}..HEAD)

          claude -p "根据以下信息生成 PR 描述:

          提交记录:
          $commits

          代码变更摘要 (前 5000 字符):
          ${diff:0:5000}

          生成格式:
          ## 变更概述
          (1-3 句话总结)

          ## 主要改动
          (列表形式)

          ## 测试建议
          (列出需要测试的场景)

          ## 风险评估
          (低/中/高, 说明原因)" > pr-description.md

      - name: Update PR description
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('pr-description.md', 'utf8');
            github.rest.pulls.update({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              body: body
            });
```

---

## 六、成本与安全考量

### 6.1 控制 CI 中的 API 成本

CI 环境中需要特别注意成本控制:

```yaml
# 限制只在特定条件下触发 AI 审查
on:
  pull_request:
    types: [opened]  # 只在 PR 创建时触发, 不在每次 push 时
    paths:
      - 'src/**'     # 只在源码变更时触发
    branches:
      - main          # 只在目标为 main 时触发
```

其他成本控制措施:

- 使用 Sonnet 模型, 而非 Opus
- 限制 diff 大小, 超过阈值跳过 AI 审查
- 设置每日/每月的 API 调用预算
- 缓存重复的审查结果

```yaml
- name: Check diff size
  id: size
  run: |
    size=$(git diff origin/main...HEAD | wc -c)
    echo "bytes=$size" >> $GITHUB_OUTPUT

- name: Skip large diffs
  if: steps.size.outputs.bytes > 100000
  run: echo "Diff too large, skipping AI review"
```

### 6.2 安全注意事项

CI 环境中使用 Claude Code 的安全建议:

1. API Key 必须存储在 GitHub Secrets 中, 不要写在代码里
2. 不要将敏感数据 (数据库密码、用户数据) 发送给 API
3. 审查 Claude Code 自动生成的代码变更, 不要盲目合并
4. 限制 Claude Code 在 CI 中的权限 (只读, 不要给写权限)
5. 记录所有 AI 审查的日志, 便于审计

### 6.3 限制自动操作范围

```yaml
# 设置权限最小化
permissions:
  contents: read       # 只读代码
  pull-requests: write # 可以评论 PR
  # 不给 actions: write, deployments: write 等权限
```

---

## 七、调试 CI 中的 Claude Code

### 7.1 常见问题

**问题: Claude Code 在 CI 中输出为空**

检查:
- API Key 是否正确配置
- 网络是否可以访问 Anthropic API
- 提示词是否正确传入

```yaml
- name: Debug
  run: |
    echo "API Key length: ${#ANTHROPIC_API_KEY}"
    curl -s -o /dev/null -w "%{http_code}" https://api.anthropic.com/v1/messages
```

**问题: 输出格式不稳定**

使用 JSON 输出模式获得更稳定的结果:

```bash
claude -p "你的提示词" --output-format json
```

**问题: CI 超时**

Claude Code 处理大型代码库可能较慢:

```yaml
- name: Run Claude Code
  timeout-minutes: 10  # 设置超时
  run: claude -p "..." --max-turns 3  # 限制轮次
```

---

## 八、总结

将 Claude Code 集成到 CI/CD 的核心原则:

1. 从简单场景开始 -- 先做 PR 评论, 再做自动修复
2. 控制成本 -- 限制触发条件, 使用经济型模型
3. 保持人工审核 -- AI 的输出是建议, 不是最终决策
4. 最小权限 -- CI 中的 Claude Code 不应有过多权限
5. 监控和日志 -- 记录每次 AI 调用的输入输出

推荐的集成优先级:

1. PR 自动审查 (最容易, 价值最高)
2. 变更日志生成 (简单, 节省时间)
3. 测试覆盖率补充 (中等难度, 提升质量)
4. 安全扫描辅助 (重要, 但需要调优)
5. 自动修复 (最复杂, 需要谨慎)
