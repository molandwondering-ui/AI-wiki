# CSAPP：从程序运行到缓冲区溢出

这组笔记围绕一个问题展开：写下的 C 程序，怎样变成机器指令，又怎样在计算机上运行？从 `hello.c` 的生命周期开始，先理解信息表示，再进入寄存器、栈、函数、数组和结构体。

**本轮范围：九曲阑干 CSAPP 合集的 1-1 至 3-10，共 22 个视频，约 2 小时 55 分钟。**

每讲提供两种读法：**笔记**按概念组织，解释原理、例子与易错点；**图文文稿**沿视频顺序展开，保留课堂细节并提供时间跳转。建议先读笔记，遇到疑问再对照文稿和原视频。

## 第一章：把 hello 的整个生命周期串起来

| 视频 | 时长 | 学习笔记 | 图文文稿 |
|---|---:|---|---|
| [1-1.计算机系统漫游](https://www.bilibili.com/video/BV1cD4y1D7uR/) | 07:44 | [阅读笔记](notes/ch01/01_1-1_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) | [对照文稿](transcripts/01_1-1_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) |
| [1-2.计算机系统漫游](https://www.bilibili.com/video/BV115411h72j/) | 08:35 | [阅读笔记](notes/ch01/02_1-2_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) | [对照文稿](transcripts/02_1-2_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) |
| [1-3.计算机系统漫游](https://www.bilibili.com/video/BV1mi4y137g8/) | 05:28 | [阅读笔记](notes/ch01/03_1-3_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) | [对照文稿](transcripts/03_1-3_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) |
| [1-4.计算机系统漫游](https://www.bilibili.com/video/BV1MC4y1t77F/) | 06:12 | [阅读笔记](notes/ch01/04_1-4_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) | [对照文稿](transcripts/04_1-4_%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F%E6%BC%AB%E6%B8%B8.md) |

## 第二章：同一串比特，可以表示不同的信息

| 视频 | 时长 | 学习笔记 | 图文文稿 |
|---|---:|---|---|
| [2-1.信息的存储(上)](https://www.bilibili.com/video/BV1tV411U7N3/) | 11:05 | [阅读笔记](notes/ch02/05_2-1_%E4%BF%A1%E6%81%AF%E7%9A%84%E5%AD%98%E5%82%A8%28%E4%B8%8A%29.md) | [对照文稿](transcripts/05_2-1_%E4%BF%A1%E6%81%AF%E7%9A%84%E5%AD%98%E5%82%A8%28%E4%B8%8A%29.md) |
| [2-1.信息的存储(下)](https://www.bilibili.com/video/BV1DK4y1Y7Yi/) | 05:50 | [阅读笔记](notes/ch02/06_2-1_%E4%BF%A1%E6%81%AF%E7%9A%84%E5%AD%98%E5%82%A8%28%E4%B8%8B%29.md) | [对照文稿](transcripts/06_2-1_%E4%BF%A1%E6%81%AF%E7%9A%84%E5%AD%98%E5%82%A8%28%E4%B8%8B%29.md) |
| [2-2.整数的表示(上)](https://www.bilibili.com/video/BV1ba4y1E7qy/) | 07:12 | [阅读笔记](notes/ch02/07_2-2_%E6%95%B4%E6%95%B0%E7%9A%84%E8%A1%A8%E7%A4%BA%28%E4%B8%8A%29.md) | [对照文稿](transcripts/07_2-2_%E6%95%B4%E6%95%B0%E7%9A%84%E8%A1%A8%E7%A4%BA%28%E4%B8%8A%29.md) |
| [2-2.整数的表示(下)](https://www.bilibili.com/video/BV1HK411K7TX/) | 08:23 | [阅读笔记](notes/ch02/08_2-2_%E6%95%B4%E6%95%B0%E7%9A%84%E8%A1%A8%E7%A4%BA%28%E4%B8%8B%29.md) | [对照文稿](transcripts/08_2-2_%E6%95%B4%E6%95%B0%E7%9A%84%E8%A1%A8%E7%A4%BA%28%E4%B8%8B%29.md) |
| [2-3.整数的运算(上)](https://www.bilibili.com/video/BV13Z4y1V734/) | 07:30 | [阅读笔记](notes/ch02/09_2-3_%E6%95%B4%E6%95%B0%E7%9A%84%E8%BF%90%E7%AE%97%28%E4%B8%8A%29.md) | [对照文稿](transcripts/09_2-3_%E6%95%B4%E6%95%B0%E7%9A%84%E8%BF%90%E7%AE%97%28%E4%B8%8A%29.md) |
| [2-3.整数的运算(下)](https://www.bilibili.com/video/BV1Ff4y1q7Kf/) | 07:42 | [阅读笔记](notes/ch02/10_2-3_%E6%95%B4%E6%95%B0%E7%9A%84%E8%BF%90%E7%AE%97%28%E4%B8%8B%29.md) | [对照文稿](transcripts/10_2-3_%E6%95%B4%E6%95%B0%E7%9A%84%E8%BF%90%E7%AE%97%28%E4%B8%8B%29.md) |
| [2-4.浮点数(上)](https://www.bilibili.com/video/BV1VK4y1f7o6/) | 08:18 | [阅读笔记](notes/ch02/11_2-4_%E6%B5%AE%E7%82%B9%E6%95%B0%28%E4%B8%8A%29.md) | [对照文稿](transcripts/11_2-4_%E6%B5%AE%E7%82%B9%E6%95%B0%28%E4%B8%8A%29.md) |
| [2-4.浮点数(下)](https://www.bilibili.com/video/BV1zK4y1j7Cn/) | 08:28 | [阅读笔记](notes/ch02/12_2-4_%E6%B5%AE%E7%82%B9%E6%95%B0%28%E4%B8%8B%29.md) | [对照文稿](transcripts/12_2-4_%E6%B5%AE%E7%82%B9%E6%95%B0%28%E4%B8%8B%29.md) |

## 第三章：把 C 代码与机器执行对应起来

| 视频 | 时长 | 学习笔记 | 图文文稿 |
|---|---:|---|---|
| [3-1.程序的机器级表示](https://www.bilibili.com/video/BV1Ci4y157P5/) | 08:47 | [阅读笔记](notes/ch03/13_3-1_%E7%A8%8B%E5%BA%8F%E7%9A%84%E6%9C%BA%E5%99%A8%E7%BA%A7%E8%A1%A8%E7%A4%BA.md) | [对照文稿](transcripts/13_3-1_%E7%A8%8B%E5%BA%8F%E7%9A%84%E6%9C%BA%E5%99%A8%E7%BA%A7%E8%A1%A8%E7%A4%BA.md) |
| [3-2.寄存器与数据传送指令](https://www.bilibili.com/video/BV1Lp4y167im/) | 09:38 | [阅读笔记](notes/ch03/14_3-2_%E5%AF%84%E5%AD%98%E5%99%A8%E4%B8%8E%E6%95%B0%E6%8D%AE%E4%BC%A0%E9%80%81%E6%8C%87%E4%BB%A4.md) | [对照文稿](transcripts/14_3-2_%E5%AF%84%E5%AD%98%E5%99%A8%E4%B8%8E%E6%95%B0%E6%8D%AE%E4%BC%A0%E9%80%81%E6%8C%87%E4%BB%A4.md) |
| [3-3.栈与数据传送指令](https://www.bilibili.com/video/BV1sV411b7c1/) | 07:42 | [阅读笔记](notes/ch03/15_3-3_%E6%A0%88%E4%B8%8E%E6%95%B0%E6%8D%AE%E4%BC%A0%E9%80%81%E6%8C%87%E4%BB%A4.md) | [对照文稿](transcripts/15_3-3_%E6%A0%88%E4%B8%8E%E6%95%B0%E6%8D%AE%E4%BC%A0%E9%80%81%E6%8C%87%E4%BB%A4.md) |
| [3-4.算术和逻辑运算指令](https://www.bilibili.com/video/BV1n54y1x7L8/) | 08:03 | [阅读笔记](notes/ch03/16_3-4_%E7%AE%97%E6%9C%AF%E5%92%8C%E9%80%BB%E8%BE%91%E8%BF%90%E7%AE%97%E6%8C%87%E4%BB%A4.md) | [对照文稿](transcripts/16_3-4_%E7%AE%97%E6%9C%AF%E5%92%8C%E9%80%BB%E8%BE%91%E8%BF%90%E7%AE%97%E6%8C%87%E4%BB%A4.md) |
| [3-5.指令与条件码](https://www.bilibili.com/video/BV1Jf4y1y7Nd/) | 08:04 | [阅读笔记](notes/ch03/17_3-5_%E6%8C%87%E4%BB%A4%E4%B8%8E%E6%9D%A1%E4%BB%B6%E7%A0%81.md) | [对照文稿](transcripts/17_3-5_%E6%8C%87%E4%BB%A4%E4%B8%8E%E6%9D%A1%E4%BB%B6%E7%A0%81.md) |
| [3-6.跳转指令与循环](https://www.bilibili.com/video/BV1Xr4y1T7T1/) | 06:54 | [阅读笔记](notes/ch03/18_3-6_%E8%B7%B3%E8%BD%AC%E6%8C%87%E4%BB%A4%E4%B8%8E%E5%BE%AA%E7%8E%AF.md) | [对照文稿](transcripts/18_3-6_%E8%B7%B3%E8%BD%AC%E6%8C%87%E4%BB%A4%E4%B8%8E%E5%BE%AA%E7%8E%AF.md) |
| [3-7. 过程（函数调用）](https://www.bilibili.com/video/BV19X4y1P7Pn/) | 09:02 | [阅读笔记](notes/ch03/19_3-7__%E8%BF%87%E7%A8%8B%EF%BC%88%E5%87%BD%E6%95%B0%E8%B0%83%E7%94%A8%EF%BC%89.md) | [对照文稿](transcripts/19_3-7__%E8%BF%87%E7%A8%8B%EF%BC%88%E5%87%BD%E6%95%B0%E8%B0%83%E7%94%A8%EF%BC%89.md) |
| [3-8.数组的分配和访问](https://www.bilibili.com/video/BV1ho4y1d7J6/) | 09:11 | [阅读笔记](notes/ch03/20_3-8_%E6%95%B0%E7%BB%84%E7%9A%84%E5%88%86%E9%85%8D%E5%92%8C%E8%AE%BF%E9%97%AE.md) | [对照文稿](transcripts/20_3-8_%E6%95%B0%E7%BB%84%E7%9A%84%E5%88%86%E9%85%8D%E5%92%8C%E8%AE%BF%E9%97%AE.md) |
| [3-9.结构体与联合体](https://www.bilibili.com/video/BV1754y1Y7Ut/) | 08:13 | [阅读笔记](notes/ch03/21_3-9_%E7%BB%93%E6%9E%84%E4%BD%93%E4%B8%8E%E8%81%94%E5%90%88%E4%BD%93.md) | [对照文稿](transcripts/21_3-9_%E7%BB%93%E6%9E%84%E4%BD%93%E4%B8%8E%E8%81%94%E5%90%88%E4%BD%93.md) |
| [3-10.缓冲区溢出](https://www.bilibili.com/video/BV1Ry4y1h7bm/) | 06:48 | [阅读笔记](notes/ch03/22_3-10_%E7%BC%93%E5%86%B2%E5%8C%BA%E6%BA%A2%E5%87%BA.md) | [对照文稿](transcripts/22_3-10_%E7%BC%93%E5%86%B2%E5%8C%BA%E6%BA%A2%E5%87%BA.md) |

## 资料来源与阅读约定

- 视频作者：[九曲阑干](https://www.bilibili.com/video/BV1cD4y1D7uR/)。课堂截图保留原视频署名，版权归原作者。
- 课程依据《Computer Systems: A Programmer’s Perspective》（《深入理解计算机系统》）；[视频清单](sources/videos.json)记录本轮标题、顺序、BV 号与时长。
- 示例主要沿用视频中的 Linux、x86-64 和 AT&T 汇编语法。数据类型大小、调用约定与编译结果需要结合具体平台理解。
- 对课堂简化与可能误读之处做了必要说明；额外的理解例子在正文中标注。图片通过 GitHub 在线附件引用，普通拉取仓库不会下载图片文件。
