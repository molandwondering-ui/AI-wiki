# Aa 和 BB 哈希值相同，为什么还能分别查出来

程序使用 Java 自带 HashMap 存两条记录。虽然两把键的 hashCode 都是 2112，它们仍分别保存；再次放入内容为 Aa 的新字符串，只更新原值。

[查看完整代码](HashCollisionDemo.java) · [返回本讲笔记](../../notes/Lecture19_哈希表从分桶到常数时间.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture19/HashCollisionDemo.java
```

预期输出：

```text
两个哈希值：2112 / 2112
键是否相等：false
分别查询：奶茶 / 咖啡
更新后：少糖奶茶，size=2
缺失的键：null
负数取余：-1
合法桶下标：3
最小整数的绝对值：-2147483648
```

## 按这个顺序读代码

哈希相同只是候选位置相同，还需要 equals 判断是不是原来的键。`new String("Aa")` 创建新对象，但内容仍等于原键，因此更新值后 size 仍为 2。`floorMod` 在桶数为正时可得到合法下标；不能一概用 abs 修复负哈希值，因为最小 int 的绝对值装不进 int。这里使用标准库观察行为，没有代写 Lab 08 的 MyHashMap。

## 改一处试试

再插入 `orders.put("CC", "果汁")`，观察 size 和缺失键查询如何改变。然后试 `orders.put("CC", null)`：get 返回 null 时，怎样用 containsKey 区分“有这个键，值为空”和“没这个键”？
