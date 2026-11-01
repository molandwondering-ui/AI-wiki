# Lab 02：用断点拆解 Bomb

[官方题目](https://sp24.datastructur.es/labs/lab02/) · [题目快照](official.html) · [FAQ 快照](faq.html) · [起始代码](starter/) · [环境配置](../README.md)

以下为中文实验导引，原始英文规格与 starter 保留供核对。同步日期 2026-11-01；未填写解答，也未修改官方测试。

## 本实验要学会什么

通过调试器观察实际值和引用结构，使用条件断点跳过大量无关迭代。对应 Lecture 2 的交互式调试和 Lecture 3 的 IntList。

**只修改 [BombMain.java](starter/src/bomb/BombMain.java)。不要修改 [Bomb.java](starter/src/bomb/Bomb.java) 或 [BombTest.java](starter/tests/bomb/BombTest.java)，包括添加注释或打印。** 这是官方实验要求，测试会检查保护文件。

## 正确启动方式

从 BombTest 的相应测试方法进入 Debug。不要寻找 BombMain 的 main 按钮：本版本使用 answers 方法作为测试调用入口，没有常规 main。Working directory 必须是当前 `starter/`，否则测试无法读取 `src/bomb/Bomb.java`。

## Phase 0：在合适时刻查看一个值

在 phase0 设置断点，启动 testBombPhase0。程序在断点行执行前暂停，因此若该行负责计算密码，需要先 Step Over 再查看计算结果。观察生成的 `correctPassword`，把需要的输入填回 BombMain 对应调用。

你不必理解生成器内部所有实现。练习目的是学会让程序执行到一个可观察的位置，并读取它真正使用的值。

## Phase 1：把引用结构画出来

在 phase1 中观察 `correctIntListPassword`，用 Java Visualizer 看 first/rest 组成的链。IntList.of 可以把若干整数快速构造成列表，例如 `IntList.of(1,2,3)` 表示 1 → 2 → 3。

记录真实节点的顺序和值，不要把引用地址或节点显示编号误当成密码元素。填回输入后单独运行 testBombPhase1，再运行前两个阶段以检查没有回归。

## Phase 2：让断点只在目标迭代停下

phase2 先生成大量数字，再在遍历过程中检查特定位置。官方提示目标是 `i == 1337`，即从 0 开始计数的第 1338 次迭代。

给循环内相关位置设置条件断点，条件为相应计数值，而不是逐次点击一千多次。到达目标后观察当前 number，理解“索引”和“迭代次数”的区别，再完成 BombMain 的输入。

## 调试动作速查

| 动作 | 作用 |
|---|---|
| Step Over | 执行当前行，不逐行进入被调函数 |
| Step Into | 进入当前调用，查看内部执行 |
| Step Out | 执行到当前函数返回 |
| Resume | 继续到下一个断点或程序结束 |
| 条件断点 | 仅在布尔条件成立时暂停 |

不要通过改 Bomb 里的比较条件或改测试期望值来“通过”。本实验完成标准是三个阶段本地测试通过，同时两个保护文件保持原样。

[返回实验索引](../README.md)
