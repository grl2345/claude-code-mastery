---
title: "数据工程与 AI 辅助开发"
module: "m3-practice"
order: 8
group: "进阶实战"
description: "使用 Claude Code 处理 ETL 流水线、数据清洗脚本和 SQL 查询优化, 提升数据工程效率"
duration: "30 分钟"
level: "需编程基础"
publishedAt: 2026-03-26
updatedAt: 2026-04-08
---

# 数据工程与 AI 辅助开发

数据工程师的日常充满了重复性工作: 写 ETL 脚本、清洗脏数据、优化慢查询。Claude Code 可以大幅加速这些任务。本文通过真实场景演示如何将 Claude Code 融入数据工程工作流。

---

## 一、ETL 流水线开发

### 1.1 用 Claude Code 快速搭建 ETL 框架

假设你需要从多个数据源提取数据, 转换后加载到数据仓库。传统做法是手写大量样板代码, 现在可以这样做:

```
提示词:
创建一个 Python ETL 框架, 包含以下组件:
1. 数据源连接器: 支持 PostgreSQL、MySQL、CSV 文件
2. 转换层: 支持链式调用的数据转换管道
3. 加载器: 支持写入 PostgreSQL 和生成 Parquet 文件
4. 日志和错误处理
使用 dataclasses 定义配置, 不使用 ORM
```

Claude Code 会生成结构清晰的代码。以下是一个典型的输出结构:

```
etl/
  __init__.py
  config.py         # 数据源和目标的配置
  extractors/
    __init__.py
    postgres.py      # PostgreSQL 提取器
    mysql.py         # MySQL 提取器
    csv_reader.py    # CSV 文件提取器
  transformers/
    __init__.py
    pipeline.py      # 转换管道
    common.py        # 通用转换函数
  loaders/
    __init__.py
    postgres.py      # PostgreSQL 加载器
    parquet.py       # Parquet 文件写入器
  utils/
    __init__.py
    logging.py       # 日志配置
    retry.py         # 重试机制
```

### 1.2 具体的 ETL 任务提示词

**从 API 提取数据并写入数据库:**

```
写一个脚本, 从 https://api.example.com/users 分页拉取所有用户数据,
每页 100 条, 转换日期格式为 ISO 8601, 去除空值字段,
批量插入 PostgreSQL 的 warehouse.users 表。
要求:
- 使用 httpx 做异步请求
- 使用 psycopg 做批量插入
- 处理 API 限流 (429 状态码)
- 记录每批次的处理时间和数量
```

**增量同步:**

```
修改 etl/extractors/postgres.py, 添加增量提取功能:
- 基于 updated_at 字段做增量
- 记录上次同步的时间戳到 sync_state 表
- 支持全量和增量两种模式
- 添加数据一致性校验 (源端和目标端 count 对比)
```

### 1.3 Airflow DAG 生成

```
为以下 ETL 流程生成 Airflow DAG:
1. 每天凌晨 2 点执行
2. 先从 3 个数据源并行提取数据
3. 提取完成后执行数据转换
4. 转换完成后加载到数据仓库
5. 加载完成后触发 dbt 模型刷新
6. 任何步骤失败发送 Slack 通知
使用 TaskFlow API 风格
```

---

## 二、数据清洗实战

### 2.1 识别数据质量问题

将数据样本提供给 Claude Code, 让它帮你识别问题:

```
读取 data/sample.csv 的前 100 行, 分析数据质量问题:
- 缺失值分布
- 异常值检测
- 格式不一致
- 重复记录
- 编码问题
输出一份数据质量报告
```

### 2.2 常见清洗任务

**地址标准化:**

```
写一个 Python 函数 normalize_address(raw_address: str) -> dict,
将中文地址解析为结构化数据:
- province: 省
- city: 市
- district: 区
- street: 街道
- detail: 详细地址
处理以下情况:
- "北京市朝阳区建国路88号" -> 正常解析
- "广东深圳南山区科技园" -> 补全"省"和"市"
- "上海浦东新区" -> 识别直辖市
```

**日期格式统一:**

```
写一个函数 parse_date(date_str: str) -> datetime, 能处理以下格式:
- 2024-01-15
- 2024/01/15
- 20240115
- Jan 15, 2024
- 15-Jan-2024
- 2024年1月15日
无法解析时返回 None 并记录日志, 不要抛异常
```

**手机号清洗:**

```
写一个函数 clean_phone(phone: str) -> str:
- 去除空格、横线、括号
- 去除国际区号 (+86, 0086)
- 验证是否为有效的 11 位手机号
- 无效号码返回空字符串
添加单元测试覆盖各种边界情况
```

### 2.3 用 Pandas 做批量清洗

```
读取 scripts/clean_orders.py, 优化以下清洗逻辑:
1. 现在用 for 循环逐行处理, 改成向量化操作
2. 日期列有 3 种格式混用, 统一为 datetime
3. 金额列有些是字符串 "1,234.56", 有些是数值, 统一为 float
4. 去除 order_id 重复的行, 保留最新的记录
5. 添加数据清洗前后的统计对比 (行数、空值率等)
```

### 2.4 大数据量清洗策略

当数据量很大时, 让 Claude Code 帮你选择合适的工具:

```
我有一个 50GB 的 CSV 文件需要清洗, 服务器内存 16GB。
帮我设计清洗方案:
- 不能一次加载到内存
- 需要去重 (基于 3 个字段组合)
- 需要关联另一个 2GB 的维度表
- 清洗后输出为 Parquet 格式, 按日期分区
给出使用 DuckDB 和 Polars 两种方案的对比
```

---

## 三、SQL 查询优化

### 3.1 慢查询分析

把慢查询和执行计划直接贴给 Claude Code:

```
以下 SQL 在 PostgreSQL 中执行需要 45 秒, 帮我优化:

SELECT o.order_id, o.created_at, u.name, u.email,
       SUM(oi.quantity * oi.price) as total_amount
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= '2024-01-01'
  AND o.status = 'completed'
  AND u.country = 'CN'
GROUP BY o.order_id, o.created_at, u.name, u.email
HAVING SUM(oi.quantity * oi.price) > 1000
ORDER BY total_amount DESC
LIMIT 100;

表信息:
- orders: 5000 万行, 有 created_at 和 status 的单独索引
- users: 500 万行, 有 id 主键索引
- order_items: 2 亿行, 有 order_id 索引

EXPLAIN ANALYZE 输出:
[粘贴执行计划]
```

Claude Code 通常会给出以下类型的优化建议:

- 添加复合索引
- 改写 JOIN 顺序
- 使用 CTE 或子查询预过滤
- 分区表建议
- 物化视图方案

### 3.2 索引优化

```
分析 schema.sql 中所有表的定义和现有索引,
结合 slow_queries.log 中的慢查询,
给出索引优化建议:
1. 哪些索引是冗余的, 可以删除
2. 哪些查询需要新建索引
3. 哪些索引应该改为复合索引
4. 给出创建和删除索引的 SQL, 按优先级排序
```

### 3.3 复杂查询编写

数据分析中经常需要写复杂的 SQL, Claude Code 可以大幅加速:

```
写一个 SQL 查询, 计算用户留存率:
- 基表: events (user_id, event_name, created_at)
- 计算每个注册日期 (event_name = 'signup') 的用户,
  在第 1、7、14、30 天的留存率
- 输出格式: cohort_date, cohort_size, d1, d7, d14, d30
- 数据库: PostgreSQL
- 注意时区处理, 统一用 UTC
```

### 3.4 SQL 重构

```
重构 reports/monthly_revenue.sql:
1. 当前是一个 300 行的单一查询, 拆分为多个 CTE
2. 每个 CTE 添加注释说明业务含义
3. 抽取重复的过滤条件为变量
4. 添加数据验证 (比如确保金额非负)
5. 保持查询结果一致, 提供验证方法
```

---

## 四、数据建模辅助

### 4.1 维度建模

```
我有以下业务需求:
- 电商平台, 需要分析销售数据
- 维度: 时间、商品、用户、地区、渠道
- 度量: 销售额、订单数、客单价、退款率

帮我设计星型模型:
1. 事实表 fact_sales 的字段和粒度
2. 各维度表的字段
3. 缓慢变化维度的处理策略 (商品价格、用户等级会变)
4. 生成 PostgreSQL 建表 DDL
5. 生成示例数据插入语句
```

### 4.2 数据血缘分析

```
读取 dbt/models/ 目录下所有 .sql 文件,
分析数据血缘关系:
1. 每个模型依赖哪些源表和其他模型
2. 绘制依赖图 (用 Mermaid 格式)
3. 找出没有被任何模型引用的孤立表
4. 找出依赖链最长的路径
```

---

## 五、数据管道监控

### 5.1 数据质量检查脚本

```
为 warehouse 库的核心表创建数据质量检查脚本:

检查项:
- 每日新增数据量是否在正常范围 (均值正负 3 个标准差)
- 关键字段空值率是否突增
- 主键是否唯一
- 外键引用完整性
- 金额字段是否有负值或异常大值
- 日期字段是否有未来日期

输出格式: JSON, 包含检查项、状态、详情
异常时发送告警到指定 webhook
```

### 5.2 ETL 性能监控

```
在现有 ETL 脚本中添加性能监控:
1. 每个步骤的开始时间、结束时间、耗时
2. 处理的数据行数
3. 内存使用峰值
4. 输出到 Prometheus 格式的 metrics
5. 执行时间超过阈值时告警
使用 Python 装饰器实现, 对现有代码侵入最小
```

---

## 六、实用技巧

### 6.1 让 Claude Code 读懂你的数据

提供足够的上下文, Claude Code 才能给出好的建议:

```
好的做法:
- 提供表结构 (DDL 或 schema 文件)
- 说明数据量级
- 说明业务背景
- 提供样本数据
- 说明当前的性能瓶颈

差的做法:
- 只贴一段 SQL 让它优化, 不给表结构
- 不说明数据量, 导致建议不适用于实际规模
- 不说业务背景, 导致建议与需求不符
```

### 6.2 分步处理复杂任务

大型 ETL 项目不要一次性让 Claude Code 生成所有代码:

```
第一轮: 设计整体架构和数据流
第二轮: 实现提取层
第三轮: 实现转换层
第四轮: 实现加载层
第五轮: 添加错误处理和监控
第六轮: 编写测试
```

### 6.3 利用 MCP 连接数据库

配置 PostgreSQL MCP Server 后, Claude Code 可以直接查询数据库:

```
查看 public.orders 表的结构和索引
统计最近 30 天每天的订单量
找出执行时间最长的 10 个查询
```

这比手动复制粘贴查询结果效率高很多。

### 6.4 数据迁移脚本

```
写一个从 MySQL 到 PostgreSQL 的数据迁移脚本:
- 自动转换数据类型映射
- 处理 MySQL 特有的语法 (如 ENUM, UNSIGNED)
- 支持断点续传 (记录迁移进度)
- 迁移后验证数据一致性 (行数、校验和)
- 使用 COPY 命令批量加载, 而不是逐行 INSERT
```

---

## 七、总结

Claude Code 在数据工程中的最佳应用场景:

| 场景 | 效率提升 | 适用条件 |
|------|---------|---------|
| ETL 脚本编写 | 3-5 倍 | 提供清晰的数据源和目标描述 |
| 数据清洗 | 2-4 倍 | 提供样本数据和清洗规则 |
| SQL 优化 | 2-3 倍 | 提供表结构和执行计划 |
| 数据建模 | 2-3 倍 | 说明业务需求和分析维度 |
| 监控脚本 | 3-5 倍 | 定义检查项和告警规则 |

关键原则: 提供充分的上下文 (表结构、数据量、业务背景), Claude Code 就能给出高质量的数据工程方案。
