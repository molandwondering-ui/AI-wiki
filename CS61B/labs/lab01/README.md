# Lab 01：让程序跑起来，再修正算错的结果

[官方题目](https://sp24.datastructur.es/labs/lab01/) · [本地题目](official.html) · [本地 FAQ](faq.html) · [练习代码](starter/) · [第一次打开与配置环境](../README.md)

下面按实际操作顺序说明怎么做。原始题目、代码和测试均保留，具体要求可随时对照官方材料。整理日期：2026-11-01。

## 这次做什么

程序让你输入两个整数，再打印它们的乘积与和。你的任务是先把它运行起来，然后判断它算得对不对，修好错误。对应第 1–2 讲。

如果还没试过运行 Java，可以先跑[两辆车的小例子](../../examples/lecture01/README.md)，熟悉 main 和输出窗口。

## 一步一步做

1. 按[环境说明](../README.md)在 IntelliJ 打开 `starter/`，选好 JDK，添加 library。
2. 打开 [Arithmetic.java](starter/src/Arithmetic.java)，点 main 旁的运行按钮。看到提示后输入 `2`，回车，再输入 `3`，回车。
3. 先不改代码。你知道乘积应该是 6，和应该是 5，对照屏幕结果看哪一个不对。
4. 打开 [ArithmeticTest.java](starter/tests/ArithmeticTest.java)，运行测试。测试会调用程序里的方法，把返回值与预期答案比较；失败时查看 expected（预期）和 actual（实际）。
5. 回到 Arithmetic.java，找到对应计算，按题意修改。重新跑全部测试，再运行一次 main 输入数字，确认两种方式都正常。

## 这两个文件是什么关系

Arithmetic.java 是做计算的程序。ArithmeticTest.java 则像一张附了标准答案的练习卷，自动给程序出题并核对结果。程序能启动，不代表它能答对题，所以 main 和测试都要会运行。

`StdIn` 是用来读取输入的外部工具。如果提示 `package edu.princeton.cs.algs4 does not exist`，意思是没找到这个工具；回到环境设置添加 JAR，不要把 import 删掉。

## 做完后检查

- 输入 2 和 3，乘积为 6，和为 5；再自己换一组数字核对。
- ArithmeticTest 全部通过，测试中的预期答案没有被改过。
- 能指着代码说明：从哪里开始运行、在哪里读输入、哪两个方法计算结果。
- 留一条记录：我发现了什么错误，改了哪里，用什么输入检查过。

官方还介绍 Git 和 Gradescope。自学可以在自己的练习副本中记录 Git 提交；当前资料没有替你连接学生仓库或提交课程作业。

[返回实验索引](../README.md)
