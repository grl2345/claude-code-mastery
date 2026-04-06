---
title: "常见报错排查"
module: "m1-basics"
order: 10
group: "参考手册"
description: "收录 20+ 个 Claude Code 常见错误及其解决方案, 覆盖安装、认证、网络、运行时等各类问题"
duration: "15 分钟"
level: "零基础可读"
publishedAt: "2026-04-05"
---

# 常见报错排查

使用 Claude Code 过程中遇到报错是正常现象。本文整理了 20 多个高频错误, 按类别分组, 每个错误都给出原因分析和解决步骤。建议收藏本文, 遇到问题时直接搜索错误关键词。

---

## 一、安装类错误

### 错误 1: npm install 权限不足

```
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

原因: 全局安装 npm 包时, 当前用户没有写入系统目录的权限。

解决方案:

```bash
# 方案一: 使用 npx 直接运行, 不全局安装
npx @anthropic-ai/claude-code

# 方案二: 修改 npm 全局目录到用户目录
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
# 将以下行添加到 ~/.bashrc 或 ~/.zshrc
export PATH=~/.npm-global/bin:$PATH
source ~/.bashrc
npm install -g @anthropic-ai/claude-code
```

### 错误 2: Node.js 版本过低

```
Error: Claude Code requires Node.js >= 18.0.0
```

原因: Claude Code 依赖较新版本的 Node.js 特性。

解决方案:

```bash
# 查看当前版本
node --version

# 使用 nvm 安装新版本
nvm install 20
nvm use 20

# 或者直接从官网下载最新 LTS 版本
# https://nodejs.org/
```

### 错误 3: 网络超时导致安装失败

```
npm ERR! network timeout at: https://registry.npmjs.org/...
```

原因: 网络连接不稳定, 或 npm 源访问慢。

解决方案:

```bash
# 切换到国内镜像源
npm config set registry https://registry.npmmirror.com

# 然后重新安装
npm install -g @anthropic-ai/claude-code

# 安装完成后可以切回官方源
npm config set registry https://registry.npmjs.org
```

---

## 二、认证类错误

### 错误 4: API Key 无效

```
Error: Invalid API key provided
```

原因: API Key 格式错误、已过期或未激活。

解决方案:

1. 登录 https://console.anthropic.com 检查 API Key
2. 确认 Key 是否以 `sk-ant-` 开头
3. 如果是新创建的 Key, 等待几分钟再试
4. 重新生成一个 Key 并配置

```bash
# 重新配置
claude config set apiKey sk-ant-xxxxxxxxxxxx
```

### 错误 5: 认证过期

```
Error: Authentication expired. Please log in again.
```

原因: OAuth 登录的 Token 过期。

解决方案:

```bash
# 重新登录
claude login

# 如果是 Max 订阅用户
claude login --method browser
```

### 错误 6: 账户余额不足

```
Error: Insufficient credits. Please add credits to your account.
```

原因: API 按量付费模式下, 账户余额用完了。

解决方案:

1. 登录 Anthropic Console
2. 进入 Billing 页面
3. 充值或设置自动充值
4. 如果已设置消费上限, 考虑提高上限

### 错误 7: 速率限制

```
Error: Rate limit exceeded. Please try again in X seconds.
```

原因: 短时间内发送了太多请求, 触发了 API 速率限制。

解决方案:

- 等待提示的时间后重试
- 减少并发请求数量
- 升级 API 计划以获得更高的速率限制
- 使用指数退避策略自动重试

---

## 三、网络类错误

### 错误 8: 连接被拒绝

```
Error: connect ECONNREFUSED 127.0.0.1:443
```

原因: 通常是代理配置问题。

解决方案:

```bash
# 检查代理设置
echo $HTTP_PROXY
echo $HTTPS_PROXY

# 如果使用代理, 确保代理服务正在运行
# 如果不需要代理, 清除代理设置
unset HTTP_PROXY
unset HTTPS_PROXY
```

### 错误 9: SSL 证书错误

```
Error: unable to verify the first certificate
```

原因: 公司网络的 SSL 中间人代理, 或系统证书不完整。

解决方案:

```bash
# 方案一: 配置公司 CA 证书
export NODE_EXTRA_CA_CERTS=/path/to/company-ca.pem

# 方案二 (不推荐, 仅用于临时测试)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 错误 10: DNS 解析失败

```
Error: getaddrinfo ENOTFOUND api.anthropic.com
```

原因: DNS 无法解析 Anthropic API 域名。

解决方案:

```bash
# 测试 DNS
nslookup api.anthropic.com

# 如果失败, 尝试更换 DNS
# 编辑 /etc/resolv.conf 或使用以下命令
# macOS:
networksetup -setdnsservers Wi-Fi 8.8.8.8 8.8.4.4

# Linux:
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```

### 错误 11: 请求超时

```
Error: Request timed out after 60000ms
```

原因: 网络慢, 或请求内容过大导致处理时间过长。

解决方案:

- 检查网络连接质量
- 减少单次请求的内容量 (比如不要一次读取太多文件)
- 使用 /compact 减少上下文大小
- 尝试换用 Sonnet 模型 (响应更快)

---

## 四、运行时错误

### 错误 12: 上下文长度超限

```
Error: Maximum context length exceeded
```

原因: 对话历史加上当前输入超过了模型的上下文窗口限制。

解决方案:

```bash
# 在对话中执行
/compact

# 或者开启新对话
/clear
```

预防措施:

- 定期使用 /compact
- 避免在一个对话中处理太多任务
- 不要让 Claude Code 一次读取过大的文件

### 错误 13: 工具执行失败

```
Error: Tool execution failed: command exited with code 1
```

原因: Claude Code 尝试执行的 Shell 命令失败了。

解决方案:

- 查看完整的错误输出, 理解命令为什么失败
- 检查命令所需的工具是否已安装
- 检查文件路径是否正确
- 检查权限是否足够

### 错误 14: 文件读取失败

```
Error: ENOENT: no such file or directory, open 'path/to/file'
```

原因: Claude Code 尝试读取的文件不存在。

解决方案:

- 确认文件路径是否正确
- 检查是否有拼写错误
- 确认工作目录是否正确

```bash
# 在对话中确认当前目录
pwd
```

### 错误 15: 权限被拒绝

```
Error: EACCES: permission denied, open '/etc/some-config'
```

原因: Claude Code 尝试访问没有权限的文件或目录。

解决方案:

- 检查文件权限: `ls -la /path/to/file`
- 如果确实需要访问, 修改权限或使用 sudo
- 考虑是否应该将文件复制到有权限的目录

---

## 五、MCP 相关错误

### 错误 16: MCP Server 启动失败

```
Error: MCP server 'github' failed to start
```

原因: MCP Server 的启动命令有误, 或依赖缺失。

解决方案:

```bash
# 手动测试启动命令
npx -y @modelcontextprotocol/server-github

# 检查 .mcp.json 配置是否正确
cat .mcp.json

# 确认环境变量是否设置
echo $GITHUB_TOKEN
```

### 错误 17: MCP 工具调用超时

```
Error: MCP tool call timed out
```

原因: MCP Server 响应时间过长, 通常是外部服务慢。

解决方案:

- 检查外部服务 (数据库、API) 是否正常
- 检查网络连接
- 简化查询或操作

### 错误 18: MCP Server 连接断开

```
Error: MCP server 'postgres' disconnected unexpectedly
```

原因: MCP Server 进程崩溃或被系统终止。

解决方案:

```bash
# 重启 Claude Code 会自动重启 MCP Server
# 或者使用命令重置
claude mcp reset

# 检查系统资源
free -h  # 内存
df -h    # 磁盘
```

---

## 六、配置类错误

### 错误 19: CLAUDE.md 解析错误

```
Warning: Failed to parse CLAUDE.md
```

原因: CLAUDE.md 文件格式有问题。

解决方案:

- 检查 Markdown 格式是否正确
- 确保文件编码是 UTF-8
- 移除可能导致解析问题的特殊字符

### 错误 20: 配置文件损坏

```
Error: Failed to read configuration file
```

原因: Claude Code 的配置文件 JSON 格式错误。

解决方案:

```bash
# 查看配置文件
cat ~/.claude/settings.json

# 如果 JSON 格式有误, 可以重置
rm ~/.claude/settings.json
# 重新启动 Claude Code 会生成默认配置
```

### 错误 21: Git 仓库未初始化

```
Warning: Not in a git repository. Some features may be limited.
```

原因: 当前目录不是 Git 仓库, Claude Code 的部分功能受限。

解决方案:

```bash
# 初始化 Git 仓库
git init

# 或者进入正确的项目目录
cd /path/to/your/project
```

---

## 七、模型相关错误

### 错误 22: 模型不可用

```
Error: Model 'claude-opus-4-20250901' is not available
```

原因: 请求的模型版本不存在或当前账户无权访问。

解决方案:

```bash
# 切换到可用模型
/model sonnet

# 检查账户可用的模型列表
claude models
```

### 错误 23: 输出被截断

```
[Response truncated due to max token limit]
```

原因: 模型的单次输出达到了最大 Token 限制。

解决方案:

- 让 Claude Code 分步完成任务
- 要求它先输出一部分, 然后说"继续"

```
# 例如
先实现前 3 个函数, 剩余的下一步再写
```

### 错误 24: 内容被安全过滤

```
Error: Response blocked by safety filters
```

原因: 请求或响应触发了内容安全检查。

解决方案:

- 检查提示词是否包含敏感内容
- 重新组织语言, 用更技术化的表述
- 这通常发生在讨论安全漏洞、渗透测试等话题时

---

## 八、系统环境错误

### 错误 25: 内存不足

```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

原因: Node.js 进程内存溢出, 通常是处理大文件或长对话导致。

解决方案:

```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
claude
```

### 错误 26: 磁盘空间不足

```
Error: ENOSPC: no space left on device
```

原因: 磁盘满了, 无法写入文件。

解决方案:

```bash
# 检查磁盘空间
df -h

# 清理 npm 缓存
npm cache clean --force

# 清理不用的包
npm prune
```

---

## 九、排查通用流程

遇到未列出的错误时, 按以下步骤排查:

**第一步: 阅读完整错误信息**

不要只看第一行, 完整的 stack trace 通常包含关键线索。

**第二步: 检查基础环境**

```bash
node --version      # 确认 Node.js 版本
npm --version       # 确认 npm 版本
claude --version    # 确认 Claude Code 版本
```

**第三步: 更新到最新版本**

```bash
npm update -g @anthropic-ai/claude-code
```

**第四步: 清理缓存和配置**

```bash
# 清理 npm 缓存
npm cache clean --force

# 如有必要, 重置配置
rm -rf ~/.claude/cache
```

**第五步: 检查网络**

```bash
# 测试 API 连通性
curl -I https://api.anthropic.com

# 测试 DNS
nslookup api.anthropic.com
```

**第六步: 查看日志**

```bash
# Claude Code 的日志目录
ls ~/.claude/logs/

# 查看最近的日志
cat ~/.claude/logs/latest.log
```

**第七步: 搜索社区**

- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Anthropic Discord 社区
- Stack Overflow (标签: claude-code)

---

## 十、总结

大多数 Claude Code 的报错都可以归结为以下几类:

1. 环境问题 -- 升级 Node.js, 检查权限
2. 认证问题 -- 重新登录, 检查 API Key
3. 网络问题 -- 检查代理、DNS、防火墙
4. 资源问题 -- 上下文过长, 内存不足, 磁盘满

遇到报错不要慌, 按照错误分类对号入座, 90% 的问题都能在 5 分钟内解决。把本文加入书签, 下次遇到问题时直接搜索关键词。
