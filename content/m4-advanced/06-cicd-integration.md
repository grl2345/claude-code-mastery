---
title: "Claude Code 接入 CI/CD：从 PR 审查到自动修复"
module: m4-advanced
order: 6
group: "自动化"
description: "把 Claude Code 集成到 GitHub Actions 流水线中，实现 PR 自动审查、lint 修复建议和变更摘要生成。"
duration: "22 分钟"
level: "进阶"
publishedAt: 2026-04-06
updatedAt: 2026-04-10
---

## 为什么把 Claude Code 接入 CI/CD

手动用 Claude Code 做代码审查已经很好用了（参考[思维篇的代码审查](/m2-thinking/08-code-review)）。但有一个痛点：你得记得去做。项目忙起来，经常是 commit 完直接 push，审查就跳过了。

把 Claude Code 接入 CI/CD，解决的就是"人会忘，但流水线不会忘"的问题。每一个 PR 都会自动触发 AI 审查，结果以评论的形式贴在 PR 页面上。团队所有人都能看到，不需要额外沟通成本。

我自己在用的场景有三个：PR 代码审查、变更摘要生成、lint/type 错误自动修复建议。

## 场景一：PR 自动审查

### GitHub Actions 配置

```yaml
# .github/workflows/claude-review.yml
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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要完整历史来生成 diff

      - name: Get PR diff
        id: diff
        run: |
          DIFF=$(git diff origin/${{ github.base_ref }}...HEAD)
          # 如果 diff 太大，截断避免超出上下文限制
          if [ ${#DIFF} -gt 30000 ]; then
            DIFF="${DIFF:0:30000}
          ... (diff 过长，已截断)"
          fi
          echo "diff<<EOFMARKER" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOFMARKER" >> $GITHUB_OUTPUT

      - name: Setup Claude Code
        run: npm install -g @anthropic-ai/claude-code

      - name: Run review
        id: review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          REVIEW=$(echo '${{ steps.diff.outputs.diff }}' | claude -p "你是一个代码审查员。审查以下代码变更，重点关注：
          1. 逻辑错误和潜在 bug
          2. 安全隐患
          3. 性能问题
          4. 可维护性问题

          只报告实际问题，不要夸奖代码。
          如果没有问题，只说'LGTM - 未发现问题'。
          用中文回复，格式简洁。")
          echo "review<<EOFMARKER" >> $GITHUB_OUTPUT
          echo "$REVIEW" >> $GITHUB_OUTPUT
          echo "EOFMARKER" >> $GITHUB_OUTPUT

      - name: Post review comment
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## 🔍 Claude Code Review\n\n${{ steps.review.outputs.review }}\n\n---\n*自动生成 by Claude Code*`
            });
```

### 实际效果

部署了这个 workflow 两个月后的数据：

- 审查了 67 个 PR
- 发现有效问题 23 次（占 34%）
- 其中 3 次是安全相关问题（未校验的用户输入、SQL 拼接、硬编码密钥）
- 误报约 8 次（12%），主要是不了解业务上下文导致的

34% 的有效发现率，对于一个零人力成本的自动审查来说已经很不错了。特别是安全类问题，人工审查很容易忽略，AI 在这方面反而更仔细。

## 场景二：变更摘要生成

PR 描述经常写得很敷衍——"fix bug"、"update code"。让 Claude Code 自动生成结构化的变更摘要：

```yaml
      - name: Generate summary
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          SUMMARY=$(echo '${{ steps.diff.outputs.diff }}' | claude -p "根据这段代码变更，生成一份结构化的变更摘要：

          ## 变更类型
          (feat/fix/refactor/docs/test 中选择)

          ## 变更内容
          (用 3-5 个要点概括主要改动)

          ## 影响范围
          (列出受影响的模块/功能)

          ## 需要关注的点
          (如果有需要测试者特别验证的场景，列在这里)

          简洁、准确，不要废话。")
          echo "$SUMMARY"
```

这个摘要贴到 PR 评论里，团队成员 review 之前先看摘要就能快速了解改动范围，不需要通读整个 diff。

## 场景三：Lint/Type 错误修复建议

CI 跑 lint 或 type check 失败时，不只是报错，还让 Claude Code 给出修复建议：

```yaml
      - name: Type check
        id: typecheck
        continue-on-error: true
        run: npx tsc --noEmit 2>&1 | tee typecheck-output.txt

      - name: Suggest fixes
        if: steps.typecheck.outcome == 'failure'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          ERRORS=$(cat typecheck-output.txt)
          claude -p "以下是 TypeScript 类型检查的报错：

          $ERRORS

          请给出每个错误的修复建议。格式：
          - 文件:行号 - 错误原因 - 建议修复方式

          只给出具体的修复建议，不要解释 TypeScript 基础概念。"
```

这对新人特别友好——CI 报了一堆类型错误，不需要去 Google 每一个错误码，直接看 Claude Code 的修复建议就能解决大部分问题。

## 成本控制

CI 里用 Claude Code 最大的担忧是成本。每次 PR 触发一次审查，如果一天 20 个 PR，每个审查消耗 5-10k tokens，一个月下来也是一笔费用。

我的控制策略：

### 1. 只审查有意义的变更

```yaml
on:
  pull_request:
    types: [opened, synchronize]
    paths-ignore:
      - '*.md'
      - 'docs/**'
      - '.github/**'
      - 'package-lock.json'
```

文档修改、配置变更、lock 文件更新不触发审查。

### 2. 限制 diff 大小

超过 500 行变更的 PR，只审查核心文件（去掉测试文件和生成文件的 diff），或者直接跳过自动审查，在 PR 评论里提醒"变更过大，请人工审查"。

### 3. 使用 Haiku 模型处理简单任务

变更摘要生成这类不需要深度理解的任务，可以用更便宜的模型：

```bash
claude -p --model claude-haiku-4-5-20251001 "生成变更摘要..."
```

成本大约是 Sonnet 的 1/10，对于摘要生成来说质量足够。

### 实际成本数据

我们团队（5 人）的月均成本：
- PR 审查：约 $15/月
- 变更摘要：约 $3/月
- 错误修复建议：约 $5/月
- **合计：约 $23/月**

相比一个工程师半天的时间成本，这点费用几乎可以忽略。

## 安全注意事项

1. **API Key 安全**：只通过 GitHub Secrets 传递 API Key，不要硬编码在 workflow 文件里
2. **代码不会发送到外部**：Claude Code 的 API 调用遵循 Anthropic 的数据政策，不会用于模型训练
3. **权限最小化**：workflow 只需要 `contents: read` 和 `pull-requests: write` 两个权限
4. **不要自动合并**：AI 审查结果只作为参考，合并决策必须由人做

## 我的 CI/CD 配置演进

| 阶段 | 做法 | 效果 |
|------|------|------|
| 第一周 | 只做 PR 审查 | 发现了几个安全问题，团队开始信任 |
| 第一个月 | 加上变更摘要 | 团队 review 效率明显提升 |
| 第二个月 | 加上错误修复建议 | 新人上手速度加快 |
| 现在 | 考虑加自动 fix PR | 还在评估风险 |

建议从最简单的 PR 审查开始，跑一两周确认效果后再逐步加功能。不要一次性上太多自动化，否则出问题时很难定位。

## 总结

Claude Code + CI/CD 的组合，本质上是把 AI 从"个人工具"变成了"团队基础设施"。关键原则：

1. **AI 审查是补充，不是替代**——最终决策权在人
2. **成本可控**——通过过滤规则和模型选择控制开支
3. **渐进式采用**——先跑简单场景，验证效果后再扩展
4. **安全第一**——API Key 走 Secrets，权限最小化
