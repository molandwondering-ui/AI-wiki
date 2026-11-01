# Lab 03：从异常栈定位冒险游戏的错误

[官方题目](https://sp24.datastructur.es/labs/lab03/) · [题目快照](official.html) · [FAQ 快照](faq.html) · [起始代码](starter/) · [环境配置](../README.md)

以下为中文实验导引，原始英文规格与 starter 保留供核对。同步日期 2026-11-01；未填写解答，也未修改官方测试。

## 本实验要学会什么

识别异常类型、读取调用栈、找到根因，并用最小改动修复。相关正课是引用与列表、测试，以及第 9 讲的抽象边界。

先运行 [AdventureGame](starter/src/adventure/AdventureGame.java) 的 main，了解游戏要做什么；随后运行 [AdventureGameTests](starter/tests/adventure/AdventureGameTests.java)。初始失败是预期，按下面的关卡顺序推进。

## 先学会读栈，再开始猜原因

异常第一行告诉你错误类型，后续行表示异常发生的方法和逐层调用者。最顶端常是触发错误的位置，但根因可能在更早的构造函数、参数准备或循环状态中。

遇到库内部的 ArrayList/Objects 栈帧，可以向下找自己代码最先调用它的位置。不要因为栈顶不是你写的类，就断定库有错误。运行配置的工作目录设为 starter，保证测试能读取 tests/data。

## 四个关卡

| 顺序 | 文件 | 观察目标 | 官方修改规模参考 |
|---|---|---|---|
| 1 | [BeeCountingStage](starter/src/adventure/BeeCountingStage.java) | 先解决空引用，再检查索引边界 | 两个问题，各约 1 行 |
| 2 | [SpeciesListStage](starter/src/adventure/SpeciesListStage.java) | 结合调用参数和 Javadoc 检查列表边界情况 | 约 3–4 行 |
| 3 | [PalindromeStage](starter/src/adventure/PalindromeStage.java) | 利用 IDE 提示，再定位无法退出的循环 | 约 3 行 |
| 4 | [MachineStage](starter/src/adventure/MachineStage.java) | 对照逐元素最大值与求和结果检查辅助函数 | 约 2–5 行 |

行数只是官方提示，不是机械目标。每修完一个关卡，先跑对应测试，再跑已通过的关卡；不要把整段代码重写到看不出原本练习的问题。

## MachineStage 用输出契约隔离错误

对 `{2,0,10,14}` 和 `{-5,5,20,30}`，逐元素最大值应为 `{2,5,20,30}`，和为 57。先独立算出这些中间结果，再看函数实际返回什么。

官方要求不要钻进混淆的 mysteryMax、mysteryAdd 源码猜逻辑，使用 Step Over 看结果。只有确认某个函数违反契约后，才按规格允许的方式整体重写那个函数。误入时可以 Step Out。

这个练习说明：不用理解每一层内部实现，也能根据输入输出判断某层是否有错。

## 可选：异常断点、表达式与 Watches

[puzzle/Puzzle.java](starter/src/puzzle/Puzzle.java) 是可选练习。不要修改 Puzzle.java；按异常信息和调试观察调整 [answer.txt](starter/src/puzzle/answer.txt)。

异常断点在特定异常抛出时暂停；Evaluate Expression 计算当前状态中的表达式；Watch 可以持续观察表达式随执行变化。表达式若调用会修改状态的方法，本身也可能影响程序，优先观察无副作用的内容。

## 完成标准

Adventure 的四个关卡测试与整体测试通过，保护文件和测试未被任意修改。官方当期必做部分对应这四关；Puzzle 是可选，不能因为它未做就误判四关必做任务未完成。将每个问题的“症状 → 证据 → 根因 → 修复 → 验证”各写一行，留作以后调试模板。

[返回实验索引](../README.md)
