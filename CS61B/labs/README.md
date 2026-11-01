# Labs 怎么用：先运行，再找错，最后自己实现

Lab 就是配套练习。你会拿到题目、老师写好的部分代码，以及一套检查程序。你要读懂要求，修改指定文件，再运行检查，看哪里还没有做好。

如果你现在只想看一段完整程序怎么工作，先去[可运行小例子](../examples/README.md)。这里的实验故意留了错误或空缺，第一次运行失败很正常。

## 先做哪个

按 Lab 01 → 02 → 03 做。Lab 08 是哈希表练习，读过第 19 讲、理解泛型和接口后再开始。

| 实验 | 你实际要做的事 | 从哪里启动 |
|---|---|---|
| [Lab 01](lab01/README.md) | 让程序算两个整数的和与积，修正错误结果 | Arithmetic 的 main；ArithmeticTest |
| [Lab 02](lab02/README.md) | 暂停程序，查看三个阶段需要的输入，填进 BombMain.java | BombTest 的 Debug 按钮 |
| [Lab 03](lab03/README.md) | 读报错位置，修好冒险游戏的四个关卡 | AdventureGame；AdventureGameTests |
| [Lab 08](lab08/README.md) | 自己实现按键存取的 MyHashMap，再测速度 | TestMyHashMap，之后才是速度测试 |

Lecture 1–9 对应这里的 Lab 1–3，不是 Lab 1–9；第 19 讲另外配了 Lab 8。

## 第一次打开：以 Lab 01 为例

1. 在 IntelliJ 中选择 **File → Open**，打开 `lab01/starter/`。这台电脑的完整路径是 `/Users/gemini/AI-wiki/CS61B/labs/lab01/starter`。
2. 选择 JDK 17 或更新版本。JDK 是编译、运行 Java 的工具；在 **File → Project Structure → Project → SDK** 中选择。没有列出来时用 Add SDK → JDK 指向安装目录。
3. 在左侧右键 `src`，选择 **Mark Directory as → Sources Root**；右键 `tests`，选择 **Test Sources Root**。这是告诉 IntelliJ：“这里是程序，这里是检查程序的测试。”
4. 进入 **Project Structure → Modules → Dependencies → + → JARs or Directories**，添加 [library](library/) 中的所有 `.jar` 文件。它们提供输入工具、JUnit 和 Truth 等，程序和测试会用到。
5. 打开 [Arithmetic.java](lab01/starter/src/Arithmetic.java)，点 main 旁的绿色三角形运行。在下方控制台输入一个整数并回车，再输入另一个整数并回车。
6. 再打开 [ArithmeticTest.java](lab01/starter/tests/ArithmeticTest.java)，点测试类旁的运行按钮。看哪些检查通过、哪些失败，再按 [Lab 01 指南](lab01/README.md) 修改。

**工作目录也要设对：**打开 Run → Edit Configurations，把 Working directory 设为正在做的实验的 `starter` 目录。程序按这个起点寻找文件。Lab 02 要读取 `src/bomb/Bomb.java`，Lab 03 要读取 `tests/data`；起点不对就会报找不到文件。

每次单独打开一个实验，不要把四份 src 合并成同一个源码目录，里面有重复类名。按官方说明安装 CS 61B 插件和 Java Visualizer；后者能把对象与引用画出来，适合 Lab 02。普通断点和变量查看则是 IntelliJ 自带功能。

### 这台电脑的 Java 在哪里

2026-11-01 复查发现，Homebrew 已安装 OpenJDK 25.0.2，可用命令是 `/opt/homebrew/opt/openjdk/bin/java`。之前只检查系统 java 入口而误判为“没有 Java”，现已更正。

在 IntelliJ 中可尝试把 `/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home` 添加为 JDK，并把本课程代码的语言级别设为 17。新增的 10 个例子已经按 Java 17 目标编译，再用 JDK 25 运行核对输出；本次没有运行或完成官方实验测试。

## 文件夹里的东西分别做什么

| 文件或目录 | 什么时候看 |
|---|---|
| README.md | 先读中文步骤，知道要改哪里、怎么检查 |
| official.html / official.txt | 查看老师的完整题目；本地保存了网页和纯文字两种版本 |
| faq.html / faq.txt | 遇到常见问题时查官方答疑 |
| starter/src/ | 练习代码，按题目修改指定文件 |
| starter/tests/ | 老师提供的检查程序和数据，运行它们检查自己的修改 |
| library/*.jar | 程序需要用到的外部代码，在 IntelliJ 中添加为依赖即可 |

## 报错时先判断是哪一类

| 看到什么 | 先检查什么 |
|---|---|
| 找不到 JDK / Java Runtime | 是否选中了实际安装的 JDK，是否只是系统入口没配置 |
| package org.junit… 或 edu.princeton… does not exist | library 的 JAR 是否加入了当前模块 |
| 找不到 src/… 或 tests/data/… | Working directory 是否为当前实验的 starter |
| expected 与 actual 不同 | 测试已经跑起来了；对照输入，看程序为什么没算出预期结果 |
| Lab 08 提示没有实现接口方法 | 这份起始代码本来就没写完，需要按题目补全 |

JUnit 负责运行测试，Truth 负责写“结果应该是什么”的检查。官方材料同时使用 JUnit 4 和 5，依赖已一并保存；遇到 import 问题先检查环境，不要批量改老师的测试。

## 怎样算做完

先拿一个小输入自己算答案，再修改代码，运行相应测试。修好后把已有测试再跑一遍，确认之前的功能仍然正常。最后用几句话记下：原来哪里错了，怎样发现，改了什么。Lab 08 还要实际测速度并填写 results.txt。

本地做练习不需要 Berkeley 学生账号。官方题目中的 Beacon、Gradescope 等面向当期选课学生；此处没有替你创建学生仓库或提交作业。

起始代码与测试保留官方原样，版本为 `67caa5eef7f4a8402313e27476b18edf2b21d727`；依赖版本为 `6ba6f63aae658fa92dc1c4ec42c053fe33e8a6f2`。[来源记录](../reference/lab-sources.json)保存了校验值。题目网页的 40 张图片已缓存在本地，外部链接、视频及部分脚本仍需要网络。

[返回课程索引](../README.md)
