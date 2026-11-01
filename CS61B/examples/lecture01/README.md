# 两辆车，各记各的轮子数

创建两辆车，只让第一辆损坏两个轮子。运行后第一辆剩 2 个轮子，第二辆仍有 4 个。

[查看完整代码](CarDemo.java) · [返回本讲笔记](../../notes/Lecture01_Java入门与对象.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture01/CarDemo.java
```

预期输出：

```text
小红剩余轮子：2
小蓝剩余轮子：4
```

## 按这个顺序读代码

两个 `new Car(...)` 创建两个对象，所以它们各有一份 `wheels`。`first.damage(2)` 只修改 first 指向的车。这里 Car 前的 `static` 让这个内部类可以单独创建，不代表所有车共用轮子数。

## 改一处试试

在打印前加上 `second.damage(1)`。先预测两行输出，再运行。
