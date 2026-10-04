# CS336 参考教材与官方源码

这里整理可以与学习笔记对照的官方材料。本批先收录 Lecture 1、2 的 Python 讲义和辅助文件，并提供 Lecture 3、4 的官方课件入口；Lecture 2 另配 5 个可以单独运行的小范例。

## 教材入口

| 讲次 | 主要内容 | 本仓库材料 | 官方材料 |
|---|---|---|---|
| Lecture 1 | 课程概览、语言模型与分词 | [lecture_01.py](官方讲义/lecture_01.py) | [源码](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_01.py) · [可执行讲义](https://cs336.stanford.edu/lectures/?trace=lecture_01) |
| Lecture 2 | PyTorch、einops、计算量与显存估算 | [lecture_02.py](官方讲义/lecture_02.py) · [学习笔记](../notes/Lecture%202%20PyTorch%28einops%29.md) | [源码](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_02.py) · [可执行讲义](https://cs336.stanford.edu/lectures/?trace=lecture_02) |
| Lecture 3 | Transformer 架构 | [学习笔记](../notes/Lecture%203%20Architectures.md) | [官方 PDF](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_03.pdf) |
| Lecture 4 | 注意力替代方案 | [学习笔记](../notes/Lecture%204%20Attention%20Alternatives.md) | [官方 PDF](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_04.pdf) |

官方的 `.py` 文件兼有讲解文字、代码和图片引用，由 `edtrace` 展示执行过程。看完整课堂画面可以打开表中的“可执行讲义”；图片、PDF 和大型执行轨迹通过官方站点查看，仓库主要保存源码与小范例。

本目录与其他资料的关系：`notes/` 用中文解释知识点，`textbooks/` 是按主题整理的长篇学习材料，`参考/官方讲义/` 保存可核对的官方源文件。

## Lecture 2 小范例

| 想弄清什么 | 范例文件 | 运行后可以观察什么 |
|---|---|---|
| 张量内存和 einops 的形状变换 | [lecture02_tensors.py](示例/lecture02_tensors.py) | 128 字节的张量；矩阵乘法与逐行平均；拆头再合并后数据相同 |
| 反向传播怎么算梯度 | [lecture02_gradients.py](示例/lecture02_gradients.py) | 梯度为 `[1, 2, 3]`；手写两个矩阵乘法与自动微分一致 |
| 模型参数、AdaGrad 与训练步骤 | [lecture02_training.py](示例/lecture02_training.py) | 两层模型的 32 个参数被更新；AdaGrad 保存 32 个历史数值 |
| 梯度累积与检查点改变了什么 | [lecture02_memory_saving.py](示例/lecture02_memory_saving.py) | 整批和分批的梯度相同；检查点前后的输出及梯度相同 |
| 算力和显存预算怎样复算 | [lecture02_budget.py](示例/lecture02_budget.py) | 给定条件下约 143.9 天；忽略激活的参数量上界约 53.3B |

这些范例从官方实现中提取关键步骤，用小数据补上结果检查和中文说明。它们使用 CPU；显存优化范例验证的是计算结果，GPU 显存实际能省多少需要另外测量。

5 个范例已在 Python 3.11、PyTorch 2.2.2、einops 0.8.2 的 CPU 环境运行通过，包括手算梯度、梯度累积和检查点结果的一致性检查。

在仓库根目录打开终端，可先运行不需要额外依赖的预算例子：

```bash
python3 Stanford-CS336/参考/示例/lecture02_budget.py
```

其余范例需要 PyTorch 和 einops。可为它们创建独立环境：

```bash
cd Stanford-CS336/参考/示例
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python lecture02_tensors.py
python lecture02_gradients.py
python lecture02_training.py
python lecture02_memory_saving.py
```

源码阅读时，建议从 `main()` 看授课顺序，再查具体函数。Lecture 2 笔记末尾有“知识点—官方函数—范例”的对应表。

## 来源与版本

官方文件来自 [stanford-cs336/lectures](https://github.com/stanford-cs336/lectures)，固定到提交 [`de53a9f`](https://github.com/stanford-cs336/lectures/tree/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e)。

`官方讲义/` 中的 8 个文件按原文保存：`lecture_01.py`、`lecture_02.py`、`facts.py`、`gpu_util.py`、`lecture_util.py`、`references.py`、`pyproject.toml` 和 `README.md`。复制时已逐个核对 Git 文件哈希；原始图片和讲义展示环境仍使用上游资源。需要完整复现官方讲义时，按[官方安装说明](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/README.md)配置。

`示例/` 是本仓库的教学改编，主要调整了数据规模、打印说明和结果检查。训练范例使用 `torch.no_grad()` 更新参数，并让预测与目标形状一致；检查点范例显式使用 `use_reentrant=False`。官方源码副本保持原样，方便逐行对照。

[← 返回 CS336 目录](../README.md)
