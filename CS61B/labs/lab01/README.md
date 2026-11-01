# Lab 01：建立 Java 编辑、运行与测试流程

[官方题目](https://sp24.datastructur.es/labs/lab01/) · [题目快照](official.html) · [FAQ 快照](faq.html) · [起始代码](starter/) · [环境配置](../README.md)

以下为中文实验导引，原始英文规格与 starter 保留供核对。同步日期 2026-11-01；未填写解答，也未修改官方测试。

## 本实验要学会什么

让一段 Java 程序从源码运行起来，并用测试区分“能够启动”和“计算正确”。它与 Lecture 1–2 对应，工具设置本身也是实验的一部分。

## 按这条顺序操作

1. 先按[共同环境说明](../README.md)配置 JDK、IntelliJ、源码根和 library。官方要求 Java 17 或以上。
2. 打开 [Arithmetic.java](starter/src/Arithmetic.java)，运行 main，依提示输入两个整数。先观察乘积和和的输出，不急着修改。
3. 选择一组你可以独立手算、且能区分不同运算的输入，写下预期结果。确认异常是程序逻辑错误，而不是输入格式错误。
4. 运行 [ArithmeticTest.java](starter/tests/ArithmeticTest.java)，阅读哪些测试通过、哪些失败。
5. 只修改 Arithmetic.java 中与题目不符的逻辑，再运行全部测试和一次交互输入。

## 需要理解的文件关系

Arithmetic.java 是实现；ArithmeticTest.java 是对实现的独立检查。main 用 algs4 的 StdIn 读取输入，所以如果出现 `package edu.princeton.cs.algs4 does not exist`，先检查依赖配置，而不是删除 import。

IDE 中绿色运行按钮可能表示运行 main，也可能表示运行测试。看清选择的是哪个入口，避免以为“交互程序没有报错”就代表所有测试通过。

## 完成检查

- 能说明声明、编译和运行分别做什么。
- 能独立运行 main，也能独立运行测试。
- ArithmeticTest 全部通过，未修改测试来迁就实现。
- 记录错误原因、修改位置和验证输入。

官方还介绍 Git 仓库、add/commit/push 和 Gradescope 的工作流。自学可在自己的练习副本记录提交；当前 AI-wiki 资料目录没有替你配置学生仓库或执行课程提交。

[返回实验索引](../README.md)
