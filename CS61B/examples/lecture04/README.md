# 空列表也有一个固定的起点

程序先打印空列表，再向末尾加 20、向开头加 10。你会看到哨兵一直存在，但不计入元素数量。

[查看完整代码](SentinelListDemo.java) · [返回本讲笔记](../../notes/Lecture04_SLList封装与哨兵节点.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture04/SentinelListDemo.java
```

预期输出：

```text
[]，size=0
[10, 20]，size=2
```

## 按这个顺序读代码

`sentinel.next` 指向第一个真正元素；空表时它是 null。`addLast` 从哨兵向后走，空表和非空表都能走到“下一站为空”的位置。`values()` 只负责把节点内容拼成可读文字，`StringBuilder` 可以理解为逐段拼接文字的工具。这份简单实现的尾部添加仍需遍历，耗时 O(N)。

## 改一处试试

只执行 `addLast(0)`，观察列表打印 `[0]`、size 为 1。为什么这个 0 算元素，哨兵里的 0 却不算？
