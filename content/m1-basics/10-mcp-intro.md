---
title: "MCP 入门指南"
module: "m1-basics"
order: 9
group: "参考手册"
description: "理解 Model Context Protocol 的核心概念, 学会配置 MCP Server, 用实际案例演示如何扩展 Claude Code 的能力"
duration: "25 分钟"
level: "零基础可读"
publishedAt: 2026-02-25
updatedAt: 2026-04-03
---

# MCP 入门指南

MCP (Model Context Protocol) 是 Anthropic 推出的开放协议, 让 Claude Code 能够连接外部工具和数据源。通过 MCP, Claude Code 不再局限于读写本地文件, 而是可以操作数据库、调用 API、管理云服务等。

---

## 一、什么是 MCP

### 1.1 一句话解释

MCP 是一套标准化的协议, 让 AI 助手能够安全地调用外部工具。你可以把它理解为 Claude Code 的"插件系统"。

### 1.2 为什么需要 MCP

没有 MCP 时, Claude Code 能做的事情:

- 读写本地文件
- 执行 Shell 命令
- 分析代码

有了 MCP 后, Claude Code 还能:

- 直接查询数据库
- 操作 GitHub Issues 和 PR
- 读取 Notion 文档
- 管理 Slack 消息
- 调用任意 REST API
- 操作 Docker 容器
- 查询监控系统

### 1.3 核心架构

MCP 采用客户端-服务器架构:

```
Claude Code (MCP Client)
    |
    |-- MCP Protocol (JSON-RPC)
    |
MCP Server (工具提供方)
    |
    |-- 实际服务 (数据库/API/文件系统等)
```

关键概念:

- **MCP Client**: Claude Code 内置的客户端, 负责发现和调用工具
- **MCP Server**: 提供具体工具的服务进程, 可以是本地的, 也可以是远程的
- **Tools**: MCP Server 暴露的具体功能, 比如"查询数据库""创建 Issue"
- **Resources**: MCP Server 提供的数据源, 比如数据库表结构、文件列表

### 1.4 MCP 与传统插件的区别

| 特性 | 传统插件 | MCP |
|------|---------|-----|
| 协议 | 各自定义 | 统一标准 |
| 安全性 | 依赖实现 | 协议层面保障 |
| 发现机制 | 手动配置 | 自动发现工具 |
| 跨平台 | 通常不行 | 协议统一, 天然跨平台 |
| 权限控制 | 粗粒度 | 细粒度工具级别 |

---

## 二、MCP Server 的配置

### 2.1 配置文件位置

Claude Code 的 MCP 配置有三个层级:

```
项目级别: .mcp.json (项目根目录)
用户级别: ~/.claude/settings.json
```

项目级别配置会被提交到版本控制, 团队共享。用户级别配置只对当前用户生效。

### 2.2 配置文件格式

`.mcp.json` 的基本结构:

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

每个字段的含义:

- `server-name`: 自定义名称, 用于标识这个 Server
- `command`: 启动 MCP Server 的命令
- `args`: 传递给命令的参数列表
- `env`: 环境变量, 通常用于传递密钥

### 2.3 使用 CLI 添加 MCP Server

除了手动编辑配置文件, 还可以用命令行:

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

## 三、常用 MCP Server 配置实例

### 3.1 GitHub MCP Server

连接 GitHub, 让 Claude Code 直接操作 Issues、PR、仓库:

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

### 3.2 文件系统 MCP Server

让 Claude Code 访问指定目录之外的文件:

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

### 3.3 PostgreSQL MCP Server

直接查询 PostgreSQL 数据库:

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

### 3.4 Slack MCP Server

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

### 3.5 Puppeteer MCP Server

让 Claude Code 能够控制浏览器, 做网页截图、自动化测试:

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

## 四、MCP 工具的使用方式

### 4.1 自动发现

配置好 MCP Server 后, Claude Code 会自动发现可用工具。你不需要记住工具名称, 直接用自然语言描述需求即可。

```
# 你说
帮我查看 GitHub 上这个仓库的 open PR

# Claude Code 自动调用 github MCP 的 list_pull_requests 工具
```

### 4.2 权限确认

首次使用某个 MCP 工具时, Claude Code 会请求你的确认:

```
Claude wants to use tool: github.create_issue
Allow? (y/n)
```

你可以:

- 输入 `y` 允许本次调用
- 输入 `n` 拒绝
- 配置自动允许规则

### 4.3 查看可用工具

```bash
# 在对话中输入
/mcp
```

这会列出所有已连接的 MCP Server 及其提供的工具。

---

## 五、实战案例

### 5.1 案例: 用 GitHub MCP 管理项目

场景: 你正在开发一个功能, 需要创建 Issue、提交代码、创建 PR。

```
步骤 1: 创建 Issue
> 在 my-org/my-repo 创建一个 Issue, 标题是"添加用户导出功能",
  标签为 enhancement

步骤 2: 完成开发后创建 PR
> 为当前分支创建 PR, 关联刚才的 Issue, 描述功能改动

步骤 3: 查看 CI 状态
> 查看刚才创建的 PR 的检查状态
```

全程不需要离开终端, 不需要打开浏览器。

### 5.2 案例: 用数据库 MCP 调试数据问题

场景: 用户反馈订单状态异常。

```
> 查询 orders 表中 user_id = 12345 的最近 5 条订单,
  包括 status 和 updated_at 字段

> 这些订单关联的 payments 记录是什么状态

> 找到问题了, 帮我写一个修复 SQL, 但不要执行,
  只是展示给我看
```

### 5.3 案例: 自定义 MCP Server

如果现有的 MCP Server 不满足需求, 你可以自己写一个。

一个最简单的 MCP Server (Node.js):

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

## 六、MCP 安全注意事项

### 6.1 最小权限原则

- GitHub Token 只授予必要的权限 (比如只给 repo 权限, 不给 admin)
- 数据库连接使用只读账号, 除非确实需要写入
- 文件系统 Server 限制在特定目录

### 6.2 敏感信息保护

- 不要把密钥直接写在 `.mcp.json` 中
- 使用环境变量引用
- `.mcp.json` 如果包含敏感信息, 加入 `.gitignore`

### 6.3 审查工具调用

MCP 工具的每次调用都会显示在 Claude Code 的输出中。注意审查:

- 是否调用了预期之外的工具
- 传递的参数是否合理
- 返回的数据是否包含敏感信息

---

## 七、常见问题

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

## 八、总结

MCP 是 Claude Code 的能力倍增器。掌握 MCP 后, Claude Code 从一个"代码助手"变成了一个"全能开发平台"。

入门路径:

1. 先配置 GitHub MCP Server, 体验基本流程
2. 根据项目需要, 逐步添加数据库、文件系统等 Server
3. 有自定义需求时, 尝试编写自己的 MCP Server

从今天开始, 让 Claude Code 不仅能写代码, 还能帮你操作整个开发工具链。
