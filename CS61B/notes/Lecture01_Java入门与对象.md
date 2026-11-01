# Lecture 1：Java入门与对象

**CS61B 要同时提高两种效率：程序运行的效率，以及人设计、测试和修改程序的效率。** 本讲先说明课程目标，再用 Python 与 Java 的对照演示静态类型、方法、对象。学习重点是看懂程序如何组织，而不是一次背完 Java 关键字。

来源：CS61B Spring 2024，B 站 P1（不是第 1 讲）。整理日期：2026-11-01。

[录像](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1) · [官方幻灯片](../slides/Lecture01.pdf) · [画面与原始字幕](../transcripts/Lecture01_画面字幕对照.md) · [课程索引](../README.md)

以下是结合字幕与画面重写的中文学习笔记，不是逐字译稿。代码为课堂思路的教学整理；额外边界说明单独标注。

## 1. 课程用 Java 训练数据结构和程序设计能力

课程分成 Java 与程序组织、数据结构、算法等阶段。前者帮助你写出较大的程序，后者帮助你判断程序在数据变多时会不会变慢。Java 是练习载体；Git、IntelliJ、测试和调试工具也是课程的一部分。

课程假设你已经接触变量、条件、循环、函数，并初步见过对象、递归、列表。若这些还不熟，遇到一个语法问题就写一个最小程序验证，比只反复看录像有效。

前半段还有选课背景、评分、作业节奏和延期说明。这些是 **2024 年当期规则**，不能直接作为今天的报名或提交说明。对自学者最有用的信息是：及时做练习，避免只积累“听懂了”的感觉。

![课程把运行效率和开发效率并列为目标。](assets/lecture01/00120.webp)

*课堂画面：[回看 02:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=120)。课程把运行效率和开发效率并列为目标。*

## 2. 从一个可运行的入口开始理解 Java

Python 可以直接写 `print("Hello")`；本课程采用的 Java 17 写法需要把入口放进类：

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello");
    }
}
```

保存为 `Hello.java`。`class` 声明类，花括号确定代码块，语句通常用分号结束。`main` 是程序入口，`void` 表示不返回结果，`String[] args` 接收命令行参数。先把它当作可以运行实验的外壳；后续再逐步理解 `public` 和 `static`。

Java 与 JavaScript 是不同语言；不要因为名字接近就套用同一套类型和对象规则。

![课堂从 Python 程序转向等价的 Java 程序。](assets/lecture01/01020.webp)

*课堂画面：[回看 17:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=1020)。课堂从 Python 程序转向等价的 Java 程序。*

## 3. 方法属于类，循环也必须放在合法位置

下面把重复打印写进入口：

```java
public class HelloNumbers {
    public static void main(String[] args) {
        int x = 0;
        while (x < 10) {
            System.out.println(x);
            x = x + 1;
        }
    }
}
```

这里依次输出 0 到 9。`while` 每轮先判断条件，然后执行花括号中的语句；`x` 更新后回到条件处。缩进帮助人阅读，真正决定代码块的是花括号。

课堂用“代码放进类”介绍 Java 的程序结构。这是当前课程写法的规则；先学会读清类、方法、语句三层，不必把入口模板误当作所有 Java 版本、所有文件类型的完整语法定义。

![类和方法为代码提供明确的组织结构。](assets/lecture01/01200.webp)

*课堂画面：[回看 20:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=1200)。类和方法为代码提供明确的组织结构。*

## 4. 静态类型会提前拒绝不兼容的赋值

`int x = 5` 声明一个保存整数的变量。之后可以写 `x = 8`，但不能写 `x = "horse"`。已经声明的局部变量，也不能在同一作用域用 `String x` 重新定义成另一种类型。

静态类型让编译器在运行前发现一部分错误，也让读者知道参数和返回值的大致含义。代价是写法较明确、较啰嗦，表达通用代码时需要后面的接口和泛型。

不要把所有涉及不同类型的运算都判为错误。例如 Java 中 `"horse" + 5` 会进行字符串拼接，得到 `"horse5"`。应区分“把字符串赋给整数变量”和“使用字符串拼接运算”。

![现场演示在同一作用域重新声明变量时的编译错误。](assets/lecture01/01380.webp)

*课堂画面：[回看 23:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=1380)。现场演示在同一作用域重新声明变量时的编译错误。*

## 5. 编译检查与程序执行是两个阶段

可以先编译再运行：

```sh
javac Hello.java
java Hello
```

`javac` 将源码转换为字节码，并检查语法、类型等约束；`java` 启动 JVM 执行程序。编译成功不意味着逻辑正确，例如循环条件写错仍可能输出错误结果。

课堂还把 Python 的比较函数改写成 Java 方法：

```java
public static int larger(int x, int y) {
    if (x > y) {
        return x;
    }
    return y;
}
```

它必须放在类内部；参数和返回值都标出类型。调用 `larger(3, 7)` 得到 7，调用 `larger(3.5, 7)` 则不能直接匹配这两个 `int` 参数。补充：JVM 可以解释执行并使用即时编译，幻灯片的流程是入门简图。

![源码、字节码、执行结果是不同阶段的产物。](assets/lecture01/01740.webp)

*课堂画面：[回看 29:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=1740)。源码、字节码、执行结果是不同阶段的产物。*

## 6. 对象把一份状态与操作这份状态的方法放在一起

类是创建对象的模板，对象是模板的一次具体实例。两辆汽车都属于 `Car`，但车型和轮子数可以不同。字段保存状态，实例方法描述对象能执行的操作。

这样组织程序的意义是模块化：使用者可以调用“驾驶”“查询轮子数”，而不必每次重新理解所有内部表示。这个想法会在链表、数组列表和接口中反复出现。

```java
Car a = new Car("A");
Car b = new Car("B");
```

两个 `new` 创建两个不同对象。不要把“同一个类”理解成“所有实例共享同一份字段”。实例字段独立；下一讲才会引入类级别的 `static` 字段。

![面向对象把局部状态、行为和模块边界结合起来。](assets/lecture01/01920.webp)

*课堂画面：[回看 32:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=1920)。面向对象把局部状态、行为和模块边界结合起来。*

## 7. 构造函数负责建立对象的初始状态

课堂的汽车示例可以整理为：

```java
public class Car {
    String model;
    int wheels;

    public Car(String m) {
        model = m;
        wheels = 4;
    }
    public void drive() {
        if (wheels < 4) {
            System.out.println(model + " cannot drive");
            return;
        }
        System.out.println(model + " goes vroom");
    }
    public int getNumWheels() { return wheels; }
    public void driveIntoDitch(int lost) { wheels -= lost; }
}
```

构造函数与类同名，没有返回类型。`new Car("A")` 创建对象并执行初始化。`a.driveIntoDitch(2)` 改变 a 的状态，再调用 `a.drive()` 就会走到不能驾驶的分支；b 的轮子仍然是 4。

这是解释状态变化的课堂模型，没有完整的输入校验。不要把它当作实际汽车业务规则。

![Car 用字段保存状态，再由方法查询或修改状态。](assets/lecture01/02460.webp)

*课堂画面：[回看 41:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=2460)。Car 用字段保存状态，再由方法查询或修改状态。*

## 8. this 指向当前对象，帮助你区分字段与参数

在实例方法中，`this` 表示接收本次调用的对象。例如调用 `a.getNumWheels()` 时，该方法内的 `this` 就是 a 指向的那辆车。

当名字没有冲突时，`return wheels;` 与 `return this.wheels;` 等价。如果构造函数参数也叫 `model`，则要明确区分：

```java
public Car(String model) {
    this.model = model;
    this.wheels = 4;
}
```

左侧是对象字段，右侧是参数。只写 `model = model` 会把参数赋给它自己，字段不会得到想要的值。这类错误不一定产生编译错误，正是后续需要测试与调试的原因。

![this 是当前实例；不发生遮蔽时可以省略。](assets/lecture01/02820.webp)

*课堂画面：[回看 47:00](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1&t=2820)。this 是当前实例；不发生遮蔽时可以省略。*

## 动手检查理解

1. 手写并运行 Hello，再故意删掉一个分号，区分编译错误与输出错误。
2. 创建两辆 Car，只修改其中一辆，先预测两次 `getNumWheels()` 的结果。
3. 解释 `int x = "horse"` 与 `"horse" + 5` 为什么不同。
4. 接着做 [Lab 01](../labs/lab01/README.md)，把编辑、运行、测试的流程走通。

## 继续阅读

- [官方教材 1](https://cs61b-2.gitbook.io/cs61b-textbook/1.-introduction)
- [实验索引](../labs/README.md)
- [本讲完整原始字幕](../subtitles/Lecture01.srt)
