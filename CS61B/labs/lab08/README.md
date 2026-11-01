# Lab 08：实现并评测 MyHashMap

[官方题目](https://sp24.datastructur.es/labs/lab08/) · [题目快照](official.html) · [FAQ 快照](faq.html) · [起始代码](starter/) · [环境配置](../README.md)

以下为中文实验导引，原始英文规格与 starter 保留供核对。同步日期 2026-11-01；未填写解答，也未修改官方测试。

## 本实验要学会什么

将 Lecture 19 的“哈希 → 分桶 → 比较键 → 控制负载”实现成泛型 Map。重点是契约、冲突正确性、扩容和可替换的桶结构。

开始前先读 [Map61B.java](starter/src/hashmap/Map61B.java) 和 [MyHashMap.java](starter/src/hashmap/MyHashMap.java)。当前 starter 故意缺少接口方法，不能直接编译；这属于练习内容，不是下载损坏。

## 按依赖顺序实现

1. 补全字段和三个构造器：无参、initialCapacity、initialCapacity + loadFactor。官方默认 **16 个桶、最大负载 0.75**。
2. 实现桶创建方式。保持 `Collection<Node>[] buckets`，通过 `createBucket()` 创建每个桶，让测试可以通过子类替换桶类型。
3. 实现 get、containsKey、size，再实现 put 的已有键更新和新键插入。
4. 实现增长与重分桶，保持 size 等于键值映射数量。
5. 实现 clear。对本次不做的可选方法，按接口声明提供抛 UnsupportedOperationException 的方法体，确保类满足接口。
6. 基本功能通过后，再运行不同桶类型测试和速度实验。

上述顺序是中文学习建议；方法语义以官方接口和题目为准。

## 必须保持的约束

- Node 保存 key/value；同一键再次 put 是更新值，不增加 size。
- 冲突键可以有相同 hashCode，仍必须按 equals 区分。不同对象也可能表示同一个键。
- 正容量 M 下可用 `Math.floorMod(key.hashCode(), M)` 得到合法下标；直接 `%` 可能返回负数。
- 负载按浮点计算，不要使用被截断的整数除法；新增键导致超阈值时按几何方式增长。
- 扩容要按**新容量**重新计算每个键的桶，不能仅复制旧桶数组。搬运已有条目时不要把 size 再累计一遍。
- 题目假设不会插入 null key。Map 接口的缺失键返回 null；若允许 null value，containsKey 应检查键是否存在，不能简单等同 `get(key) != null`。
- clear 后 size 为 0，旧映射不可访问，之后仍能正常插入。

## 桶只依赖 Collection 的能力

默认可以选择 LinkedList，但不能把所有桶硬编码为 LinkedList 后调用专有方法。官方测试会覆盖 ArrayList、LinkedList、HashSet、Stack、ArrayDeque 等桶实现，检验你的算法是否仅依赖 Collection 约定的插入与遍历等能力。

数组创建也有泛型限制：不能直接 `new Collection<Node>[capacity]`。按课程方式创建再处理 unchecked 警告；不要把泛型问题误诊断为哈希算法问题。

## 测试顺序

| 阶段 | 入口 | 重点 |
|---|---|---|
| 功能 | [TestMyHashMap](starter/tests/hashmap/TestMyHashMap.java) | 插入、更新、查询、clear、泛型、扩容、边界 |
| 桶兼容性 | [TestMyHashMapBuckets](starter/tests/hashmap/TestMyHashMapBuckets.java) | 更换桶容器后行为仍正确 |
| 可选功能 | [TestMyHashMapExtra](starter/tests/hashmap/TestMyHashMapExtra.java) | 按本次实现的可选接口运行 |
| 随机插入 | [InsertRandomSpeedTest](starter/tests/speed/InsertRandomSpeedTest.java) | 对比 MyHashMap、ULLMap、Java HashMap |
| 有序插入 | [InsertInOrderSpeedTest](starter/tests/speed/InsertInOrderSpeedTest.java) | 对比另一种输入分布 |
| 桶比较 | [BucketsSpeedTest](starter/tests/speed/BucketsSpeedTest.java) | 观察不同桶结构的实际速度 |

不要先运行速度测试来绕过功能错误。官方自带测试既有 JUnit 4，也有 JUnit 5，依赖见[环境说明](../README.md)。

## 记录真实结果，不把复杂度结论当基准数字

将运行环境、输入规模、各实现时间和简短观察填入 [src/results.txt](starter/src/results.txt)。官方不规定必须有多少数据点，但应能体现你实际进行了实验。

可按下面的空表收集，再整理到 results.txt：

| 输入模式 | 元素数 | 桶实现 | 用时 | 观察 |
|---|---|---|---|---|
| 随机 / 有序 | 待实测 | 待选择 | 待实测 | 待记录 |

一次更快不等于证明渐近复杂度更好。输入分布、JIT、桶内查找及测试噪声都可能影响观察；结合负载和碰撞解释结果。

## 必做与可选的版本差异

核心功能、桶兼容性与 results.txt 是本实验主线。remove、keySet、iterator 属于可选实现；若不做也须提供对应声明的异常方法体，以便编译。

官方页面可选段还提到 `remove(K key, V value)`，但本次固定版本的 Map61B 接口只声明 `remove(K key)`。因此以已同步接口和测试的实际签名为准，不要凭其他学期的教程强加不匹配的方法要求。

完成后应能解释：为什么重分桶必须重算下标、为什么更新键不增加 size，以及期望摊还 O(1) 需要哪些条件。

[返回实验索引](../README.md)
