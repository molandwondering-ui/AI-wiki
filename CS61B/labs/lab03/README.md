# Lab 03：沿着报错信息，修好冒险游戏的四个关卡

[官方题目](https://sp24.datastructur.es/labs/lab03/) · [本地题目](official.html) · [本地 FAQ](faq.html) · [练习代码](starter/) · [第一次打开与配置环境](../README.md)

下面按实际操作顺序说明怎么做。原始题目、代码和测试均保留，具体要求可随时对照官方材料。整理日期：2026-11-01。

## 这次做什么

这份冒险游戏已经写好，但藏了几处错误。你要让程序跑到出错处，读清它当时的数据，再修好。涉及引用、列表、测试；读完第 9 讲还可以回来理解为什么不必钻进每个辅助方法的内部。

先运行 [AdventureGame](starter/src/adventure/AdventureGame.java) 的 main，看看游戏怎么玩。再运行 [AdventureGameTests](starter/tests/adventure/AdventureGameTests.java)，找到失败的关卡。Working directory 设为 `starter/`，否则会找不到 `tests/data`。

## 先读报错，不急着改代码

报错后通常有一串 `at 类名.方法名(文件.java:行号)`。它记录了“哪里出错、谁调用了它、再往外是谁调用的”，这串信息叫调用栈。

先看最上面的错误类型。比如 NullPointerException 常表示通过空引用访问对象，IndexOutOfBoundsException 表示用了范围之外的位置。再点你自己代码对应的行号，设断点，查看那个变量为什么是 null，或者下标与长度分别是多少。

栈顶有时是 Java 库的方法。先往下找到自己代码调用它的位置，检查传入了什么，不要立即认定库有问题。真正的原因也可能在更早的初始化或循环里。

## 按这个顺序修

| 关卡 | 打开哪个文件 | 重点观察 |
|---|---|---|
| 1 | [BeeCountingStage](starter/src/adventure/BeeCountingStage.java) | 对象有没有创建？循环有没有走到合法范围之外？ |
| 2 | [SpeciesListStage](starter/src/adventure/SpeciesListStage.java) | 传入的列表是什么样？方法上方的 Javadoc 对特殊输入怎么规定？ |
| 3 | [PalindromeStage](starter/src/adventure/PalindromeStage.java) | 先处理 IDE 提示，再看循环里哪些变量本应变化却没变 |
| 4 | [MachineStage](starter/src/adventure/MachineStage.java) | 先算正确的中间结果，再检查辅助方法返回了什么 |

官方提示的修改规模依次是：第一关两个问题，各约 1 行；第二关约 3–4 行；第三关约 3 行；第四关约 2–5 行。行数只是帮助你缩小范围，不用为了凑行数修改。

每修一关就运行相应测试，再重跑已经通过的关卡。找到具体错误后改它，通常比把整关重写更容易理解原因。

## MachineStage：不知道内部怎么写，也能检查它做得对不对

两组输入是 `{2,0,10,14}` 和 `{-5,5,20,30}`。每个位置挑较大的数，应该得到 `{2,5,20,30}`，再相加应该是 57。先把这些结果写下来，再单步观察程序。

官方要求对 mysteryMax、mysteryAdd 使用 **Step Over**，不要钻进故意写得难读的内部代码。你只要知道“给什么、应该返回什么”，就能检查它的结果。确认某个函数没有按要求完成任务后，再按题目允许的方式重写这个函数。误点进去时用 Step Out 返回。

用技术语言说，这就是根据函数的输入输出约定来排查问题，不必理解它内部每一步。

## 可选：Puzzle

四关做完后，可以试 [Puzzle.java](starter/src/puzzle/Puzzle.java)。它不要求修改 Puzzle.java，而是通过调试观察修改 [answer.txt](starter/src/puzzle/answer.txt)。

可以练习异常断点（出特定错误时暂停）、Evaluate Expression（计算当前表达式）和 Watches（持续观察一个表达式）。观察时尽量只读取值；如果你在表达式里调用删除、添加等方法，也会改变正在调试的程序。

## 怎样算做完

四个关卡和整体 Adventure 测试通过。Puzzle 是可选，没做它不影响四关主任务完成。为每个问题写几句：报了什么错，看到了什么值，原因在哪，怎样修改，用哪个测试确认。

[返回实验索引](../README.md)
