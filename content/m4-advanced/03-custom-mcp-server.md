---
title: "自定义 MCP Server：给 Claude Code 接上你自己的工具"
module: m4-advanced
order: 3
group: "扩展开发"
description: "从零开发一个 MCP Server，让 Claude Code 直接查数据库、调内部 API、操作业务系统。"
duration: "25 分钟"
level: "需编程基础"
publishedAt: 2026-03-28
updatedAt: 2026-04-06
---

## 为什么要自己写 MCP Server

Claude Code 自带的工具已经覆盖了大部分开发场景——读写文件、搜索代码、执行命令。但当你想让它做一些"定制化"操作时，就会碰壁：

- 查一下生产数据库里某个用户的订单状态
- 调用公司内部的部署 API 触发一次上线
- 从 Confluence 拉一篇设计文档作为上下文

这些事情，你当然可以让 Claude Code 通过 Bash 工具去 `curl` 或者跑脚本。但这样做有两个问题：第一，每次都要手写命令，重复且容易出错；第二，Claude Code 不知道这些工具的存在，不会主动使用它们。

MCP（Model Context Protocol）解决的就是这个问题。你写一个 MCP Server，声明"我有一个叫 `query_orders` 的工具，参数是 `user_id`，返回订单列表"，Claude Code 就会像使用内置工具一样自动调用它。

## MCP 协议极简解释

MCP 的核心非常简单：

1. **Server** 声明自己有哪些工具（tools）、每个工具的参数和描述
2. **Client**（Claude Code）启动时发现这些工具，加入可用工具列表
3. 对话过程中，Claude 根据用户意图自动选择合适的工具调用
4. Server 执行具体逻辑，返回结果

通信方式支持两种：`stdio`（标准输入输出，最常用）和 `SSE`（Server-Sent Events，适合远程部署）。本地开发用 stdio 就够了。

## 实战：写一个数据库查询 MCP Server

我用一个实际场景来演示：让 Claude Code 能直接查询 SQLite 数据库。

### 第一步：初始化项目

```bash
$ mkdir mcp-db-query && cd mcp-db-query
$ npm init -y
$ npm install @modelcontextprotocol/sdk better-sqlite3
$ npm install -D typescript @types/better-sqlite3
```

### 第二步：写 Server 代码

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Database from "better-sqlite3";
import { z } from "zod";

const DB_PATH = process.env.DB_PATH || "./data.db";
const db = new Database(DB_PATH, { readonly: true }); // 只读，安全第一

const server = new McpServer({
  name: "db-query",
  version: "1.0.0",
});

// 工具 1：查询用户订单
server.tool(
  "query_orders",
  "根据用户 ID 查询订单列表，返回最近 20 条",
  { user_id: z.string().describe("用户 ID") },
  async ({ user_id }) => {
    const rows = db
      .prepare(
        "SELECT id, status, amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
      )
      .all(user_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  }
);

// 工具 2：查询表结构
server.tool(
  "describe_table",
  "查看某张表的字段结构",
  { table_name: z.string().describe("表名") },
  async ({ table_name }) => {
    // 防止 SQL 注入：只允许字母数字和下划线
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table_name)) {
      return {
        content: [{ type: "text" as const, text: "无效的表名" }],
        isError: true,
      };
    }
    const columns = db.prepare(`PRAGMA table_info(${table_name})`).all();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(columns, null, 2),
        },
      ],
    };
  }
);

// 启动
const transport = new StdioServerTransport();
await server.connect(transport);
```

几个关键设计决策：

1. **数据库用只读模式打开**。MCP Server 应该遵循最小权限原则，查询工具不需要写权限。
2. **表名做了正则校验**。虽然是内部工具，但 SQL 注入防护不能省。
3. **结果限制 20 条**。避免返回海量数据撑爆上下文。

### 第三步：配置 Claude Code

在项目根目录的 `.mcp.json`（或全局 `~/.claude/mcp.json`）中注册：

```json
{
  "mcpServers": {
    "db-query": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-db-query/src/index.ts"],
      "env": {
        "DB_PATH": "/path/to/your/database.db"
      }
    }
  }
}
```

重启 Claude Code，输入 `/mcp` 确认 Server 已加载。你会看到 `db-query` 出现在已连接的 Server 列表中。

### 第四步：测试使用

现在你可以直接和 Claude Code 说：

> "帮我查一下用户 u_12345 最近的订单"

Claude Code 会自动调用 `query_orders` 工具，传入 `user_id: "u_12345"`，然后把查询结果格式化展示给你。你不需要写任何 SQL，不需要手动连数据库。

## 我踩过的坑

### 坑 1：stderr 输出干扰 stdio 通信

MCP 用 stdin/stdout 通信，如果你的代码往 stderr 写了调试日志，某些情况下会干扰通信。我一开始用 `console.log` 调试，结果 Server 反复连接失败。

解决方案：调试日志写到文件，不要用 console。

```typescript
import fs from "fs";
const log = (msg: string) =>
  fs.appendFileSync("/tmp/mcp-debug.log", `${new Date().toISOString()} ${msg}\n`);
```

### 坑 2：忘记处理数据库连接异常

数据库文件不存在时 `better-sqlite3` 会直接抛异常，Server 进程崩溃，Claude Code 只显示一个模糊的"MCP Server disconnected"错误。

解决方案：在 Server 启动时做前置检查：

```typescript
import fs from "fs";
if (!fs.existsSync(DB_PATH)) {
  process.stderr.write(`数据库文件不存在: ${DB_PATH}\n`);
  process.exit(1);
}
```

### 坑 3：返回数据太大

有一次查了一张大表，返回了几千条记录，直接把上下文窗口撑满了。Claude Code 后续对话质量急剧下降。

教训：**MCP 工具的返回值一定要做大小限制。** 宁可让用户多查几次，也不要一次返回太多数据。

## 更多实用 MCP Server 思路

写完第一个之后，我又陆续做了几个内部用的 Server：

| Server | 功能 | 使用频率 |
|--------|------|----------|
| `jira-query` | 查 Jira ticket 状态和详情 | 每天 |
| `deploy-trigger` | 触发测试环境部署 | 每周 2-3 次 |
| `log-search` | 搜索生产日志（接 ELK API） | 排障时 |
| `doc-reader` | 从 Confluence 拉文档内容 | 写代码前查设计文档 |

这些 Server 加起来代码不超过 500 行，但让 Claude Code 从"只会读写代码"变成了"能操作整个开发工具链"。

## 安全注意事项

自定义 MCP Server 本质上是给 AI 开了一个操作后端系统的口子，安全问题必须认真对待：

1. **最小权限**：数据库只读、API 只给必要的 scope、部署只允许测试环境
2. **输入校验**：所有参数都要做白名单校验，不能信任 AI 传过来的任何值
3. **操作审计**：关键操作（部署、数据修改）记日志，方便事后追溯
4. **不要暴露敏感数据**：过滤掉密码、token、个人隐私信息再返回

MCP Server 的能力边界，取决于你愿意给它多大的权限。我的建议是：从只读开始，确认安全后再逐步放开写权限。
