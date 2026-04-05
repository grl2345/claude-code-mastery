---
title: "用 Claude Code 排查一个线上内存泄漏"
module: m3-practice
order: 3
group: "排查与调试"
description: "Node.js 服务内存持续增长，从发现问题到定位根因的完整排查过程，Claude Code 帮了大忙也帮了倒忙。"
duration: "20 分钟"
level: "需编程基础"
publishedAt: 2026-04-03
---

## 问题出现

某天下午，监控告警：一个 Node.js 服务的内存使用率在 4 小时内从 30% 涨到了 78%，而且还在缓慢增长。这个服务是一个内部的数据处理 API，跑在一台 2GB 内存的容器里，平时内存稳定在 500-600MB 左右。

看了一眼最近的部署记录，两天前上了一个版本，加了一个"批量导出"功能。直觉告诉我问题可能出在那里，但不确定。

## 第一轮排查：让 Claude Code 分析新增代码

```bash
$ claude "最近两天内存泄漏，疑似和新加的批量导出功能有关。
   请分析 src/services/export.ts 和 src/routes/export.ts：
   1. 有没有明显的内存泄漏风险
   2. 有没有未关闭的流、未释放的缓冲区
   3. 有没有持续增长的数据结构"
```

Claude Code 的分析指出了两个嫌疑点：

1. `export.ts` 里有一个 `Map` 类型的缓存，用来存储正在进行的导出任务状态，但**没有清理机制**——任务完成后 Map 里的条目不会删除。

2. 导出逻辑使用了 `createReadStream` 读取临时文件，但在错误处理分支里**没有调用 `stream.destroy()`**，可能导致文件描述符泄漏。

第一个问题确实是真的。我去看了那段代码，果然——每次导出请求都会往 `taskMap` 里加一条记录，但只有客户端来轮询下载的时候才会删除。如果客户端不来取，这条记录就永远在内存里。

第二个问题我不太确定。Claude Code 说"可能导致文件描述符泄漏"，但文件描述符泄漏和内存泄漏是两回事。我先把这个记下来，后面验证。

## 第二轮：深入分析——Claude Code 帮倒忙

看起来问题找到了，但我想确认一下。于是我让 Claude Code 帮我加一段内存监控代码：

```bash
$ claude "在 export service 里加一段调试代码：
   每次 taskMap 变化时，打印当前 Map 的大小和进程内存使用量。
   用 process.memoryUsage() 获取内存数据。
   做成一个可以通过环境变量开关的调试模式。"
```

Claude Code 写了调试代码，我部署到了测试环境。跑了一个小时后看日志，发现 **taskMap 确实在增长，但内存增长的幅度和 Map 大小不成正比**。Map 里只有几十条记录（每条几百字节），但内存涨了 200MB。

这说明 taskMap 可能不是主要原因，或者不是唯一的原因。

于是我又问了 Claude Code：

```bash
$ claude "taskMap 增长不能完全解释内存泄漏的幅度。
   帮我检查整个 export 模块的数据流：
   从接收请求到生成文件到返回下载链接，
   有没有大块数据被意外保持引用？"
```

这次 Claude Code 给了一个**错误的方向**。它说可能是因为 Express 的 request 对象被闭包引用了，建议我检查是否有回调函数持有了 req 的引用。我花了 30 分钟按它的方向查，什么都没找到。

**教训**：当 Claude Code 给出的排查方向没有结果时，不要继续让它猜。该换思路了。

## 第三轮：回到基本功

我决定不再依赖 Claude Code 的猜测，而是用最基本的工具来定位问题。

```bash
$ claude "帮我写一个 heapdump 脚本：
   - 在 /debug/heapdump 路由上挂一个端点
   - 调用时生成 V8 heap snapshot
   - 保存到 /tmp 目录
   - 加上基本的鉴权（Bearer token）"
```

这种工具性的任务 Claude Code 做得很好，一次搞定。我部署后分别在启动时和运行 2 小时后各抓了一份 heap snapshot，然后用 Chrome DevTools 做对比分析。

结果发现：**内存增长的大头不是 taskMap，而是 Buffer 对象。** 在"Comparison"视图里，新增了大量 4MB 左右的 Buffer 实例，总共占了 150MB 以上。

回去看代码，真相浮出水面了：批量导出功能在生成 Excel 文件时，会把整个数据集先读进内存（用 `Buffer.concat` 拼接），然后一次性写入文件。如果导出的数据量大（比如 5 万行），单个 Buffer 就有好几 MB。而且由于 Node.js 的垃圾回收机制，大块 Buffer 被分配在 Old Space，回收时机不可预测。

更要命的是：如果同时有多个用户在导出，这些 Buffer 会同时存在于内存中。

## 修复

定位到根因后，修复方案就清晰了：

```bash
$ claude "修改 export service 的文件生成逻辑：
   1. 不要用 Buffer.concat 一次性拼接，改成流式写入
   2. 用 xlsx-stream（已经在 package.json 里了）替代当前的内存生成方式
   3. 生成临时文件后立即释放数据引用
   4. 另外修复 taskMap 的清理问题：任务完成 10 分钟后自动删除条目

   保持 API 接口不变，只改内部实现。"
```

Claude Code 的修复方案核心改动是把 Excel 生成从"全量内存"改成了"流式写入"：

```typescript
// 修复前：全部读进内存
const chunks: Buffer[] = [];
data.forEach(row => chunks.push(serializeRow(row)));
const buffer = Buffer.concat(chunks);  // 可能几十MB
fs.writeFileSync(tmpPath, buffer);

// 修复后：流式写入
const stream = createWriteStream(tmpPath);
for (const row of data) {
  stream.write(serializeRow(row));  // 逐行写入
}
stream.end();
```

同时给 taskMap 加了一个定时清理：

```typescript
// 任务完成后 10 分钟自动清理
setTimeout(() => taskMap.delete(taskId), 10 * 60 * 1000);
```

## 验证

修复部署后，我做了三轮验证：

1. **功能验证**：导出 1000 行、10000 行、50000 行数据，文件内容正确
2. **内存验证**：连续导出 20 次后，内存稳定在 550MB 左右，不再持续增长
3. **并发验证**：5 个用户同时导出 50000 行，内存峰值 700MB，完成后回落到 560MB

## 复盘：Claude Code 在 debug 中的角色

回看整个排查过程（总共约 2.5 小时），Claude Code 的表现可以分为三档：

**靠谱的**：
- 初始代码分析——找到了 taskMap 泄漏（虽然不是主因）
- 工具性代码编写——heapdump 脚本、调试日志
- 最终修复——流式写入的改造

**有误导的**：
- 第二轮排查中把方向引到了 Express req 引用上，浪费了 30 分钟

**做不到的**：
- 判断问题的严重程度（Map 泄漏 vs Buffer 泄漏哪个是主因）
- 理解 V8 垃圾回收的运行时行为
- 在没有运行时数据的情况下准确定位内存泄漏根因

**核心结论**：Claude Code 在 debug 流程中最适合的角色是**工具手**——你告诉它要做什么检查、写什么工具、改什么代码，它执行得很快。但**排查方向应该由你来定**，因为 debug 的核心能力是"根据证据缩小范围"，这需要对运行时行为的直觉和经验，不是静态代码分析能替代的。
