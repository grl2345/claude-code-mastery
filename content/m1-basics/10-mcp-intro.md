---
title: "什么是 MCP？Claude Code 的插件系统入门指南"
module: "m1-basics"
order: 10
group: "实用指南"
description: "MCP（Model Context Protocol）是 Claude Code 的插件系统，让它能连接 GitHub、数据库、Slack 等外部工具。本文包含 5 个常用 MCP Server 配置实例和安全注意事项。"
duration: "25 分钟"
level: "零基础可读"
publishedAt: "2026-04-05"
---

# 什么是 MCP？Claude Code 的插件系统入门指南

**MCP（Model Context Protocol）是 Anthropic 推出的开放协议，相当于 Claude Code 的"插件系统"。** 通过 MCP，Claude Code 不再局限于读写本地文件，还可以操作数据库、调用 API、管理云服务等。

---

## MCP 是什么？为什么需要它？

**MCP 是一套标准化的协议，让 AI 助手能够安全地调用外部工具。**

没有 MCP 时，Claude Code 只能读写本地文件、执行 Shell 命令和分析代码。有了 MCP 后，Claude Code 还能：

- 直接查询数据库
- 操作 GitHub Issues 和 PR
- 读取 Notion 文档
- 管理 Slack 消息
- 调用任意 REST API
- 操作 Docker 容器
- 查询监控系统

## MCP 的核心架构是怎样的？

**MCP 采用客户端-服务器架构：**

```
Claude Code (MCP Client)
    |
    |-- MCP Protocol (JSON-RPC)
    |
MCP Server (工具提供方)
    |
    |-- 实际服务 (数据库/API/文件系统等)
```

**四个关键概念：**

- **MCP Client**：Claude Code 内置的客户端，负责发现和调用工具
- **MCP Server**：提供具体工具的服务进程，可以是本地的，也可以是远程的
- **Tools**：MCP Server 暴露的具体功能，比如"查询数据库""创建 Issue"
- **Resources**：MCP Server 提供的数据源，比如数据库表结构、文件列表

## MCP 和传统插件有什么区别？

| 特性 | 传统插件 | MCP |
|------|---------|-----|
| 协议 | 各自定义 | 统一标准 |
| 安全性 | 依赖实现 | 协议层面保障 |
| 发现机制 | 手动配置 | 自动发现工具 |
| 跨平台 | 通常不行 | 协议统一, 天然跨平台 |
| 权限控制 | 粗粒度 | 细粒度工具级别 |

---

## 如何配置 MCP Server？

### 配置文件放在哪里？

**Claude Code 的 MCP 配置有两个层级：**

```
项目级别: .mcp.json (项目根目录)
用户级别: ~/.claude/settings.json
```

项目级别配置会被提交到版本控制，团队共享。用户级别配置只对当前用户生效。

### .mcp.json 的格式是什么？

```json
{
  "mcpServers": {
    "server-name": {
      "command": "启动命令",
      "args": ["参数1", "参数2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}
```

**每个字段的含义：**

- `server-name`：自定义名称，用于标识这个 Server
- `command`：启动 MCP Server 的命令
- `args`：传递给命令的参数列表
- `env`：环境变量，通常用于传递密钥

### 如何用 CLI 命令管理 MCP Server？

```bash
# 添加一个 MCP Server
claude mcp add server-name command arg1 arg2

# 添加带环境变量的 Server
claude mcp add server-name command arg1 -e KEY=value

# 查看已配置的 Server
claude mcp list

# 删除一个 Server
claude mcp remove server-name
```

---

## 常用 MCP Server 怎么配置？五个实例

### GitHub MCP Server：操作 Issues、PR、仓库

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  }
}
```

配置后可以做的事情:

```
# 在 Claude Code 中直接说
列出这个仓库最近的 10 个 Issue

# Claude Code 会调用 GitHub MCP Server 获取数据
```

注意: Token 不要直接写在配置文件里。推荐使用环境变量引用:

```json
{
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

然后在 Shell 配置中导出环境变量:

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
```

### 文件系统 MCP Server：跨项目访问文件

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    }
  }
}
```

这在需要跨项目引用文件时很有用。

### PostgreSQL MCP Server：直接查询数据库

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:password@localhost:5432/mydb"
      ]
    }
  }
}
```

配置后:

```
# 在 Claude Code 中说
查看 users 表的结构

# 或者
查询最近 7 天注册的用户数量
```

### Slack MCP Server：管理消息

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
      }
    }
  }
}
```

### Puppeteer MCP Server：浏览器控制与自动化测试

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

---

## 配置好 MCP 后怎么使用？

### 自动发现：用自然语言即可调用

**配置好 MCP Server 后，Claude Code 会自动发现可用工具。** 你不需要记住工具名称，直接用自然语言描述需求即可。

```
# 你说
帮我查看 GitHub 上这个仓库的 open PR

# Claude Code 自动调用 github MCP 的 list_pull_requests 工具
```

### 权限确认：首次使用需要授权

```
Claude wants to use tool: github.create_issue
Allow? (y/n)
```

你可以:

- 输入 `y` 允许本次调用
- 输入 `n` 拒绝
- 配置自动允许规则

### 查看所有可用的 MCP 工具

```bash
# 在对话中输入
/mcp
```

这会列出所有已连接的 MCP Server 及其提供的工具。

---

## MCP 实战：三个常见场景

### 场景一：用 GitHub MCP 管理项目

**场景：你正在开发一个功能，需要创建 Issue、提交代码、创建 PR——全程不离开终端。**

```
步骤 1: 创建 Issue
> 在 my-org/my-repo 创建一个 Issue, 标题是"添加用户导出功能",
  标签为 enhancement

步骤 2: 完成开发后创建 PR
> 为当前分支创建 PR, 关联刚才的 Issue, 描述功能改动

步骤 3: 查看 CI 状态
> 查看刚才创建的 PR 的检查状态
```

### 场景二：用数据库 MCP 调试数据问题

**场景：用户反馈订单状态异常。**

```
> 查询 orders 表中 user_id = 12345 的最近 5 条订单,
  包括 status 和 updated_at 字段

> 这些订单关联的 payments 记录是什么状态

> 找到问题了, 帮我写一个修复 SQL, 但不要执行,
  只是展示给我看
```

### 场景三：如何自定义 MCP Server？

**如果现有的 MCP Server 不满足需求，你可以用 Node.js 自己写一个：**

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-custom-server",
  version: "1.0.0"
});

// 注册一个工具
server.tool(
  "get_weather",
  "获取指定城市的天气",
  {
    city: z.string().describe("城市名称")
  },
  async ({ city }) => {
    // 调用天气 API
    const weather = await fetchWeather(city);
    return {
      content: [{ type: "text", text: JSON.stringify(weather) }]
    };
  }
);

// 启动服务
const transport = new StdioServerTransport();
await server.connect(transport);
```

然后配置到 Claude Code:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["path/to/my-server.js"]
    }
  }
}
```

---

## 使用 MCP 需要注意哪些安全问题？

### 最小权限原则

- GitHub Token 只授予必要的权限 (比如只给 repo 权限, 不给 admin)
- 数据库连接使用只读账号, 除非确实需要写入
- 文件系统 Server 限制在特定目录

### 敏感信息保护

- 不要把密钥直接写在 `.mcp.json` 中
- 使用环境变量引用
- `.mcp.json` 如果包含敏感信息, 加入 `.gitignore`

### 审查每次工具调用

MCP 工具的每次调用都会显示在 Claude Code 的输出中。注意审查:

- 是否调用了预期之外的工具
- 传递的参数是否合理
- 返回的数据是否包含敏感信息

---

## MCP 常见问题解答

**Q: MCP Server 启动失败怎么办?**

检查:
1. 命令路径是否正确
2. 依赖是否安装 (npx 会自动安装, 但可能因网络问题失败)
3. 环境变量是否设置

**Q: 可以同时运行多个 MCP Server 吗?**

可以。在配置文件中添加多个即可, 它们互不干扰。

**Q: MCP Server 会一直运行吗?**

MCP Server 在 Claude Code 启动时按需启动, Claude Code 退出时自动关闭。

**Q: 远程 MCP Server 怎么连接?**

可以使用 SSE 传输方式连接远程 MCP Server:

```json
{
  "mcpServers": {
    "remote-server": {
      "type": "sse",
      "url": "https://my-server.example.com/mcp"
    }
  }
}
```

---

## MCP 入门应该从哪里开始？

**MCP 是 Claude Code 的能力倍增器，让它从"代码助手"变成"全能开发平台"。** 推荐入门路径：

1. **先配置 GitHub MCP Server**，体验基本流程
2. **根据项目需要**，逐步添加数据库、文件系统等 Server
3. **有自定义需求时**，尝试编写自己的 MCP Server

从今天开始，让 Claude Code 不仅能写代码，还能帮你操作整个开发工具链。
