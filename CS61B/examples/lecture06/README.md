# 让程序自动检查算出来的方差

运行后显示 5 组输入全部通过。它检查普通整数、空数组、重复数字、负数和小数，不需要先安装 JUnit。

[查看完整代码](VarianceDemo.java) · [返回本讲笔记](../../notes/Lecture06_测试驱动开发与方差调试.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture06/VarianceDemo.java
```

预期输出：

```text
5 组方差检查全部通过
整数除法：7
浮点除法：7.375
```

## 按这个顺序读代码

variance 按“均值 → 每个差的平方 → 平均”计算。check 把实际值与手算答案比较，不一致就用 `AssertionError` 明确报错。这里主动抛异常，不需要加 `-ea` 参数。它演示的是测试的基本思路；课堂 JUnit + Truth 的写法仍见正文。本例只处理这些有限小数值，没有加入极大浮点数溢出的数值算法。

## 改一处试试

把 `number - mean` 故意改成 `number + mean`。先猜哪组检查会报错，再运行，观察错误信息中的 expected 与 actual 对应哪个数字。
