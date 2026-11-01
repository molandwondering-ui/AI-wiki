# Lecture 4：SLList封装与哨兵节点

**改善数据结构不只是在循环里提速，还包括让使用者更容易正确使用它。** 本讲把暴露节点的 IntList 逐步改造成 SLList：隐藏节点、缓存长度，再用哨兵统一空表和非空表。

来源：CS61B Spring 2024，B 站 P15（不是第 15 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15) · [官方幻灯片](../slides/Lecture04.pdf) · [画面与原始字幕](../transcripts/Lecture04_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 裸链表让使用者承担了过多内部细节

IntList 要求使用者知道 first、rest 和 null，还允许外部直接修改链接。想添加一个元素时，调用者需要操作引用；一旦把节点连回自己，就会让遍历永远无法结束。

第一步把真正节点改名为 `IntNode`，字段改为 `item`、`next`，再增加 `SLList` 作为面向用户的列表对象。改名本身不改变算法，但明确了角色：节点是内部材料，SLList 是对外使用的数据结构。

![IntList 的裸递归表示把节点结构直接暴露给使用者。](assets/lecture04/00120.webp)

*课堂画面：[回看 02:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=120)。IntList 的裸递归表示把节点结构直接暴露给使用者。*

## 2. 包装类提供稳定的列表入口

最初的包装形式可理解为：

```java
public class SLList {
    private IntNode first;
    public SLList(int x) { first = new IntNode(x, null); }
    public void addFirst(int x) { first = new IntNode(x, first); }
    public int getFirst() { return first.item; }
}
```

这是尚未加入哨兵的中间版本，假设 IntNode 已定义。调用端可以写 `L.addFirst(10)`，不必亲自重接节点。L 指向的 SLList 包装对象不变，内部 first 可以随着操作改变。

因此“列表本身的引用”和“第一个节点的引用”成为两个层次。这也是之后缓存 size、替换实现的基础。

![SLList 在使用者与节点之间增加一层稳定接口。](assets/lecture04/00660.webp)

*课堂画面：[回看 11:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=660)。SLList 在使用者与节点之间增加一层稳定接口。*

## 3. private 限制外部代码破坏内部结构

把 first 设为 private，外部就不能随意写 `L.first.next = ...`。添加、删除等操作通过公开方法完成，结构约束集中由 SLList 维护。

好处有两个：使用者要理解的东西减少；实现者以后可以改变内部表示，只要公开操作仍然满足原先约定。课堂用方向盘和油路类比：驾驶者需要操作方向盘，不需要直接改变油路。

private 是语言层面的访问控制，不代表字段从对象或字节码中消失，也不是抵御所有反射等机制的安全边界。这里关心的是正常程序设计中的封装。

![公开接口与私有表示帮助维护抽象边界。](assets/lecture04/00840.webp)

*课堂画面：[回看 14:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=840)。公开接口与私有表示帮助维护抽象边界。*

## 4. 嵌套节点类让实现细节留在使用它的地方

IntNode 若只用于 SLList，就可以嵌套在 SLList 内部：

```java
private static class IntNode {
    int item;
    IntNode next;
    IntNode(int i, IntNode n) { item = i; next = n; }
}
```

`private` 表示这是内部辅助类型；`static` 嵌套类不需要隐含持有某个外层 SLList 实例。它仍能创建很多不同节点，每个节点都有自己的 item 和 next。

不要把静态嵌套类误解为“全世界只有一个节点”，也不要把它与 static 方法混为一谈。是否需要访问外层实例，是这里判断 static 的主要依据。

![IntNode 嵌套进 SLList，使节点表示保持在实现内部。](assets/lecture04/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=1380)。IntNode 嵌套进 SLList，使节点表示保持在实现内部。*

## 5. 递归辅助方法把内部算法与公开接口分开

SLList 自己不再是递归节点，不能直接写原先的 `rest.size()`。可以让公开 `size()` 委托给接收节点的私有辅助方法，由辅助方法沿 next 递归。

`size()` 与 `size(IntNode p)` 参数列表不同，属于重载。公开方法决定从哪里开始，内部方法负责怎样计算。为兼容空表，辅助方法可把 `p == null` 作为返回 0 的基例；这比仅处理“最后节点”的写法更一般。

末尾添加也遵循类似过程：游标一直移动到尾节点，然后修改 `p.next`。只写 `p = new IntNode(...)` 改的是局部游标，并没有把新节点接入链表。

![公开 size 可以委托给接收节点的私有递归辅助方法。](assets/lecture04/01920.webp)

*课堂画面：[回看 32:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=1920)。公开 size 可以委托给接收节点的私有递归辅助方法。*

## 6. 缓存 size 用更新成本换取常数时间查询

每次查询都遍历一遍链表，在频繁查询时很浪费。增加一个整数 size，在添加时递增、删除时递减，查询就只返回字段。

这里增加了一条必须长期维护的不变量：**size 等于真实元素数**。不变量是每个公开操作完成后都应成立的约束。缓存并不是免费的优化：忘记在某个修改分支更新计数，会得到结构正确但长度错误的状态。

`getFirst`、`size` 这类只读操作不应改变计数。修改操作应在实际修改成功时同步更新，而不是随意在入口处加减。

![缓存长度以后，size 查询不再扫描节点。](assets/lecture04/02100.webp)

*课堂画面：[回看 35:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=2100)。缓存长度以后，size 查询不再扫描节点。*

## 7. 空列表暴露了原先代码的特殊情况

用 `first = null, size = 0` 表示空表很自然，但原来的 addLast 一开始就读取 `p.next`；当 p 为 null 时直接异常。可以专门写空表分支，然而每个操作都可能不断积累类似判断。

此时要问的不是“还能再加几个 if”，而是“能否改变表示，让更多情况共享一条路径”。哨兵节点就是为这个目标服务：始终保留一个不代表用户元素的节点。

![支持零元素列表后，必须重新检查原先依赖 first 非空的代码。](assets/lecture04/02280.webp)

*课堂画面：[回看 38:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=2280)。支持零元素列表后，必须重新检查原先依赖 first 非空的代码。*

## 8. 哨兵统一链接操作，但不替代空表的接口约定

最终表示为：`sentinel → 第一个真实节点 → ... → null`。空表是 `sentinel.next == null`，sentinel 自己始终存在，item 的值不参与列表内容。

```java
public void addFirst(int x) {
    sentinel.next = new IntNode(x, sentinel.next);
    size++;
}
public void addLast(int x) {
    IntNode p = sentinel;
    while (p.next != null) p = p.next;
    p.next = new IntNode(x, null);
    size++;
}
```

空表时循环直接结束，把新节点接在哨兵后即可；非空时同样找到尾节点再接上。需保持三条不变量：哨兵存在；首个真实元素在 sentinel.next；size 不计入哨兵。

但空表 `getFirst()` 仍然没有可返回的真实元素。补充：应明确抛异常或其他约定，不能把哨兵的假值当成正常结果。

![从永不为空的哨兵出发，addLast 不再需要单独处理空表。](assets/lecture04/02820.webp)

*课堂画面：[回看 47:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15&t=2820)。从永不为空的哨兵出发，addLast 不再需要单独处理空表。*

## 动手检查理解

1. 画出空表、一个元素、两个元素三种哨兵结构。
2. 说明 `p = new IntNode(...)` 与 `p.next = new IntNode(...)` 为什么不同。
3. 连续进行空表 addLast、addFirst、size 查询，逐步检查三个不变量。
4. 继续看第 5 讲，思考为什么仅加 last 引用仍不能快速删除尾节点。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/4.-sllists)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture04.srt)
