# Lecture 8：换一种列表，为什么不该重写整段业务代码

你要找出最长的单词，只关心列表有多长、每个位置是什么。至于里面用数组还是链表存，本来不该影响这段需求。这节课用接口把共同操作说清楚，再解释程序最后会执行哪一份方法。

来源：CS61B Spring 2024，B 站 P25（不是第 25 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25) · [官方幻灯片](../slides/Lecture08.pdf) · [画面与原始字幕](../transcripts/Lecture08_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 同样是找最长单词，不想为每种列表再写一遍

你写了一段遍历 SLList 找最长单词的代码。换成 AList，逻辑明明一样，却因为参数类型不同还得再写一份。需要解决的是：让方法接收“能取单词、能报长度的列表”，而不是只接收某一个具体类。

**再看技术解释：**

一个 `longest(SLList<String> words)` 可以遍历单词，返回最长者。换成 AList 后，即使同样有 size 和 get，Java 也不会仅凭“方法看起来一样”就接受它作为 SLList 参数。

为 AList 再写一个重载当然能编译，但方法体几乎完全重复。以后新增 DLList 或修复一个算法错误，就要修改多处。

真正共同的需求只是“能报告长度、能按索引读取单词”。把这组能力提取成一个类型，就能让算法依赖它，而不是依赖某一种内部存储方式。

![同一个最长单词算法不应因为列表实现不同而不断复制。](assets/lecture08/00120.webp)

*课堂画面：[回看 02:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=120)。同一个最长单词算法不应因为列表实现不同而不断复制。*

## 2. 接口就像列出一张“必须会做这些事”的清单

一个列表要会添加、按位置读取、报告长度。接口把这些操作的名字、参数和返回类型写下来，暂时不管内部怎样完成。调用者照这张清单使用，实现者选择用数组还是链表。List61B 就是课程给这张清单起的名字。

**再看技术解释：**

课程建立泛型接口 List61B。下面是理解本例所需的节选，并非完整接口：

```java
public interface List61B<E> {
    void addLast(E x);
    E get(int i);
    int size();
}
```

这些抽象方法以分号结束，未提供方法体。接口不应该把某种实现专用的 items 数组、sentinel 节点、resize 辅助方法复制进来。

它表达的是对调用者的承诺：你可以用这些操作与列表交互。AList 可以用数组，SLList 可以用节点；只要满足同一操作约定，调用者不必知道差别。

![接口保留公开操作的签名，不照搬数组或链表内部表示。](assets/lecture08/00660.webp)

*课堂画面：[回看 11:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=660)。接口保留公开操作的签名，不照搬数组或链表内部表示。*

## 3. 写 implements，就是声明自己会完成这份清单

AList 写 implements List61B，表示它愿意按这个接口提供操作。这个声明不会自动替你写出添加算法；具体类仍得实现所需方法。编译器会检查方法是否齐全，但方法算得对不对、跑得快不快，还需要你自己验证。

**再看技术解释：**

类声明写成 `class AList<E> implements List61B<E>`，就告诉 Java：AList 是一种 List61B。SLList 也能作同样声明。

非抽象实现类必须为需要实现的抽象方法提供有效实现，也可以通过继承得到实现。仅仅写 implements，并不会自动产生 addLast 的算法。实现接口方法时不能降低它们的访问权限，通常明确写 public。

现在最长单词方法只需接收 `List61B<String>`。传进 AList、SLList，乃至将来新增的实现都可以；这就是“面向接口”带来的扩展空间。接口只表达操作约定，不能凭名字保证所有实现的性能相同。

![implements 告诉编译器 AList 满足 List61B 的类型关系。](assets/lecture08/00840.webp)

*课堂画面：[回看 14:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=840)。implements 告诉编译器 AList 满足 List61B 的类型关系。*

## 4. 给同一操作换做法，和给同名方法加一种用法，是两回事

原来有 print()，你在子类型里给它换一套打印代码，这叫重写。原来有 makeNoise()，又加 makeNoise(int times)，让人指定叫几次，这叫重载。@Override 是请编译器帮你检查：“我写的真是在重写原方法吗？”

**再看技术解释：**

重写 overriding 是子类型为已有实例方法提供实现；重载 overloading 是同名方法有不同参数列表，例如 `makeNoise()` 与 `makeNoise(Dog other)` 并存。

```java
@Override
public void addLast(E x) {
    // 当前数据结构的追加实现
}
```

`@Override` 不是启动重写的开关。即使不写，只要满足规则仍会重写；写上后，拼错方法名或参数不匹配时，编译器会提醒“这并没有重写”。

同一个类不能用同样签名写两个不同方法体让 Java 随机选择；也不能只靠返回类型差异来重载。课程优先掌握常规重写，先不用把精力都花在复杂的重载选择题上。

![Override 注解让编译器检查你是否真的重写了方法。](assets/lecture08/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=1380)。Override 注解让编译器检查你是否真的重写了方法。*

## 5. 变量可以写“列表”，实际拿着的是一种具体列表

List61B<String> words = new SLList<>() 可以读成：“我用列表这套操作来使用它，实际创建的是单向链表。”这不会把 SLList 改造成另一个对象。反过来，别人只告诉你它是 List61B，你就不能断定它一定是 SLList。

**再看技术解释：**

可以写：

```java
List61B<String> words = new SLList<>();
```

这没有违反赋值规则。右侧创建 SLList 对象，左侧保存引用；因为 SLList 是 List61B，类型是兼容的。

反方向却不自动成立：一个 List61B 可能是 AList，也可能是 SLList，不能无条件赋给 SLList 变量。参数传递同理，仍是复制引用值，而不是复制或转换整个对象。

记住这里同时发生了两件事：赋值复制的是引用；接口类型允许这个引用指向不同的具体实现。

![算法接收 List61B 时，可以接收任何符合接口的具体列表。](assets/lecture08/01740.webp)

*课堂画面：[回看 29:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=1740)。算法接收 List61B 时，可以接收任何符合接口的具体列表。*

## 6. 有些通用做法，可以直接写在接口里

只要列表能告诉你长度、能按位置取值，就能写出“从头到尾打印一遍”。这种共同做法可以放进接口，写成 default 方法。实现类没有自己改写时，就直接用它；有更合适的做法，也可以自己重写。

**再看技术解释：**

接口也可以提供带方法体的默认实现：

```java
default void print() {
    for (int i = 0; i < size(); i++) {
        System.out.print(get(i) + " ");
    }
    System.out.println();
}
```

它不知道内部是数组还是节点，但知道每个实现都有 size 和 get，因此能够使用它们。实现类若不重写 print，就能继承这段行为。

这是实现继承：不仅继承“要做什么”的方法签名，还继承“如何做”的代码。写默认实现时仍应考虑所调用者法的成本；代码只有一层显式循环，不等于总成本一定线性。

![默认 print 可以仅利用 size 和 get 完成通用打印。](assets/lecture08/02100.webp)

*课堂画面：[回看 35:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=2100)。默认 print 可以仅利用 size 和 get 完成通用打印。*

## 7. 同样的打印代码，在链表上可能走很多冤枉路

数组取第 100 个元素很直接；链表的 get(100) 却要从头走过去。循环里依次调用 get(0)、get(1)、get(2)，就会一遍遍重走前面的路。链表可以自己重写 print，沿 next 一路走到底，每个节点只经过一次。

**再看技术解释：**

AList 的 get(i) 为常数时间，打印 N 项总成本 O(N)。SLList 的 get(i) 每次从头走到 i，总访问量约为 0+1+…+(N-1)，打印变成 O(N²)。

SLList 知道自己的节点结构，可以重写 print：从 sentinel.next 开始，沿 next 前进，每个节点只访问一次。这样恢复为 O(N)，同时对外仍是同一个 print 操作。

所以，你可以保留相同的对外用法，同时为链表换上更快的做法。不要因为接口给了默认实现，就默认它对所有底层结构都是最有效的。

![SLList 重写 print，单次遍历节点以避免重复从头扫描。](assets/lecture08/02460.webp)

*课堂画面：[回看 41:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=2460)。SLList 重写 print，单次遍历节点以避免重复从头扫描。*

## 8. 先看允许调用什么，再看实际执行哪一份

words 声明为 List61B，Java 先检查这份接口有没有 print。允许调用后，运行时再看它实际指向什么对象：若是重写了 print 的 SLList，就执行 SLList 那份。前一个看的是变量声明的类型，后一个看的是实际对象的类型。

**再看技术解释：**

对 `List61B<String> words = new SLList<>()`，变量 words 的静态类型是 List61B，当前对象的运行时类型是 SLList。编译时先检查 List61B 是否允许 print；运行时再使用 SLList 对该实例方法的重写。

重新赋值可以让 words 指向其他合法实现，但声明的静态类型没有改变。对象自身也不会因为你换了一个变量去引用它，就改变所属类。

这个规则适用于这里的可重写实例方法，不应推广为“所有成员访问都只看动态类型”；字段、静态方法和重载选择有不同规则。空引用没有可调用的实际对象，也不是另一个实现类型。

![words 虽声明为接口类型，调用时仍会选择 SLList 的重写实现。](assets/lecture08/02820.webp)

*课堂画面：[回看 47:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25&t=2820)。words 虽声明为接口类型，调用时仍会选择 SLList 的重写实现。*

## 跑一个完整例子：同一个接口变量，为什么能有不同表现

这是为本笔记补充的可运行代码。两种打招呼工具都叫 greet。第一种沿用接口的通用介绍，第二种改写介绍方式。main 用同一段循环调用它们。

```java
public class InterfaceDemo {
    interface Greeter {
        String greet(String name);
        default String description() { return "通用问候"; }
    }

    static class ChineseGreeter implements Greeter {
        @Override
        public String greet(String name) { return "你好，" + name; }
    }

    static class EnglishGreeter implements Greeter {
        @Override
        public String greet(String name) { return "Hello, " + name; }
        @Override
        public String description() { return "英文问候"; }
    }

    public static void main(String[] args) {
        Greeter[] tools = {new ChineseGreeter(), new EnglishGreeter()};
        for (Greeter tool : tools) {
            // 编译时看 Greeter 是否声明这些方法；运行时看实际对象的实现。
            System.out.println(tool.description() + "：" + tool.greet("Lin"));
        }
    }
}
```

接口约定 greet 接收名字、返回问候语。两个类都实现它，所以都能放进 Greeter 数组。ChineseGreeter 没写 description，就用接口默认方法；EnglishGreeter 重写了它，运行时就选这份。这个例子把课堂列表换成问候语，专门让你看清接口和方法选择。

**运行方式：**在 CS61B 目录执行 `java examples/lecture08/InterfaceDemo.java`。首次运行可先看[环境说明](../examples/README.md)。

预期输出：

```text
通用问候：你好，Lin
英文问候：Hello, Lin
```

**改一处试试：**把 EnglishGreeter 的 description 方法连同它的 @Override 删除。第二行开头会变成什么？再加一种自己的问候实现，看看 main 的循环是否需要改。

[打开完整 Java 文件](../examples/lecture08/InterfaceDemo.java) · [单独阅读这个例子](../examples/lecture08/README.md)

## 自己动手试一试

1. 分别指出 List61B、SLList、words 在上述例子中的角色。
2. 把 print 故意拼成 prnt 并保留 Override，观察编译器检查的是什么。
3. 用 4 个节点数一数默认 print 的总遍历步数，再与“沿 next 一路走到底”的打印方式比较。
4. 解释为什么 `List61B x = new SLList()` 的方向合法，反方向需要进一步判断。

## 口语与字幕校正

录像中把接口默认方法说成“被删除”是一种不严格的比喻。补充：满足 Java 规则时，直接实现该接口的类可用 `List61B.super.print()` 调用该默认实现；重写并不意味着源实现从语言中消失。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/9.-inheritance-i-interface-and-implementation-inheritance)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture08.srt)
