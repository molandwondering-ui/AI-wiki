# Stanford CS336：从头构建大语言模型（35 讲）

斯坦福大学经典的现代大语言模型系统全栈硬核课程，由 Percy Liang、Tatsu Hashimoto、Dan Fu 等顶级学者联袂讲授。从分词机制与底层算子出发，深入现代 Transformer 架构演进、GPU 硬件加速与 Triton 自定义内核编程，覆盖大规模分布式并行训练、扩展定律（Scaling Laws）、自回归推理加速、高质量语料管线与后训练偏好对齐（SFT/RLVR）。全课工程与系统细节极其扎实，是大模型底层实现与系统研发的标杆课程。

- **原视频**：[【极致中配】2026年最新版 Stanford CS336: 从头构建大语言模型](https://www.bilibili.com/video/BV11LEA6eEuj) — Bilibili，BV11LEA6eEuj
- **全 35 集**，已收录 9 册模块全书、18 篇逐讲图文笔记、35 份清洗字幕，以及 19 份带画面的图文转录

## 怎么学

课程主线覆盖大模型研发的全生命周期：**词表分词 → 模型架构 → 硬件加速与内核 → 分布式并行 → 规模法则 → 高效推理 → 数据工程 → 后训练与强化学习**。建议：

- **系统学习大模型全栈** → `textbooks/` 从卷一顺次读到卷五。课程不仅讲模型架构数学推导，更强调系统实现底层：张量操作、自定义 GPU 内核、并行训练与推理吞吐
- **攻坚硬件加速与内核开发** → 重点研读卷三（模块 03、04）。从 GPU 内存层次结构、Roofline 性能瓶颈分析，到 Triton 内核编写与 XLA 编译，是系统工程的核心硬骨头
- **理解预训练与资源规划** → 研读卷四（模块 05）。掌握 Chinchilla 计算最优扩展定律的参数拟合与算力浮点预算方法，避免无效训练开销
- **聚焦推理优化与后训练对齐** → 研读卷四（模块 06）及卷五（模块 08、09）。深入 KV Cache 显存优化、投机解码量化部署，以及从 SFT、DPO 到可验证规则强化学习（RLVR）的全流程
- **按讲次打基础** → 阅读 `notes/` 下的逐讲图文笔记。Lecture 2–4 经过补充整理，会区分课程材料、转录与教学补充
- **核对讲师原话与细节推演** → `subtitles/` 提供全部 35 讲的清洗后逐字稿，适合快速全文检索代码参数、论文出处或具体技术选型背景
- **按画面回看讲解** → `transcripts/` 收录 19 份图文转录，字幕按时间顺序与视频画面并排呈现；图片在线加载

## 逐讲图文笔记

18 篇笔记与配图统一保存在 `notes/`。Lecture 1、5–18 是 [tsingyuec/cs336-blog](https://github.com/tsingyuec/cs336-blog/tree/e966bb4c04d05b76d08db954da55cf4a51bd7a63/blog) 的图文副本；Lecture 2–4 在本仓库原有的基础知识文档上，对照原 blog 补入配图和图注。另有 [基础知识总览](基础知识.md)。

| 讲次 | 笔记 | 版本 |
|---|---|---|
| Lecture 1 | [课程概览与分词](notes/Lecture%201%20课程概览与分词.md) | 原 blog 图文副本 |
| Lecture 2 | [PyTorch、einops 与资源核算](notes/Lecture%202%20PyTorch%28einops%29.md) | 补充版：原有基础知识框架 + blog 配图 |
| Lecture 3 | [现代 Transformer 架构与超参数](notes/Lecture%203%20Architectures.md) | 补充版：原有基础知识框架 + blog 配图 |
| Lecture 4 | [注意力替代方案与混合专家](notes/Lecture%204%20Attention%20Alternatives.md) | 补充版：原有基础知识框架 + blog 配图 |
| Lecture 5 | [GPUs, TPUs](notes/Lecture%205%20GPUs,%20TPUs.md) | 原 blog 图文副本 |
| Lecture 6 | [Kernels, Triton, XLA](notes/Lecture%206%20Kernels,%20Triton,%20XLA.md) | 原 blog 图文副本 |
| Lecture 7 | [Parallelism](notes/Lecture%207%20Parallelism.md) | 原 blog 图文副本 |
| Lecture 8 | [Parallelism](notes/Lecture%208%20Parallelism.md) | 原 blog 图文副本 |
| Lecture 9 | [Scaling Laws](notes/Lecture%209%20Scaling%20Laws.md) | 原 blog 图文副本 |
| Lecture 10 | [Inference](notes/Lecture%2010%20Inference.md) | 原 blog 图文副本 |
| Lecture 11 | [Scaling Laws](notes/Lecture%2011%20Scaling%20Laws.md) | 原 blog 图文副本 |
| Lecture 12 | [Evaluation](notes/Lecture%2012%20Evaluation.md) | 原 blog 图文副本 |
| Lecture 13 | [Data (Sources, Datasets)](notes/Lecture%2013%20Data%20%28Sources,%20Datasets%29.md) | 原 blog 图文副本 |
| Lecture 14 | [Data](notes/Lecture%2014%20Data.md) | 原 blog 图文副本 |
| Lecture 15 | [Mid-Post-Training](notes/Lecture%2015%20Mid-Post-Training.md) | 原 blog 图文副本 |
| Lecture 16 | [Post-Training - RLVR](notes/Lecture%2016%20Post-Training%20-%20RLVR.md) | 原 blog 图文副本 |
| Lecture 17 | [Alignment - Multimodality](notes/Lecture%2017%20Alignment%20-%20Multimodality.md) | 原 blog 图文副本 |
| Lecture 18 | [Guest Lecture Dan Fu](notes/Lecture%2018%20Guest%20Lecture%20Dan%20Fu.md) | 原 blog 图文副本 |

## 模块全书目录

整编为 9 册，按课程主线顺序：

| # | 模块 | 主要内容 |
| ---: | :--- | :--- |
| 01 | [卷一：语言模型基础与分词架构工程](textbooks/模块01_卷一：语言模型基础与分词架构工程_精读全书.md) | 课程概览、语言模型形式化、BPE 算法与 PyTorch 张量编程 |
| 02 | [卷二：现代 Transformer 架构与高效注意力机制](textbooks/模块02_卷二：现代%20Transformer%20架构与高效注意力机制_精读全书.md) | 现代 Transformer 演进、RoPE、FlashAttention 与注意力变体 |
| 03 | [卷三：硬件加速、自定义内核与并行训练体系（上）](textbooks/模块03_卷三：硬件加速、自定义内核与并行训练体系（上）_精读全书.md) | GPU/TPU 硬件体系、Roofline 瓶颈分析与硬件加速基石 |
| 04 | [卷三：硬件加速、自定义内核与并行训练体系（下）](textbooks/模块04_卷三：硬件加速、自定义内核与并行训练体系（下）_精读全书.md) | Triton 自定义内核开发、XLA 编译优化与大规模分布式并行 |
| 05 | [卷四：扩展定律、推理加速与数据工程管线（上）](textbooks/模块05_卷四：扩展定律、推理加速与数据工程管线（上）_精读全书.md) | 扩展定律经验建模、Chinchilla 计算最优前沿与资源核算 |
| 06 | [卷四：扩展定律、推理加速与数据工程管线（中）](textbooks/模块06_卷四：扩展定律、推理加速与数据工程管线（中）_精读全书.md) | 自回归推理瓶颈、KV Cache 显存优化、投机解码与评测基准 |
| 07 | [卷四：扩展定律、推理加速与数据工程管线（下）](textbooks/模块07_卷四：扩展定律、推理加速与数据工程管线（下）_精读全书.md) | 工业级预训练语料清洗、高质量数据过滤、去重与合成数据 |
| 08 | [卷五：模型后训练、强化学习对齐与前沿演进（上）](textbooks/模块08_卷五：模型后训练、强化学习对齐与前沿演进（上）_精读全书.md) | 监督微调 SFT、人类偏好对齐（DPO/RLHF）与 RLVR 强化学习 |
| 09 | [卷五：模型后训练、强化学习对齐与前沿演进（下）](textbooks/模块09_卷五：模型后训练、强化学习对齐与前沿演进（下）_精读全书.md) | 多模态架构前沿、长序列状态空间模型与嘉宾前沿专题 |

## 其他入口

- [逐字稿（35 份）](subtitles/) — 核对讲师原话，以及开发适合自己习惯的课程
- [图文转录（19 份）](transcripts/README.md) — 按时间顺序对照字幕与画面；来源为 [tsingyuec/cs336-blog 的 transcripts](https://github.com/tsingyuec/cs336-blog/tree/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts)

---

> `textbooks/` 与 `subtitles/` 主要由 [Video2Book](https://github.com/LINJIANG12/video2book) 整理；逐讲基础知识文档另行编写，并在文内说明来源。所有笔记均为课程的二次整理，不代表原作者与所属机构的观点。原课程版权归原作者与所属机构所有，仅供个人学习使用。

[← 返回仓库首页](../README.md)
