# Lab 02：让程序暂停，找出 Bomb 的三个答案

[官方题目](https://sp24.datastructur.es/labs/lab02/) · [本地题目](official.html) · [本地 FAQ](faq.html) · [练习代码](starter/) · [第一次打开与配置环境](../README.md)

下面按实际操作顺序说明怎么做。原始题目、代码和测试均保留，具体要求可随时对照官方材料。整理日期：2026-11-01。

## 这次做什么

程序里藏着三个阶段需要的输入。你要用调试器让它在合适的位置停下来，查看真实的数据，再把答案填回去。练习重点是断点、单步执行和引用关系，对应第 2–3 讲。

**只改 [BombMain.java](starter/src/bomb/BombMain.java)。** [Bomb.java](starter/src/bomb/Bomb.java) 和 [BombTest.java](starter/tests/bomb/BombTest.java) 保持原样，包括不要添加打印或注释。官方测试会检查这些文件是否被改动。

## 先把入口找对

打开 BombTest，点对应测试旁的按钮并选择 **Debug**。这一份 BombMain 没有普通 main 方法，它通过 answers 方法供测试调用，所以不要在 BombMain 里找 main 的绿色三角形。

Working directory 设为本实验 `starter/`。测试需要从那里找到 `src/bomb/Bomb.java`。

## Phase 0：看见程序真正算出的密码

在 Bomb.java 的 phase0 中，点行号旁的空白处设置断点，再 Debug `testBombPhase0`。程序会停在这一行执行之前。

找到计算 `correctPassword` 的语句。如果停在赋值那一行，先点 Step Over 执行它，再在变量窗口查看结果。把所需输入填回 BombMain 的对应调用，单独运行本阶段测试。

这里不要求你把整个密码生成器推导一遍；先学会把程序停在“值已经算出来”的地方。

## Phase 1：沿着链表一项项看

在 phase1 查看 `correctIntListPassword`。节点中的 first 是当前数字，rest 指向后一个节点。可以用 Java Visualizer 画出连接，按从头到尾的顺序记录数字。

`IntList.of(1,2,3)` 表示创建 1 → 2 → 3 的列表，这里只是写法示例，不是本题答案。不要把变量窗口里的对象编号当成列表元素。

填好后运行 `testBombPhase1`，再重跑前两个阶段，确认都能通过。

## Phase 2：不要手点一千多次，让程序到指定位置再停

官方提示关注 `i == 1337`，也就是从 0 开始计数的第 1338 次循环。在循环内部设置断点，右键断点，填写条件 `i == 1337`。

继续运行，程序只在条件满足时停下。查看当前的 number，结合暂停行确认它已经被赋值，再完成 BombMain 中的输入。

## 调试按钮怎么选

| 按钮 | 可以怎样理解 |
|---|---|
| Step Over | 走完当前这一行，不进去看被调用方法的每一步 |
| Step Into | 进入当前调用的方法，看里面怎么执行 |
| Step Out | 已经进得太深，让它执行到当前方法返回 |
| Resume | 继续跑，直到下一个断点或结束 |
| 条件断点 | 只有条件成立才停，比如 i 等于 1337 |

## 怎样算做完

三个阶段的测试都通过，并且 Bomb 与测试文件保持原样。你也应该能解释：“我在哪一行暂停，看到哪个变量，为什么用这个值作为输入。”

[返回实验索引](../README.md)
