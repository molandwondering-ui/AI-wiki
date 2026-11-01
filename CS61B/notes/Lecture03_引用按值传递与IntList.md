# Lecture 3：引用按值传递与IntList

**Java 赋值和传参都复制值；引用变量复制的是引用值，而不是它指向的整个对象。** 用这一条规则，可以统一解释对象别名、参数修改、数组以及链表。

来源：CS61B Spring 2024，B 站 P12（不是第 12 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12) · [官方幻灯片](../slides/Lecture03.pdf) · [画面与原始字幕](../transcripts/Lecture03_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 同样是 b 等于 a，复制的内容取决于变量类型

先比较两个小例子：

```java
int x = 5;
int y = x;
x = 2;                   // y 仍是 5

Walrus a = new Walrus(1000, 8.3);
Walrus b = a;
b.weight = 5;            // a 和 b 看到同一对象的新 weight
```

第一段复制整数 5，x 与 y 随后独立。第二段复制一个对象引用，于是两条引用通往同一只海象。通过 b 修改字段，会被通过 a 的读取看见。这里没有“赋值运算符对对象使用了另外一种规则”。

![海象和整数谜题的区别在于复制的是数值还是引用。](assets/lecture03/00120.webp)

*课堂画面：[回看 02:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=120)。海象和整数谜题的区别在于复制的是数值还是引用。*

## 2. 基本类型直接表示值，引用类型指向对象

Java 的八种基本类型是 `byte`、`short`、`int`、`long`、`float`、`double`、`boolean`、`char`。类类型和数组类型属于引用类型；`String`、`Integer`、`int[]` 都不等于基本类型 `int`。

为了画图，可以把变量画成盒子：整数盒子里写数字，引用盒子里画箭头。对象本身画在盒子外，内部再有字段。`int` 的值域与位数是语言规定的一部分；引用具体占多少内存则取决于 JVM 表示。

局部变量使用前必须确定已赋值；对象字段和数组元素则有默认值。不要把“局部变量不能未初始化就读”扩展为“所有变量初始都没有值”。

![基本类型和引用类型对应不同的盒子内容。](assets/lecture03/00660.webp)

*课堂画面：[回看 11:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=660)。基本类型和引用类型对应不同的盒子内容。*

## 3. new 创建对象，null 表示没有对象可访问

`Walrus w;` 只声明变量，`w = new Walrus(...)` 才创建对象并保存引用，`w = null` 则把引用改为“没有对象”。执行 `w.weight` 之前必须有实际对象，否则会出现空指针异常。

课堂把引用比作地址，这有助于理解“保存通往对象的线索”。但 Java 程序不能把一般对象引用当成整数地址任意做加减。图上的箭头是理解工具，不是可直接操作的裸内存地址。

还要分清 `w`、w 指向的对象和对象的字段。一次赋值到底修改哪个盒子，是后续所有图解题的核心。

![声明引用变量不等于创建了一个 Walrus 对象。](assets/lecture03/01020.webp)

*课堂画面：[回看 17:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=1020)。声明引用变量不等于创建了一个 Walrus 对象。*

## 4. 别名共享对象，重新赋值只改变自己的箭头

执行 `b = a` 后，a 和 b 是同一对象的两个别名。接下来有两种完全不同的操作：

```java
b.weight = 5;                 // 沿箭头走过去，修改对象内部
b = new Walrus(2000, 9.0);     // 修改 b 自己的箭头
```

第二行后，a 仍指向原对象，b 指向新对象。给 b 重新赋值不会“顺便把 a 也改过去”。画图时先画新对象，再擦掉 b 的旧箭头，最后画 b 的新箭头，就不会混淆。

反过来，如果对象内部还有引用字段，修改该字段会改变共享对象的一部分；所以分析链表时要把每个字段也当作独立盒子。

![两条引用可以指向一个对象，但变量本身仍是两份存储位置。](assets/lecture03/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=1380)。两条引用可以指向一个对象，但变量本身仍是两份存储位置。*

## 5. 方法参数也只是收到值的副本

下面是依据课堂规则补充的小例子：

```java
static void change(int[] a) {
    a[0] = 9;
    a = new int[] {7};
}
// 调用端：
int[] x = {1};
change(x);              // 返回后 x[0] 是 9
```

进入方法时，参数 a 收到 x 中引用值的副本，因此 `a[0] = 9` 修改的是共同指向的数组。随后 `a = ...` 仅改了方法内的参数变量，调用端 x 的箭头没有改变。

所以 Java 仍然是**按值传递**。说“对象按引用传递”容易让人误以为能在方法里替换调用者的变量；更准确的说法是“按值传递一个对象引用”。

![赋值与参数传递遵守同一条复制值规则。](assets/lecture03/01560.webp)

*课堂画面：[回看 26:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=1560)。赋值与参数传递遵守同一条复制值规则。*

## 6. 数组也是对象，数组变量也会形成别名

`int[] a = new int[] {0,1,2,95,4}` 分配一个数组对象，并把引用赋给 a。`int[] b = a` 不复制数组元素，只复制引用。

若想得到独立数组，需要另外分配空间并复制元素。即使做了数组复制，元素若是对象引用，也不自动复制所指向的对象；这就是后面“浅拷贝”的来源。

数组的长度属于数组对象；数组变量可以改指向另一个长度的数组。这个区别会在第 7 讲的扩容中成为关键。

![数组的声明与数组对象的实例化同样是两个步骤。](assets/lecture03/01740.webp)

*课堂画面：[回看 29:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=1740)。数组的声明与数组对象的实例化同样是两个步骤。*

## 7. 链表节点把一个值与剩余列表的引用放在一起

最小的 IntList 可以这样定义：

```java
public class IntList {
    public int first;
    public IntList rest;
    public IntList(int f, IntList r) {
        first = f;
        rest = r;
    }
}
```

链表 5 → 10 → 15 → null 的第一个节点保存 5，rest 指向保存 10 的节点。最后节点的 rest 为 null。rest 保存的是引用，不会把一个完整列表直接塞进另一个对象导致无限大的对象。

从尾部向前构造尤其自然：

```java
IntList L = new IntList(15, null);
L = new IntList(10, L);
L = new IntList(5, L);
```

每一步先用旧 L 作为新节点的 rest，再把 L 改为新节点的引用。

![每个 IntList 节点都保存 first 和指向后续节点的 rest。](assets/lecture03/02100.webp)

*课堂画面：[回看 35:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=2100)。每个 IntList 节点都保存 first 和指向后续节点的 rest。*

## 8. 递归和迭代都在沿 rest 访问同一条链

对非空、无环列表，递归长度可以写为：

```java
public int size() {
    if (rest == null) return 1;
    return 1 + rest.size();
}
public int get(int i) {       // 前提：0 <= i < size()
    if (i == 0) return first;
    return rest.get(i - 1);
}
```

`size` 把当前节点的 1 加到剩余列表长度上；`get` 每走一个节点，目标位置减 1。迭代版本则用游标 `p = this`，反复计数并执行 `p = p.rest`，直到 p 为 null。

两种长度算法都要访问所有节点，时间随节点数增长。补充：递归还消耗调用栈，长链可能栈溢出；迭代的游标只需固定额外空间。当前裸链表并未优雅地统一“空列表”，这是下一讲引入包装类和哨兵的动机。

![迭代版本移动游标，原来的链表起点保持不变。](assets/lecture03/02640.webp)

*课堂画面：[回看 44:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12&t=2640)。迭代版本移动游标，原来的链表起点保持不变。*

## 动手检查理解

1. 不运行代码，画出 a、b 共享对象后，字段赋值与变量重新赋值的两种结果。
2. 解释上面的 `change` 为什么最后得到 9 而不是 7。
3. 手算链表 5 → 10 → 15 的 `size()` 调用与返回过程，再算 `get(2)`。
4. 在 [Lab 02](../labs/lab02/README.md) 的 Java Visualizer 中对照自己的图。

## 口语与字幕校正

字幕中的“休息”通常对应 `rest`，“名单”有时对应 list。幻灯片将引用画为 64 位是简化模型，不是所有 JVM 的统一内存承诺。Java 标准库本来就有 List；课堂自行实现 IntList 是为了学习数据结构。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/3.-references-recursion-and-lists)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture03.srt)
