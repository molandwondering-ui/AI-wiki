# Lecture 2：同一段代码怎样操作不同对象，再用调试器找错

这节课用狗的体重和叫声说明：同一种对象可以拥有不同的数据。后半节给你一段结果不对的程序，让你学会暂停它、查看当时的数据，再找到错在了哪一步。

来源：CS61B Spring 2024，B 站 P6（不是第 6 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6) · [官方幻灯片](../slides/Lecture02.pdf) · [画面与原始字幕](../transcripts/Lecture02_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 不同的狗，可以用同一个类来记录

小狗和大狗的叫声可以不同，但没必要为每只狗复制一整套代码。只要给每只狗记下体重，再让同一个 makeNoise 方法按体重选择叫声就行。共同的规则写在类里，每只狗自己的体重写在对象里。

**再看技术解释：**

如果所有狗都发出同一种声音，静态 `Dog.makeNoise()` 很容易写。但当叫声取决于体重时，程序需要知道“是哪一只狗”。为每只狗复制一个类会造成重复，新增狗还得新增代码。

因此把体重作为实例字段 `weightInPounds`，在实例方法里读取它。课堂用 `< 10`、`< 30` 和其他情况划分叫声；关键不是阈值本身，而是同一段行为代码对不同实例状态产生不同结果。

![体重相关行为需要读取每只狗各自的字段。](assets/lecture02/00480.webp)

*课堂画面：[回看 08:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=480)。体重相关行为需要读取每只狗各自的字段。*

## 2. 按体重发声之前，得先说清是哪只狗

直接说“让狗叫一下”还不够：如果声音取决于体重，就得知道你叫的是哪一只。small.makeNoise() 指明了 small 这只狗，Dog.makeNoise() 则只提到了狗这个类。后者是类级调用，没有自动附带某只狗；这就是这里 static 与普通实例方法的关键区别。

**再看技术解释：**

下面的结构明确给每只狗初始化体重：

```java
public class Dog {
    public int weightInPounds;
    public Dog(int w) { weightInPounds = w; }
    public void makeNoise() {
        if (weightInPounds < 10) System.out.println("yap");
        else if (weightInPounds < 30) System.out.println("bark");
        else System.out.println("awoo");
    }
}
```

`new Dog(5).makeNoise()` 与 `new Dog(100).makeNoise()` 可以不同。若把 `makeNoise` 改成静态方法，又直接访问实例字段，编译器会问：你要读取哪只狗的体重？

静态方法并非绝对不能访问对象字段，而是需要一个明确的对象，例如传入 `Dog d` 后读取 `d.weightInPounds`。

![移除 static 后，还必须通过具体 Dog 实例调用 makeNoise。](assets/lecture02/00660.webp)

*课堂画面：[回看 11:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=660)。移除 static 后，还必须通过具体 Dog 实例调用 makeNoise。*

## 3. 给狗起变量名、创建狗、记住它，是不同的动作

写 Dog small，只是说后面准备通过 small 来找一只狗，还没有创建那只狗。new Dog(5) 才真正创建体重为 5 的狗；把结果交给 small，之后才能用 small.makeNoise() 找到它并让它叫。把一行拆成这几步，很多空指针问题就好理解了。

**再看技术解释：**

拆开一行代码，就能避免“声明变量等于创建对象”的误解：

```java
Dog small;             // 声明引用变量
small = new Dog(5);     // 创建对象，并把引用赋给变量
small.makeNoise();      // 通过引用访问该实例
```

`Dog small = new Dog(5)` 把前两步合在一起。单独写 `new Dog(20)` 也会创建对象，但若没有保存引用，后续通常无法再访问它。补充：对象不可达后可以被垃圾回收，不等于该行执行完马上被销毁。

`DogLauncher` 则可以只负责 `main` 和调用流程。一个类不必有自己的 `main` 才能参与程序；被其他类创建、调用也是正常用法。

![变量声明、实例化、赋值和方法调用应分别理解。](assets/lecture02/01020.webp)

*课堂画面：[回看 17:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=1020)。变量声明、实例化、赋值和方法调用应分别理解。*

## 4. 比较两只狗，有两种自然的说法

一种说法是“请比较 a 和 b”，所以把两只狗都传给 Dog.maxDog(a,b)。另一种是“让 a 和 b 比一比”，写成 a.maxDog(b)：a 已经站在点号前面，只需再传入 b。两种写法都可以返回更重的那只现有的狗，不需要再造一只。

**再看技术解释：**

静态版本显式收到两只狗：

```java
public static Dog maxDog(Dog a, Dog b) {
    return a.weightInPounds > b.weightInPounds ? a : b;
}
```

调用 `Dog.maxDog(a, b)`。实例版本把第一只狗藏在接收者里：

```java
public Dog maxDog(Dog other) {
    return weightInPounds > other.weightInPounds ? this : other;
}
```

调用 `a.maxDog(b)`。两者都返回已有对象的引用，不需要再 `new Dog`。若放在同一类中，它们参数列表不同，构成重载。理解调用时到底提供了哪些对象，比单纯背诵 static 的定义更有用。

![静态 maxDog 通过两个参数明确比较对象。](assets/lecture02/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=1380)。静态 maxDog 通过两个参数明确比较对象。*

## 5. 每只狗自己的体重，与所有狗共用的信息，要分开放

两只狗的体重各不相同，应该各记各的。物种名称却可以由整个 Dog 类共同保存。static 表示后面这种“属于整个类”的信息；它不表示这个值永远不能改。不能重新赋值这件事，由另一个关键字 final 表达。

**再看技术解释：**

例如 `static String binomen = "Canis familiaris"` 表示类级共享信息，适合通过 `Dog.binomen` 读取。每只狗自己的体重则继续放在实例字段里。

| 成员 | 通常怎样访问 | 是否需要具体实例 |
|---|---|---|
| 实例字段 weightInPounds | `d.weightInPounds` | 需要 |
| 实例方法 makeNoise | `d.makeNoise()` | 需要 |
| 静态工具 maxDog | `Dog.maxDog(a, b)` | 调用本身不需要接收者 |
| 静态字段 binomen | `Dog.binomen` | 不需要 |

`static` 说的是归属，不是“以后不能改”。限制变量重新赋值需要 `final`；这两个关键字解决不同问题。

![同一个类可以同时包含实例成员和静态成员。](assets/lecture02/01740.webp)

*课堂画面：[回看 29:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=1740)。同一个类可以同时包含实例成员和静态成员。*

## 6. 调试之前，先知道正确结果应该是什么

如果程序最后打印了一个空列表，你还不能直接知道是哪行错了。先拿具体输入自己算一遍，例如这组狗里应该选出体重 20 和 22 的两只，再去看程序在哪一步把它们漏掉。调试器让程序暂停，方便你查看“此时此刻它记住了什么”。

**再看技术解释：**

后半讲的任务是从狗数组中选出比左右各两个邻居都大的狗；超出数组边界的邻居不参与。课堂示例应选出体重 20 和 22 的狗，实际却没有选出结果。

不要直接猜某行代码错了。先明确：哪些输入应产生什么输出？再检查实现第一次偏离预期的位置。断点让程序在某行执行**之前**暂停，可查看局部变量、数组内容、字段和调用栈。

这比临时加入大量 `println` 更适合观察复杂对象；断点本身也不需要修改业务源码。

![调试器用于观察执行状态，不能替代对期望行为的定义。](assets/lecture02/01920.webp)

*课堂画面：[回看 32:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=1920)。调试器用于观察执行状态，不能替代对期望行为的定义。*

## 7. 单步执行，就是控制自己看得多细

你可以让程序执行完当前一行，也可以跟进这一行调用的方法里面，一行行看它做了什么。暂时不怀疑的部分可以跳过，发现结果不对的部分再进去。这样不用从第一行盯到最后一行，也不用到处插入打印语句。

**再看技术解释：**

Step Over 执行当前语句，包括其中的方法调用，但通常不进入被调方法逐行停留。Step Into 进入方法内部；Step Out 执行到当前方法返回；Resume 继续到下一个断点或结束。

课堂先观察数组是否正确，再观察返回数组和计数器。到第一个本应被选中的候选狗时，辅助函数仍返回 false，这才把注意力移进邻居判断。

普通调试通常不能直接“倒着走回上一行”。走过关键位置后，可以重新运行并调整断点；循环很长时用条件断点会更省时，详见 Lab 02。

![先看外层循环，再进入决定候选狗是否合格的辅助函数。](assets/lecture02/02460.webp)

*课堂画面：[回看 41:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=2460)。先看外层循环，再进入决定候选狗是否合格的辅助函数。*

## 8. 一只狗不能比自己还重，所以比较时要跳过自己

这段程序想比较一只狗与左右邻居，但循环顺手把“它自己”也算进去了。于是即便它比所有邻居都重，也会因为“没比自己重”被淘汰。找到第一次误判的位置后，问题就很具体了：偏移为 0 时跳过，其他合法邻居照常比较。

**再看技术解释：**

比较邻居时遍历偏移 `-2` 到 `2`，若不跳过 0，就把候选狗自己也当成邻居。它当然不可能严格大于自己：遇到“大于等于候选体重”的判断时，自己就把自己淘汰了。

因此需要排除自身，然后再按要求检查合法邻居。这个错误不会导致编译失败或崩溃，只会使所有候选都被拒绝。

修复后重新运行完整案例，并思考最短数组、边界位置、相等体重等输入。断点的目的不是看完每一行，而是提出一个可验证的假设，再用运行状态缩小范围。

![候选体重 20 本应被保留，辅助函数的结果却首次偏离预期。](assets/lecture02/02820.webp)

*课堂画面：[回看 47:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6&t=2820)。候选体重 20 本应被保留，辅助函数的结果却首次偏离预期。*

## 跑一个完整例子：比较两只狗：点号前面有没有当前对象

这是为本笔记补充的可运行代码。同一件事写成两种调用：Dog.heavier(a,b) 和 a.heavier(b)。两次都找到体重 20 的大狗，而且返回的是已有对象。

```java
public class DogDemo {
    static class Dog {
        int weight;
        Dog(int weight) { this.weight = weight; }

        // 类方法：两只狗都从参数传进来。
        static Dog heavier(Dog a, Dog b) {
            return a.weight >= b.weight ? a : b;
        }

        // 实例方法：this 是点号前面的狗，另一只从参数传入。
        Dog heavier(Dog other) {
            return weight >= other.weight ? this : other;
        }
    }

    public static void main(String[] args) {
        Dog small = new Dog(5);
        Dog big = new Dog(20);
        System.out.println("类方法选中：" + Dog.heavier(small, big).weight);
        System.out.println("实例方法选中：" + small.heavier(big).weight);
        System.out.println("返回原来的 big：" + (small.heavier(big) == big));
    }
}
```

第一种写法没有自动附带一只狗，因此接收 a、b 两个参数。第二种已经用 `small.` 指明当前对象，只接收另一只狗。`条件 ? a : b` 表示条件成立选 a，否则选 b；`==` 在这里检查是不是同一只对象。

**运行方式：**在 CS61B 目录执行 `java examples/lecture02/DogDemo.java`。首次运行可先看[环境说明](../examples/README.md)。

预期输出：

```text
类方法选中：20
实例方法选中：20
返回原来的 big：true
```

**改一处试试：**把 small 的体重改成 30，预测三行输出。再把两只狗都改成 20，观察代码约定平局时返回哪一只。

[打开完整 Java 文件](../examples/lecture02/DogDemo.java) · [单独阅读这个例子](../examples/lecture02/README.md)

## 自己动手试一试

1. 用一句话解释 `Dog.maxDog(a,b)` 与 `a.maxDog(b)` 各自从哪里获得两只狗。
2. 在纸上跟踪偏移 -2、-1、0、1、2，说明为什么必须跳过 0。
3. 完成 [Lab 02](../labs/lab02/README.md) 的三个阶段，练习断点、对象可视化和条件断点。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/2.-defining-and-using-classes)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture02.srt)
