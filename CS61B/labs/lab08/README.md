# Lab 08：自己做一个能按名字查值的 HashMap

[官方题目](https://sp24.datastructur.es/labs/lab08/) · [本地题目](official.html) · [本地 FAQ](faq.html) · [练习代码](starter/) · [第一次打开与配置环境](../README.md)

下面按实际操作顺序说明怎么做。原始题目、代码和测试均保留，具体要求可随时对照官方材料。整理日期：2026-11-01。

## 这次做什么

想象你要保存“用户名 → 手机号”。put 存入或更新，get 根据用户名查手机号，containsKey 判断是否存在，size 告诉你保存了多少个用户名。这个实验要你自己实现这些操作。

先跑[哈希冲突的小例子](../../examples/lecture19/README.md)，看看 Java 自带 HashMap 怎么用，再读第 19 讲理解分桶。实验中要做的是自己的 MyHashMap。

打开 [Map61B.java](starter/src/hashmap/Map61B.java) 看各方法的要求，再看 [MyHashMap.java](starter/src/hashmap/MyHashMap.java)。起始代码故意没有补齐接口方法，一开始不能编译是正常状态。

## 第一步：先把需要保存的东西想清楚

每条记录有 key 和 value，比如用户名和手机号。Node 保存一条记录，桶保存被分到同一位置的多条记录，数组管理所有桶。除此之外，还需要记住当前有多少条记录，以及桶多挤时需要扩容。

补全三个构造器：不传参数、指定 initialCapacity、指定 initialCapacity 与 loadFactor。默认是 **16 个桶、最大负载 0.75**。负载就是“记录数除以桶数”；计算时要保留小数。

桶数组按题目使用 `Collection<Node>[] buckets`，每个桶通过 `createBucket()` 创建。暂时可以用 LinkedList 作桶，但外面只依赖 Collection 提供的添加、遍历等操作。

## 第二步：先能找到，再能放进去

给定一个 key，先算它该去哪一桶，再逐条用 equals 核对桶里的键。不同键可能落在同一桶，不能仅凭 hashCode 相同就认定找到了。

对正桶数 M，可以用 `Math.floorMod(key.hashCode(), M)` 得到下标。直接使用 `%` 可能得到负数，不适合作数组下标。

可以先写 size、get、containsKey，然后写 put：找到原来的键就更新 value，没有找到才增加记录和 size。为了逐步编译，可先补齐其他接口方法的声明，用明确的临时异常标出尚未实现处，再逐个完成；不要把必做方法一直留成空实现。

例如先 `put("Lin", "号码A")`，再 `put("Lin", "号码B")`，最后只应有一条记录，查询得到号码 B。自己写测试验证这个行为。

题目假设不会插入 null key。缺失键的 get 返回 null；如果 value 允许为 null，仅凭 get 返回 null 就不能确定没有这个键，所以 containsKey 要实际检查键。

## 第三步：桶太挤，就增加桶并重新安排所有记录

新增键后，如果负载超过阈值，就按倍数增加桶数。旧元素也要按**新的桶数**重新算下标。例如键 20，模 4 在桶 0，模 8 在桶 4；只复制旧桶不会得到正确新位置。

搬运记录时，别把 size 再加一遍：记录只是换位置，没有新增。扩容后要逐条查回已有键，验证值和数量都没变。

再实现 clear：清除所有记录，size 归零，旧键查不到，之后仍可以正常插入。

## 第四步：换一种桶，操作也应该正确

官方测试会把桶换成 ArrayList、LinkedList、HashSet、Stack、ArrayDeque 等。如果代码把桶写死成 LinkedList 并调用专有方法，换一种就会出问题。因此使用 createBucket，把“桶怎么创建”和“怎样在桶里查键”分开。

泛型数组不能直接写 `new Collection<Node>[capacity]`。这里会遇到第 7 讲的数组创建限制，可按课程方式创建并处理类型转换警告；这与分桶逻辑是两个问题。

## 第五步：先测功能，再测速度

| 先后 | 运行入口 | 看什么 |
|---|---|---|
| 1 | [TestMyHashMap](starter/tests/hashmap/TestMyHashMap.java) | 能否插入、更新、查询、清空，扩容后是否丢数据 |
| 2 | [TestMyHashMapBuckets](starter/tests/hashmap/TestMyHashMapBuckets.java) | 换桶的容器类型后是否仍正确 |
| 可选 | [TestMyHashMapExtra](starter/tests/hashmap/TestMyHashMapExtra.java) | 你选做的额外操作是否实现正确 |
| 3 | [InsertRandomSpeedTest](starter/tests/speed/InsertRandomSpeedTest.java) | 随机插入时 MyHashMap、ULLMap、Java HashMap 的速度 |
| 4 | [InsertInOrderSpeedTest](starter/tests/speed/InsertInOrderSpeedTest.java) | 按顺序插入时的速度 |
| 5 | [BucketsSpeedTest](starter/tests/speed/BucketsSpeedTest.java) | 换不同桶容器后，速度怎样变化 |

JUnit 4/5 的依赖已经保存，添加方式见[环境说明](../README.md)。有功能错误时先修好它；错误程序跑得再快，也没有完成题目。

## results.txt 填什么

把实际测得的数据写进 [results.txt](starter/src/results.txt)：电脑与 Java 环境、输入数量、使用哪种实现、耗时，以及你观察到的差异。可以先用下面的空表记录，再整理进文件。

| 输入方式 | 元素数 | 实现或桶类型 | 实测时间 | 观察 |
|---|---|---|---|---|
| 随机 / 有序 | 待填写 | 待填写 | 待运行 | 待填写 |

不要根据“O(1) 应该很快”自己填一个时间。一次更快也不能证明所有规模都更快；输入、冲突、Java 运行时优化和测量波动都会影响数字。结合负载和数据量解释你实际看到的变化。

## 哪些可选，哪些必须有

主线是基本功能、换桶测试与速度记录。remove、keySet、iterator 可选做；不做时仍需提供对应方法，并抛出 UnsupportedOperationException，明确表示这个操作暂不支持。否则类缺少接口要求的方法，仍然不能编译。

官方网页还提到 `remove(K key, V value)`，但本次保存的接口只声明 `remove(K key)`。以本地 Map61B 和测试的实际签名为准，不用照其他学期的教程加上不匹配的要求。

做完后试着解释三个问题：同一个键再次 put 为什么不增加 size？为什么扩容要重新算下标？为什么哈希表很快仍然需要“分布合理、负载受控”等条件？

[返回实验索引](../README.md)
