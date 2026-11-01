# CS61B 实验索引

这里只同步对应正课的 **Lab 01、02、03**，以及 Hashing 对应的 **Lab 08**。起始代码保留原样，没有代做练习。

| 实验 | 你要完成什么 | 修改范围与运行入口 |
|---|---|---|
| [Lab 01：Setup](lab01/README.md) | 配置开发环境，修复算术逻辑，通过测试 | Arithmetic.java；运行 ArithmeticTest |
| [Lab 02：Debugging I](lab02/README.md) | 使用调试器找出三个阶段输入 | 只改 BombMain.java；从 BombTest 启动 |
| [Lab 03：Debugging II](lab03/README.md) | 定位并修复四个冒险关卡的问题 | 按关卡修改；运行 AdventureGameTests |
| [Lab 08：HashMap](lab08/README.md) | 实现泛型哈希映射，测试并记录性能 | MyHashMap.java、results.txt |

## 打开一个实验

1. 安装/选择 **JDK 17 或更新版本**，IntelliJ 项目的语言级别与 JDK 相匹配。当前电脑未检测到可用 Java Runtime，本次未代装环境。
2. 用 IntelliJ 单独打开相应的 `labNN/starter/`，例如 `lab02/starter/`。不要把四个实验的 src 混到同一个源码根：它们有重复的教学类名。
3. 在 Project Structure 中把 `src/` 标为 Sources，把 `tests/` 标为 Test Sources。
4. 把本目录的 [library](library/) 下所有 JAR 加入该模块依赖；这是从官方 library-sp24 固定版本同步的相关子集，不是整个课程的所有依赖。
5. 按官方说明安装 CS 61B 插件和 Java Visualizer。普通断点与变量查看由 IntelliJ 提供，Visualizer 是 Lab 02 中观察引用结构的辅助工具。
6. **Run/Debug Configuration 的 Working directory 设为该实验的 starter 目录**。测试会相对读取 `src/`、`tests/data/` 等资源；Lab 02 还会读取 Bomb.java 校验是否被修改。
7. 从相应测试类旁的运行/调试按钮开始。调试练习的初始失败是预期现象，先区分依赖缺失、工作目录错误与真正的练习错误。

官方实验混用 JUnit 4 与 JUnit 5。相关 API、engine、Vintage engine、Truth、Guava、algs4 等已同步，文件 SHA-256 见 [来源记录](../reference/lab-sources.json)。IDE 若提示配置 JUnit，按实际 import 识别版本，不要批量替换官方测试注解。

## 每个目录里有什么

- `README.md`：中文目标、步骤、检查点和允许修改范围。
- `official.html` / `official.txt`：官方题目正文的 HTML 与文本快照。
- `faq.html` / `faq.txt`：官方 FAQ 快照。
- `starter/src/`：官方练习源码及需要的资源。
- `starter/tests/`：官方测试与测试数据。

HTML 的 40 张不同来源图片已缓存到 assets，保留原始来源记录；外部链接、嵌入视频与部分页面脚本仍可能需要联网，不能视为完整课程站镜像。起始代码固定于 `67caa5eef7f4a8402313e27476b18edf2b21d727`，依赖库固定于 `6ba6f63aae658fa92dc1c4ec42c053fe33e8a6f2`。

## 自学如何判断完成

读规格 → 用最小输入说明预期 → 做练习 → 本地测试 → 记录原因与修改。Lab 08 还需要真实运行速度测试、填写 results.txt；没有预填模拟数字。

本地测试不等于已提交 Berkeley 课程作业。官方页面中的 Beacon、Gradescope 和学生仓库步骤面向当期选课学生；自学不需要为了使用公开代码而创建这些受限资源。当前副本也没有连接学生仓库或执行提交。

本次完成的是资料同步与中文学习导引，没有宣称练习通过：本机缺少 Java Runtime；Lab 08 原始骨架缺接口实现，编译失败属于待完成状态。

[返回课程索引](../README.md)
