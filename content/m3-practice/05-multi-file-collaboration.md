---
title: "跨 7 个文件的功能开发：多文件协作实战"
module: m3-practice
order: 5
group: "多文件协作"
description: "给一个 Express + React 项目加用户通知功能，涉及后端接口、数据模型、前端组件、样式和测试的联动修改。"
duration: "25 分钟"
level: "需编程基础"
publishedAt: 2026-04-05
---

## 需求

给一个内部项目管理工具加一个"站内通知"功能。需求不复杂，但涉及的面比较广：

- **后端**：新增通知数据模型、CRUD 接口、WebSocket 推送
- **前端**：通知铃铛组件、通知列表页、未读计数徽标
- **基础设施**：数据库迁移脚本

这个需求的特点是**文件多但单个文件改动不大**——典型的"全栈联动"场景。我想看看 Claude Code 在这种跨层协作中的表现。

## 规划阶段：先理清文件清单

开始之前，我先列了一份需要新增和修改的文件清单：

```
新增文件：
1. server/models/Notification.ts       -- 数据模型
2. server/routes/notifications.ts      -- API 路由
3. server/services/notificationService.ts -- 业务逻辑
4. client/components/NotificationBell.tsx -- 铃铛组件
5. client/pages/NotificationsPage.tsx   -- 通知列表页
6. server/migrations/add-notifications.ts -- 数据库迁移

修改文件：
7. server/index.ts                     -- 注册新路由
8. client/components/Header.tsx        -- 在导航栏加入铃铛
9. client/router.tsx                   -- 添加通知页路由
```

9 个文件。如果一口气全让 Claude Code 来做，绝对会出问题。我的策略是**按依赖顺序，从底层往上逐步构建**。

## 第一层：数据模型和迁移（对话 1-2）

### 对话 1：数据模型

```bash
$ claude "新建 server/models/Notification.ts：
   字段：
   - id: UUID 主键
   - userId: 关联 User 表
   - type: 枚举 ('task_assigned' | 'comment_mention' | 'deadline_reminder')
   - title: string
   - content: string
   - isRead: boolean, 默认 false
   - relatedId: string 可选（关联的任务/评论 ID）
   - createdAt: 时间戳

   用 Sequelize 定义，和项目里其他 model 保持相同风格。
   参考 server/models/Task.ts 的写法。"
```

**关键点**：最后一句"参考 server/models/Task.ts 的写法"很重要。这样 Claude Code 会读取现有的 model 文件，确保命名风格、导出方式、Sequelize 配置都和项目保持一致。如果不指定参考文件，它可能用自己习惯的写法，和项目现有代码风格不一致。

一次成功，代码风格和现有 model 完全一致。

### 对话 2：数据库迁移

```bash
$ claude "新建数据库迁移文件 server/migrations/add-notifications.ts：
   创建 notifications 表，字段和 Notification model 对应。
   参考 server/migrations/ 里最近的迁移文件格式。"
```

也是一次成功。迁移文件这种有固定模板的代码，Claude Code 做得非常稳。

## 第二层：后端服务和路由（对话 3-5）

### 对话 3：业务逻辑

```bash
$ claude "新建 server/services/notificationService.ts：
   实现以下方法：
   - createNotification(userId, type, title, content, relatedId?)
   - getUserNotifications(userId, page, limit) -- 分页，按时间倒序
   - markAsRead(notificationId, userId) -- 标记已读，要验证 userId
   - markAllAsRead(userId) -- 全部标记已读
   - getUnreadCount(userId) -- 获取未读数量

   错误处理：通知不存在或不属于该用户时返回 null。
   参考 server/services/taskService.ts 的风格。"
```

Claude Code 写了大约 80 行代码。审查时我发现一个问题：`markAsRead` 方法里，它用了一个 `findByPk` 查通知，然后检查 userId 是否匹配。但如果直接用 `update` 加 where 条件（同时匹配 id 和 userId），只需要一次数据库查询：

```typescript
// Claude Code 的写法（两次查询）
const notification = await Notification.findByPk(id);
if (!notification || notification.userId !== userId) return null;
notification.isRead = true;
await notification.save();

// 改进后的写法（一次查询）
const [updated] = await Notification.update(
  { isRead: true },
  { where: { id, userId } }
);
return updated > 0 ? true : null;
```

这不是 bug，但是性能上的差异。我在对话里指出来让它改了。这种微优化 Claude Code 不会主动做——它倾向于写"最直观"的代码而不是"最高效"的代码。

### 对话 4：API 路由

```bash
$ claude "新建 server/routes/notifications.ts：
   路由前缀 /api/notifications
   - GET / -- 获取通知列表，支持分页 (page, limit 查询参数)
   - PATCH /:id/read -- 标记单条已读
   - PATCH /read-all -- 全部标记已读
   - GET /unread-count -- 未读数量

   所有路由需要 authMiddleware 鉴权。
   从 req.user.id 获取用户 ID。
   参考 server/routes/tasks.ts 的路由组织方式。"
```

一次成功。路由层逻辑简单，基本是调用 service 然后返回结果。

### 对话 5：注册路由

```bash
$ claude "在 server/index.ts 里注册通知路由：
   import notificationRoutes from './routes/notifications'
   app.use('/api/notifications', notificationRoutes)
   放在 taskRoutes 后面"
```

两行代码的改动，一次过。但我特意开了一次独立对话来做这件事，而不是在上一次对话里"顺便"加上。原因是：修改 server/index.ts 这种核心文件，我想保持改动的原子性——万一出问题能精确回退。

## 第三层：前端组件（对话 6-9）

### 对话 6：通知铃铛组件

```bash
$ claude "新建 client/components/NotificationBell.tsx：
   - 显示一个铃铛图标（用 lucide-react 的 Bell 图标，项目已安装）
   - 右上角显示未读数量徽标（红色圆点+数字）
   - 未读数为 0 时不显示徽标
   - 点击跳转到 /notifications 页面
   - 组件挂载时调用 GET /api/notifications/unread-count
   - 每 30 秒轮询一次（后面会改成 WebSocket，先用轮询过渡）

   样式参考 Header 组件里其他图标按钮的大小和间距。"
```

Claude Code 的产出基本可用，但轮询的实现有一个问题：它用了 `setInterval` 但没有在组件卸载时清除。我指出后它加上了 cleanup。

另外一个细节：它把未读数直接渲染在红色圆点里。当数字超过 99 时，布局会撑开。我让它加了个逻辑：超过 99 显示"99+"。这种 UI 边界情况，Claude Code 不太会主动考虑。

### 对话 7：通知列表页

这是前端最大的组件，我把需求写得尽量具体：

```bash
$ claude "新建 client/pages/NotificationsPage.tsx：
   - 页面标题"我的通知"
   - 通知列表，每条显示：类型图标、标题、内容摘要、时间
   - 未读的通知左边有蓝色竖线标记
   - 点击通知标记为已读，如果有 relatedId 则跳转到对应任务/评论
   - 顶部有"全部标记已读"按钮
   - 底部分页（用项目里已有的 Pagination 组件）
   - 空状态：显示"暂无通知"

   样式和 TaskListPage 保持一致的间距和配色。"
```

产出约 120 行。审查时发现两个问题：

1. **时间格式**：它用了 `toLocaleDateString()`，显示"2026/4/5"。但项目其他地方的时间都是"3 小时前"这种相对时间格式。我让它改用项目已有的 `formatRelativeTime` 工具函数。

2. **类型图标映射**：它用 `switch` 语句把三种通知类型映射到不同图标，但如果后续加新类型，switch 没有 default 分支。我让它加了 default 用一个通用图标。

**这两个问题都属于"和项目现有约定不一致"的范畴。** Claude Code 不会主动去了解你项目里的既有约定，除非你在 prompt 里告诉它或者在 CLAUDE.md 里写明。

### 对话 8-9：路由注册和 Header 集成

在 router.tsx 里加通知页路由，在 Header.tsx 里加铃铛组件。两次小改动，各一次对话，都一次成功。

## 第四层：联调和测试（对话 10-12）

### 对话 10：后端接口测试

```bash
$ claude "给通知相关的三个文件写测试：
   1. notificationService 的单元测试
      - createNotification：成功创建、必填字段缺失
      - getUserNotifications：分页正确、按时间倒序
      - markAsRead：成功标记、通知不存在、非本人通知
      - getUnreadCount：正确计数、已读不计入

   2. notifications 路由的集成测试
      - 未登录返回 401
      - 获取列表返回正确数据
      - 标记已读后 unreadCount 减少

   参考 server/__tests__/taskService.test.ts 的测试框架和 mock 方式。"
```

这次对话产出最多——大约 200 行测试代码。整体质量不错，但有一个典型问题：**它生成的测试数据太"干净"了。** 所有测试用的通知标题都是"Test Notification 1"、"Test Notification 2"，内容是"Test content"。这种测试数据发现不了编码、特殊字符、超长文本之类的边界问题。

我让它改了几条测试数据：加了中文标题、包含换行符的内容、超过 255 字符的长文本。这样测试才能真正覆盖到边界情况。

### 对话 11-12：联调修复

本地跑起来后发现两个问题：

1. 路由前缀多了一层：`/api/api/notifications`。原因是 server/index.ts 里已经有一个全局的 `/api` 前缀，而路由文件里又写了 `/api/notifications`。Claude Code 不知道全局前缀的存在（因为我没告诉它）。

2. 前端请求用了相对路径 `/api/notifications`，但开发环境的 proxy 配置要求请求必须走 `http://localhost:3001`。这也是项目特有的配置，Claude Code 无从得知。

这两个问题各花了一次对话修复。都不是 Claude Code 的错——是我的 prompt 里缺少了项目上下文信息。这再次证明了 [CLAUDE.md 的重要性](/m2/06-claude-md)：如果我事先在 CLAUDE.md 里写明"API 有全局前缀 /api"和"开发环境 proxy 配置"，这两个问题就不会出现。

## 最终数据

| 指标 | 数据 |
|------|------|
| 总对话次数 | 12 |
| 新增文件 | 7 |
| 修改文件 | 3 |
| 总代码行数 | 约 650 行（含测试） |
| 总耗时 | 约 3 小时 |
| 一次成功的对话 | 7/12（58%） |
| 最大的一次改动 | 测试文件（200 行） |
| 发现的集成问题 | 2 个 |

**如果不用 Claude Code**，这个功能我估计要 6-7 小时。用了之后 3 小时搞定，效率提升约 50%。省下的时间主要在模板代码（model、migration、路由、基础组件）上。花掉的额外时间主要在审查和修正上。

## 多文件协作的经验

1. **按依赖顺序从底层往上做**。先 model → service → route → 前端组件。不要让 Claude Code 同时生成互相依赖的文件，因为它可能在接口定义上出现不一致。

2. **每个文件指定一个参考文件**。"参考 XXX.ts 的风格"这句话能帮你省掉大量的风格对齐工作。项目约定、命名习惯、导出方式，它都会自动对齐。

3. **改核心文件时保持原子性**。index.ts、router.tsx 这种全局文件，每次只做一处改动。别在加路由的时候"顺便"改个什么配置。

4. **联调问题大多是上下文缺失导致的**。全局前缀、proxy 配置、环境变量——这些"项目潜规则"不告诉 Claude Code 它就不知道。写在 CLAUDE.md 里，一劳永逸。

5. **测试数据不要让 AI 自己编**。它编的测试数据太规整了，发现不了真实场景的问题。至少手动加几条包含中文、特殊字符、超长文本的测试数据。
