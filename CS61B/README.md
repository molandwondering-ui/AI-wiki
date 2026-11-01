# CS61B：Java、数据结构与算法

本目录整理 Berkeley **CS61B Spring 2024** 的正课 Lecture 1–9，以及最初指定的 **Lecture 19：Hashing（B 站 P59）**。配套同步官方 Lab 01、02、03、08 的题目、FAQ、起始代码、测试和相关依赖。

## 从哪里开始

每篇笔记先用具体例子讲清楚，再解释技术名词。文末有完整 Java 程序、预期输出和一个可以改着试的小任务。想先动手，直接打开[可运行代码例子](examples/README.md)；想做作业，从 [Labs 使用说明](labs/README.md)开始。

按 Lecture 1 → 9 顺序阅读，穿插 Lab 01 → 03；哈希表是后续主题，可先读第 19 讲再做 Lab 08。本次“1–9”按正式 Lecture 编号整理，不是 B 站分 P 1–9，也不是前九周。

课程合集混有其他年份、Discussion 等内容，分 P 顺序不等于授课顺序。这里仅收录对应正课和实验；没有同步独立 Homework、Project 或答疑视频。

## 逐讲笔记

| 正课 | 主题与笔记 | B 站分 P | 幻灯片 | 原始图文材料 |
|---|---|---|---|---|
| Lecture 1 | [让 Java 程序跑起来，再认识类和对象](notes/Lecture01_Java入门与对象.md) | [P1](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=1) | [PDF](slides/Lecture01.pdf) | [画面与字幕](transcripts/Lecture01_画面字幕对照.md) |
| Lecture 2 | [同一段代码怎样操作不同对象，再用调试器找错](notes/Lecture02_类实例与交互式调试.md) | [P6](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=6) | [PDF](slides/Lecture02.pdf) | [画面与字幕](transcripts/Lecture02_画面字幕对照.md) |
| Lecture 3 | [为什么改了 b，a 有时也会跟着变](notes/Lecture03_引用按值传递与IntList.md) | [P12](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=12) | [PDF](slides/Lecture03.pdf) | [画面与字幕](transcripts/Lecture03_画面字幕对照.md) |
| Lecture 4 | [把链表包装好，让它更容易使用](notes/Lecture04_SLList封装与哨兵节点.md) | [P15](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=15) | [PDF](slides/Lecture04.pdf) | [画面与字幕](transcripts/Lecture04_画面字幕对照.md) |
| Lecture 5 | [让链表能往回走，再认识泛型和数组](notes/Lecture05_双向链表泛型与数组.md) | [P18](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=18) | [PDF](slides/Lecture05.pdf) | [画面与字幕](transcripts/Lecture05_画面字幕对照.md) |
| Lecture 6 | [程序算错了，怎样一步步找到原因](notes/Lecture06_测试驱动开发与方差调试.md) | [P9](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=9) | [PDF](slides/Lecture06.pdf) | [画面与字幕](transcripts/Lecture06_画面字幕对照.md) |
| Lecture 7 | [数组装满以后，列表怎样继续加东西](notes/Lecture07_数组列表扩容与内存保留.md) | [P21](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=21) | [PDF](slides/Lecture07.pdf) | [画面与字幕](transcripts/Lecture07_画面字幕对照.md) |
| Lecture 8 | [换一种列表，为什么不该重写整段业务代码](notes/Lecture08_接口继承与动态方法选择.md) | [P25](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=25) | [PDF](slides/Lecture08.pdf) | [画面与字幕](transcripts/Lecture08_画面字幕对照.md) |
| Lecture 9 | [给已有的类增加能力，以及继承容易踩的坑](notes/Lecture09_类继承组合与类型转换.md) | [P28](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=28) | [PDF](slides/Lecture09.pdf) | [画面与字幕](transcripts/Lecture09_画面字幕对照.md) |
| Lecture 19 | [哈希表为什么能很快找到你要的东西](notes/Lecture19_哈希表从分桶到常数时间.md) | [P59](https://www.bilibili.com/video/BV1QP4y1u7jv/?p=59) | [PDF](slides/Lecture19.pdf) | [画面与字幕](transcripts/Lecture19_画面字幕对照.md) |

## 配套实验

| 实验 | 内容 | 建议衔接 |
|---|---|---|
| [Lab 01](labs/lab01/README.md) | 环境、Java 运行、Arithmetic 测试 | Lecture 1–2 |
| [Lab 02](labs/lab02/README.md) | 断点、Visualizer、条件断点 | Lecture 2–3 |
| [Lab 03](labs/lab03/README.md) | 调用栈、异常、冒险游戏调试 | Lecture 3–6；第 9 讲可回顾抽象边界 |
| [Lab 08](labs/lab08/README.md) | 实现 MyHashMap、冲突、扩容、性能实验 | Lecture 19；先掌握泛型与接口 |

[实验总索引与 IntelliJ 配置](labs/README.md)。实验按官方课程日历匹配；**Lecture 1–9 不等于 Lab 1–9**。本次同步的是对应的 Lab 1–3，另外为 P59 加上 Lab 8。

## 阅读材料的区别

- **notes/**：结合指定分 P 的字幕与画面重写的中文笔记，包含概念、代码、错误分析、配图和回看时间戳。不是逐字译稿。
- **transcripts/**：中文阅读路标和原始字幕—画面对照。原始机器字幕仍有错词、断句或翻译问题，保留供核对，不宣称已逐句精校。
- **subtitles/**：对应每一讲的完整 SRT。
- **slides/**：从官方课程链接导出的 PDF；现场临时演示可能与幻灯片不同。
- **examples/**：10 个可直接运行的补充 Java 例子，每个附预期输出和修改练习。
- **labs/**：中文实验导引、官方题目/FAQ 快照、原版 starter 与测试、当前四个实验相关的 library 依赖。
- **reference/**：课程映射、下载记录、上游版本和本地完整性记录。

第 6 讲现场案例是方差调试，尽管部分幻灯片写排序。第 9 讲标题含 Higher Order Functions，但本段录像没有正式展开该主题，已在笔记中说明。

## 来源与版本

资料整理日期：2026-11-01。课程站和历史评分规则属于 Spring 2024 版本。自学可以使用公开材料，但 Beacon 学生仓库、课堂账号及 Gradescope 提交资格并未随资料授予。

- [官方课程日历](https://sp24.datastructur.es/)
- [官方教材](https://cs61b-2.gitbook.io/cs61b-textbook/)
- [官方起始代码](https://github.com/Berkeley-CS61B/skeleton-sp24/tree/67caa5eef7f4a8402313e27476b18edf2b21d727)
- [官方依赖库](https://github.com/Berkeley-CS61B/library-sp24/tree/6ba6f63aae658fa92dc1c4ec42c053fe33e8a6f2)
- [逐讲来源映射](reference/catalog.json)
- [实验及依赖校验记录](reference/lab-sources.json)

2026-11-01 复查确认本机已安装 Homebrew OpenJDK 25.0.2；此前只检查系统 java 入口导致误判。新增 10 个 Java 例子已按 Java 17 目标编译并在 JDK 25 上运行，输出与说明一致。官方实验保持待完成状态，本次未执行实验测试；Lab 08 的接口方法仍需自己补全。
