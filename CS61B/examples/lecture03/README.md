# 改数组里的数，和改为指向另一个数组

运行后 a 与 b 都显示 [9, 2]，但方法内部最后打印 [7, 8]。这不是矛盾：方法换掉的是自己的参数引用。

[查看完整代码](ReferenceDemo.java) · [返回本讲笔记](../../notes/Lecture03_引用按值传递与IntList.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture03/ReferenceDemo.java
```

预期输出：

```text
方法里面：[7, 8]
a：[9, 2]
b：[9, 2]
同一个数组：true
```

## 按这个顺序读代码

调用前 a、b 都找到 `[1,2]`。调用时参数 numbers 收到同一引用的副本，改 `numbers[0]` 就改到了共享数组。随后 `numbers = new ...` 只改变参数指向哪里，没有给外面的 a、b 重新赋值。这就是 Java 按值传递在引用类型上的表现。

## 改一处试试

把 `numbers[0] = 9` 移到 `numbers = new int[] {7,8}` 后面。外面的 a、b 还会变吗？
