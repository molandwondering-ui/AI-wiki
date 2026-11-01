# Lecture 9：类继承组合与类型转换

**extends 可以复用行为，也会引入父子类耦合；类型转换能改变表达式的静态视角，却不会改变对象本身。** 官方标题还列出 Higher Order Functions，但本段录像到 casting 结束，最后明确预告下次讲高阶函数，因此这里不冒充已经讲过该主题。

来源：CS61B Spring 2024，B 站 P28（不是第 28 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28) · [官方幻灯片](../slides/Lecture09.pdf) · [画面与原始字幕](../transcripts/Lecture09_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 类继承能在已有行为上增加新操作

`RotatingSLList<E> extends SLList<E>` 表示一种能右旋的 SLList。右旋把 `[5,9,15,22]` 变成 `[22,5,9,15]`，可以复用已有公开方法：

```java
public void rotateRight() {
    if (size() <= 1) return;     // 补充：空表与单元素保护
    E last = removeLast();
    addFirst(last);
}
```

课堂最初误用了 getLast，导致只复制末尾到开头，原末尾没有删掉。修复为 removeLast 才真正保持元素总数。

rotateRight 是新方法，不是对父类方法的重写，因此不加 Override。继承复用了操作，但不会自动提高它们的复杂度：若父类 removeLast 需要遍历，旋转仍可能是 O(N)。

![右旋需要取出并删除原末尾，再插入开头。](assets/lecture09/00480.webp)

*课堂画面：[回看 08:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=480)。右旋需要取出并删除原末尾，再插入开头。*

## 2. super 调用父类实现，适合在原行为前后扩展

VengefulSLList 要记住被删除的元素。它新增 lostItems 列表，并重写 removeLast：

```java
@Override
public E removeLast() {
    E removed = super.removeLast();
    lostItems.addLast(removed);
    return removed;
}
```

`super.removeLast()` 选择父类的实现，操作的仍是当前对象的父类部分；并没有创建另一个独立的“父对象”。随后记录返回的元素，再保持原接口返回值。

直接复制父类删除代码会碰到 private 字段访问限制，也造成维护重复。通过父类公开方法复用更清晰。继承关系让对象具有父类那部分状态，但不代表子类源码可以直接访问父类所有私有成员。

![通过 super 完成原来的删除，再将删除值加入历史记录。](assets/lecture09/00840.webp)

*课堂画面：[回看 14:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=840)。通过 super 完成原来的删除，再将删除值加入历史记录。*

## 3. 子类构造函数必须初始化父类部分和自己的部分

只声明 `SLList<E> lostItems` 并不会创建列表对象。课堂因此遇到 NullPointerException，随后在构造函数中加入 `new SLList<>()`。

```java
public VengefulSLList() {
    super();
    lostItems = new SLList<>();
}
public VengefulSLList(E x) {
    super(x);
    lostItems = new SLList<>();
}
```

在课程采用的 Java 17 规则下，构造函数先调用父构造器或同类另一构造器。没有显式调用时会尝试插入 `super()`，不会自动把你的参数 x 转交给 `super(x)`。父类没有可访问的无参构造器时，还会导致编译错误。

构造函数本身并不被子类继承。要支持不同初始化方式，应在子类里明确写出相应构造器。

![有参数的子构造函数不会自动选择有参数的父构造函数。](assets/lecture09/01200.webp)

*课堂画面：[回看 20:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=1200)。有参数的子构造函数不会自动选择有参数的父构造函数。*

## 4. Object 提供共同基础，但基本类型不是它的子类

Java 中普通类最终都继承 Object；例如 VengefulSLList → SLList → Object。即使未显式写 extends Object，也存在这层基础关系。

所以对象具有 toString、equals、hashCode 等通用方法。后续课程会分别讨论它们的意义；这里先建立“这些方法为什么存在”的认识。

幻灯片“每种类型都是 Object 后代”的字面说法过宽：int、double 等基本类型不是 Object 子类。类只能直接 extends 一个类，但可以实现多个接口；接口继承接口使用 extends，是对前一讲关键词规则的补充。

![类层次最终连到 Object，因此获得通用对象行为。](assets/lecture09/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=1380)。类层次最终连到 Object，因此获得通用对象行为。*

## 5. 有一个列表与是一种列表，应使用不同设计

集合可以**内部用列表存储**，却不一定应当继承列表。若 Set 继承 SLList，就把按位置 get 等本来不属于集合契约的操作一起暴露出去，还可能破坏去重约束。

栈也是同样的例子。栈强调后进先出，用 push、pop 和 size 即可。组合写法把列表作为私有字段，只对外开放需要的操作：

```java
private java.util.LinkedList<E> items = new java.util.LinkedList<>();
public void push(E x) { items.addLast(x); }
public E pop() { return items.removeLast(); }
```

这些方法片段放在泛型栈类中。课堂批评 Java 历史上的 Stack 继承设计；准确地说，`java.util.Stack` 继承 Vector，从而暴露许多不属于简洁栈抽象的操作。

![组合把列表作为内部工具，避免把所有列表操作暴露成栈接口。](assets/lecture09/01740.webp)

*课堂画面：[回看 29:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=1740)。组合把列表作为内部工具，避免把所有列表操作暴露成栈接口。*

## 6. 测试公开行为，可以避免绑定某一种内部表示

“怎么读取 ArrayDeque 的私有数组长度”“能否假设初始下标为 4”这类问题，常常是在错误的抽象层上测试。

如果要验证扩容后功能仍正确，可以连续插入足够多元素，再通过 size、get 或删除顺序验证数据保留；不必要求所有实现都使用某个具体容量或字段名。

封装帮助使用者忽略不相关细节，也让实现者保留修改空间。补充：白盒测试并非永远不合法；当规格明确要求某种内部结构或性能时可以针对它检查。核心是知道自己验证的是公开契约，还是额外实现约束。

![公开接口测试不应无故假设私有数组的容量和下标布局。](assets/lecture09/02100.webp)

*课堂画面：[回看 35:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=2100)。公开接口测试不应无故假设私有数组的容量和下标布局。*

## 7. 父类内部改写可能通过动态派发影响子类

课堂的 Dog 原先让 bark 直接输出，让 barkMany(N) 循环调用 bark。VerboseDog 重写 barkMany，先打印说明，再循环调用 bark。

后来父类作者把 Dog 改成 bark 调用 barkMany(1)，barkMany 自己循环输出。对普通 Dog，看上去效果相同；对 VerboseDog，却出现：

```text
VerboseDog.barkMany
  → 继承的 Dog.bark
    → 当前对象重写的 VerboseDog.barkMany
      → Dog.bark → ...
```

父类内部的实例方法调用仍会动态派发，所以不断递归，最终可能栈溢出。这个例子说明子类可能依赖父类内部调用结构，“父类看似保持行为的重构”未必对所有子类透明。

实现继承需要谨慎设计，不是看到几行可复用代码就建立父子关系。

![父类 bark 改为调用 barkMany 后，子类重写形成递归循环。](assets/lecture09/02460.webp)

*课堂画面：[回看 41:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=2460)。父类 bark 改为调用 barkMany 后，子类重写形成递归循环。*

## 8. 编译器先按静态类型决定哪些操作合法

假设：

```java
SLList<Integer> s = new VengefulSLList<>();
s.removeLast();        // SLList 声明了这个操作
// s.printLostItems(); // 编译错误：SLList 没有这个方法
```

运行时对象确实是 VengefulSLList，但编译器检查方法调用时使用表达式的静态类型。不能跳过这个阶段直接说“反正对象有这个方法”。

同理，一个方法若声明返回 Dog，即使传进去的恰好都是 Poodle，调用表达式的静态类型仍是 Dog。编译器不会为了通过类型检查而实际执行该方法，猜它最后返回哪只狗。

![变量的静态类型限制可调用方法，即使实际对象拥有更多能力。](assets/lecture09/02640.webp)

*课堂画面：[回看 44:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=2640)。变量的静态类型限制可调用方法，即使实际对象拥有更多能力。*

## 9. 强制转换改变类型视角，不把一种对象变成另一种

可以用 `(Poodle) maxDog(a,b)` 告诉编译器按 Poodle 看待这个表达式，但运行时会检查实际对象。如果返回的是更重的 Malamute，就会抛 ClassCastException。

因此 cast 不是“把雪橇犬改造成贵宾犬”。它没有复制对象，也没有改变对象的实际类。合法的向下转换仍然要求对象本来就属于目标类型。

补充：不能对任意不相关类型都强转，编译期也有合法性限制。转换空引用本身可以得到 null，但随后调用方法仍会空指针异常。实际代码应优先通过合适的参数类型和接口表达需求；确实需要下转时，再利用 instanceof 等判断。

本段到这里结束，高阶函数在下次讲解。

![强转可以通过编译，却因实际对象不匹配在运行时失败。](assets/lecture09/03000.webp)

*课堂画面：[回看 50:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28&t=3000)。强转可以通过编译，却因实际对象不匹配在运行时失败。*

## 动手检查理解

1. 解释为什么右旋用 getLast 会改变长度，而 removeLast 不会。
2. 把 `super(x)` 改成不显式调用，预测初始列表内容，再解释原因。
3. 判断“汽车有发动机”与“电动车是汽车”哪种更适合组合、哪种可能适合继承。
4. 沿 VerboseDog 的调用图画三轮，说明动态派发发生在哪里。
5. 为“父类型引用指向子对象”分别标出编译期允许的方法与运行期选择的实现。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/10.-inheritance-ii-extends-casting-higher-order-functions)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture09.srt)
