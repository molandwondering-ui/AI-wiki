# Lecture 4：注意力替代方案与混合专家 · 图文讲解整理版

这节课讨论两个问题：**上下文越来越长，怎样降低读取历史信息的成本？模型参数越来越多，怎样避免每个 token 都执行全部参数的计算？** 前一个问题引出线性注意力、混合架构和稀疏注意力；后一个问题引出混合专家（MoE）。

本文按授课顺序整理，把被字幕切开的句子接起来，合并重复内容，保留主要论证、课堂问答和全部 248 个时间点及画面。正文展示关键画面，其余画面可在各节末尾展开。标为“理解补充”的例子与推导用于连接概念，不是讲师逐字原话。

> **来源与阅读口径**：依据[导入时的图文转录](https://github.com/molandwondering-ui/AI-wiki/blob/ae524df8dc3ff50552618c5e00e3bc99cea35256/Stanford-CS336/transcripts/Lecture%204%20Attention%20Alternatives.md)、[本地清洗字幕](../subtitles/P04_Lecture%204%EF%BC%9A%20Attention%20Alternatives%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)和关键课堂画面整理。字幕中无法确认的型号、数字与人名不再猜填；模型效果按课堂展示的具体实验理解。需要核对原话时，请点击时间戳回到[第 4 集视频](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4)。画面继续使用来源仓库的固定版本链接，需要联网显示。

## 阅读导航

| 时间 | 先带着这个问题读 | 对应内容 |
|---|---|---|
| [00:00–04:01](#part-1) | 长文本为什么贵？实现优化能解决多少？ | Attention、FFN、FlashAttention |
| [04:01–09:13](#part-3) | 为什么换一下括号，就能得到固定大小的记忆？ | 线性注意力、循环形式、初步混合方案 |
| [09:13–18:21](#part-6) | 记忆怎样保留、遗忘和更新？ | Mamba-2、Gated DeltaNet、混合实验与等价性 |
| [18:21–28:04](#part-9) | 能不能保留历史，只精读一小部分？ | DSA、索引器成本、注意力问答 |
| [28:04–45:06](#part-11) | 怎样拥有更多参数，每次只运行少数？ | MoE、专家并行、Top-k 路由 |
| [45:06–59:42](#part-14) | 专家怎样分工，又怎样避免少数专家包揽训练？ | 共享专家、稀疏训练、负载均衡 |
| [59:42–71:46](#part-18) | 真正放到 GPU 上，还要付出哪些成本？ | 通信、稳定性、微调、Upcycling、DeepSeek 架构 |

<a id="part-1"></a>

## 1. 长上下文让哪一部分变贵？（00:00–02:28）

上一讲讨论基础 Transformer 的组件，本讲进一步改造其中的两个主要模块。Attention 让不同位置交换信息；前馈网络 FFN，也称 MLP，则对各位置的表示分别进行加工。

```text
一个 Transformer 块的主要工作（省略归一化与残差）

各位置的表示 → Attention：从可见位置读取信息
             → FFN：分别加工各位置的表示
```

人们希望模型读更长的文档，也希望 Agent 保留更长的任务历史。但序列长度为 n 时，全注意力需要考虑约 n² 个位置对。FFN 的权重在各位置复用，对每个 token 执行一次，因此在模型宽度固定时，其计算量随 n 线性增长。

短序列下，FFN 可能是主要开销；序列足够长时，Attention 的平方级增长会越来越显眼。常见的一种应对方式是局部注意力：多数层只看附近位置，少数层使用全局注意力，例如每八层保留一层全局注意力。

**理解补充：这里的“平方级”指处理整段序列。** 因果注意力只允许当前位置读取自己及之前的位置，位置对数量约为 n(n+1)/2，仍是平方级。使用 KV cache 生成一个新 token 时，新查询只与已有历史匹配，单步随历史长度约线性增长，不能把整段的 n² 直接套到单步解码上。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00083.jpg" alt="上下文窗口增长，以及 Attention 与 FFN 的计算量随序列长度变化的对比" width="960">

*课堂画面：上下文窗口增长，以及 Attention 与 FFN 的计算量随序列长度变化的对比。[跳转到 01:23](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=83)。*

<details>
<summary>展开本节其余 7 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [00:00](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=0) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00000.jpg" alt="00:00 原始课堂画面" width="480" loading="lazy"> |
| [00:05](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=5) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00005.jpg" alt="00:05 原始课堂画面" width="480" loading="lazy"> |
| [00:10](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=10) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00010.jpg" alt="00:10 原始课堂画面" width="480" loading="lazy"> |
| [00:35](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=35) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00035.jpg" alt="00:35 原始课堂画面" width="480" loading="lazy"> |
| [00:58](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=58) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00058.jpg" alt="00:58 原始课堂画面" width="480" loading="lazy"> |
| [01:48](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=108) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00108.jpg" alt="01:48 原始课堂画面" width="480" loading="lazy"> |
| [02:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=123) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00123.jpg" alt="02:03 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-2"></a>

## 2. FlashAttention 为什么有效，又为什么还不够？（02:28–04:01）

讲师先提醒：分析算法不能只看大 O 记号。计算要从哪里读取数据、需要搬运多少数据、GPU 是否被充分利用，都影响实际速度。

FlashAttention 重新组织注意力计算，分块处理数据，避免把完整的 n×n 注意力矩阵写入显存再读回来。课堂对比显示，它能明显改善吞吐量，也能处理朴素实现因中间矩阵过大而无法运行的长度。

这仍然是在计算全注意力。**FlashAttention 减少了内存搬运和中间存储，没有消除全注意力对序列长度的平方级计算依赖。** 当上下文继续增长，就需要考虑改变读取信息的方式。

**理解补充**：可以把它理解成重新安排查书的流程，减少搬书和等待；接下来的方法则进一步减少需要做的比较，或改变历史的保存方式。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00173.jpg" alt="FlashAttention 与朴素实现的性能比较，展示系统优化带来的实际收益" width="960">

*课堂画面：FlashAttention 与朴素实现的性能比较，展示系统优化带来的实际收益。[跳转到 02:53](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=173)。*

<details>
<summary>展开本节其余 3 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [02:28](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=148) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00148.jpg" alt="02:28 原始课堂画面" width="480" loading="lazy"> |
| [03:18](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=198) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00198.jpg" alt="03:18 原始课堂画面" width="480" loading="lazy"> |
| [03:43](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=223) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00223.jpg" alt="03:43 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-3"></a>

## 3. 线性注意力的起点：为什么可以换括号？（04:01–06:06）

讲师从矩阵乘法的结合律切入。先看普通注意力：Query 与 Key 计算匹配分数，softmax 把分数转成权重，再用这些权重汇总 Value。

**理解补充：Q、K、V 分别在做什么？** Q 表示当前位置要寻找的线索；K 用来与查询匹配；V 是匹配后要读取的内容。它们都是由输入表示经过投影得到的向量，并不是自然语言标签。

对一个注意力头，设序列长度为 n，Key 和 Value 的维度分别是 d_k、d_v：

$$
Q,K\in\mathbb{R}^{n\times d_k},\qquad V\in\mathbb{R}^{n\times d_v}
$$

暂不写因果掩码，标准注意力的核心形式是：

$$
Y=\operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

先算 QKᵀ，会得到 n×n 的位置匹配矩阵。讲师接着做了一个教学上的改动：**先去掉 softmax，并省略缩放因子**，观察剩余的矩阵乘法。此时才可以写成：

$$
(QK^\top)V=Q(K^\top V)
$$

| 计算顺序 | 中间矩阵 | 含义 |
|---|---|---|
| 先算 QKᵀ，再乘 V | n×n | 先得到各个位置之间的匹配分数 |
| 先算 KᵀV，再乘 Q | d_k×d_v | 先把 Key 与 Value 的关联汇总，再供 Query 读取 |

**理解补充：看一个尺寸例子。** n=10,000、d_k=d_v=64 时，两种中间矩阵分别是 10,000×10,000 和 64×64。右边不是完全不需要计算，而是避免了那个随 n² 增长的中间结果；其主要运算量约为 O(n d_k d_v)，固定头维度后，对 n 呈线性增长。

要特别注意：softmax 是非线性操作，不能跨过它直接移动括号。这里得到的是改变了机制的教学版本，并非普通 softmax Attention 的无损加速。实际的线性注意力还需要特征映射、归一化或门控等设计。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00316.jpg" alt="去掉 softmax 后利用结合律重排矩阵乘法，将中间矩阵从 n×n 改为 d_k×d_v" width="960">

*课堂画面：去掉 softmax 后利用结合律重排矩阵乘法，将中间矩阵从 n×n 改为 d_k×d_v。[跳转到 05:16](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=316)。*

<details>
<summary>展开本节其余 4 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [04:01](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=241) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00241.jpg" alt="04:01 原始课堂画面" width="480" loading="lazy"> |
| [04:26](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=266) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00266.jpg" alt="04:26 原始课堂画面" width="480" loading="lazy"> |
| [04:51](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=291) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00291.jpg" alt="04:51 原始课堂画面" width="480" loading="lazy"> |
| [05:41](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=341) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00341.jpg" alt="05:41 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-4"></a>

## 4. 从矩阵乘法到循环记忆：中间缺了哪一步？（06:06–07:46）

上一步把 KᵀV 当成整体计算。讲师接着指出，这个矩阵也可以从左到右逐步累加，因此能写成类似循环神经网络 RNN 的形式。

**理解补充：把 KᵀV 展开，就能看见这座桥。** 本文统一把单个 q_t、k_t、v_t 写成列向量：

$$
K^\top V=\sum_{i=1}^{n}k_i v_i^\top
$$

每个位置贡献一个大小为 d_k×d_v 的外积矩阵。把它们相加，就得到历史 Key 与 Value 的关联状态。这里不是把文本保存成一份可逐字还原的摘要，而是把许多关联混合进同一块数值状态。

对于自回归语言模型，位置 t 只能使用截至 t 的信息，因此不能让所有位置共用全序列的 KᵀV。应当改用各自的前缀状态：

$$
S_0=0,\qquad S_t=S_{t-1}+k_t v_t^\top,\qquad y_t=S_t^\top q_t
$$

如果前三个位置写入的信息分别是 A、B、C，那么 S₁=A，S₂=A+B，S₃=A+B+C。每个位置使用自己的记忆，不会读到未来。S_t 的形状始终是 d_k×d_v，不随已经读过的 token 数增加。

由此得到两种执行方式。训练时，各位置在当前层的输入已知，可以利用前缀扫描、分块等并行算法计算状态；生成时，新 token 逐个到来，每次只更新状态并读取输出。**并行形式适合训练，循环形式适合逐步解码。** 这不意味着训练时无需保存任何中间激活，也不意味着所有 RNN 都能如此并行。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00391.jpg" alt="线性注意力的循环形式，每个位置更新固定大小的状态，再由 Query 读取" width="960">

*课堂画面：线性注意力的循环形式，每个位置更新固定大小的状态，再由 Query 读取。[跳转到 06:31](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=391)。*

<details>
<summary>展开本节其余 3 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [06:06](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=366) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00366.jpg" alt="06:06 原始课堂画面" width="480" loading="lazy"> |
| [06:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=416) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00416.jpg" alt="06:56 原始课堂画面" width="480" loading="lazy"> |
| [07:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=441) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00441.jpg" alt="07:21 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-5"></a>

## 5. 第一种折中：多数层用线性机制，部分层保留全注意力（07:46–09:13）

有了更省的线性机制，下一步自然是看它能否用于实际模型。讲师以 MiniMax-M1 为例，介绍了七个线性注意力层搭配一个完整 softmax 注意力层的混合方案。课堂展示的模型比较说明，这类混合方案可以具有较强的实际竞争力。

**理解补充：为什么还要留下一层完整注意力？** 固定大小的状态把许多历史信息混合在一起，长文本中的某个细节可能难以保留。全注意力层保存各历史位置的 K/V 表示，可以根据当前查询直接读取这些位置。

因此，混合架构让多数层承担较便宜的状态更新，同时用部分全注意力层保留更直接的历史读取能力。全注意力层使用的是自己这一层的 K/V，并不是其他层共享的一本原文档案。

只要还保留全注意力层，固定层数配置下就仍有平方级计算项。这里节省的是全注意力层的数量和实际开销，不能把整个模型称为严格的线性时间模型；7:1 也只是课堂中的设计例子。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00491.jpg" alt="MiniMax-M1 的混合注意力设计及课堂展示的模型比较" width="960">

*课堂画面：MiniMax-M1 的混合注意力设计及课堂展示的模型比较。[跳转到 08:11](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=491)。*

<details>
<summary>展开本节其余 4 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [07:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=466) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00466.jpg" alt="07:46 原始课堂画面" width="480" loading="lazy"> |
| [08:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=516) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00516.jpg" alt="08:36 原始课堂画面" width="480" loading="lazy"> |
| [08:45](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=525) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00525.jpg" alt="08:45 原始课堂画面" width="480" loading="lazy"> |
| [08:50](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=530) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00530.jpg" alt="08:50 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-6"></a>

## 6. Mamba-2：旧记忆应该保留多少？（09:13–11:50）

最简单的线性状态只会不断累加。如果早期信息持续留在状态里，后续更新可能受到干扰。讲师借助 LSTM 的门控直觉提出：模型应该能决定旧状态向后传递多少。

Mamba-2 可以从状态空间模型的角度推导；在这里，讲师用对线性状态更新的扩展来解释其主要机制：

$$
S_t=\gamma_t S_{t-1}+k_t v_t^\top
$$

γ_t 是由当前层输入 x_t 决定的衰减门。它控制旧状态的保留程度：保留系数较大，旧信息延续得更多；较小，则衰减得更快。这只是主要状态更新的示意，不是完整实现。

课堂画面还写出了输出中的直通项。统一为本文的列向量记法，可表示为 y_t=S_tᵀq_t+Dᵀv_t。它让当前 Value 的一部分直接进入输出。原转录把这段讲得像是在修改 Value 的状态写入；从画面看，应区分**状态更新**和**输出的直通分支**。

门控只依赖当前层输入，而没有任意复杂的状态依赖，使这种更新仍能设计出适合训练的并行计算形式。讲师随后展示将 Mamba-2 与 softmax Attention 交替使用的模型，说明这种机制已经可以参与实际的混合架构。

**理解补充**：这里的“只依赖输入”，是指门控不额外依赖这一循环的旧状态 S_t₋₁。当前层输入本身可以已经包含前面网络层提取的上下文信息。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00603.jpg" alt="Mamba-2 在状态更新中加入衰减门 gamma，并在输出中加入 Value 的直通项" width="960">

*课堂画面：Mamba-2 在状态更新中加入衰减门 gamma，并在输出中加入 Value 的直通项。[跳转到 10:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=603)。*

<details>
<summary>展开本节其余 6 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [09:13](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=553) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00553.jpg" alt="09:13 原始课堂画面" width="480" loading="lazy"> |
| [09:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=578) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00578.jpg" alt="09:38 原始课堂画面" width="480" loading="lazy"> |
| [10:28](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=628) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00628.jpg" alt="10:28 原始课堂画面" width="480" loading="lazy"> |
| [10:53](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=653) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00653.jpg" alt="10:53 原始课堂画面" width="480" loading="lazy"> |
| [11:00](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=660) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00660.jpg" alt="11:00 原始课堂画面" width="480" loading="lazy"> |
| [11:25](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=685) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00685.jpg" alt="11:25 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-7"></a>

## 7. Gated DeltaNet：不仅决定写多少，还要处理旧记录（11:50–15:04）

讲师继续扩展门控思想。除控制旧状态的 γ_t 外，Gated DeltaNet 还引入写入门 β_t。β_t 为零时，当前 Key/Value 不写入状态；旧状态是否衰减，仍由 γ_t 决定。

DeltaNet 的另一项关键机制是：准备写入某个 Key 的新信息时，先削弱状态中与这个 Key 方向相关的旧内容。课堂给出的主要更新形式是：

$$
S_t=\gamma_t\bigl(I-\beta_t k_t k_t^\top\bigr)S_{t-1}+\beta_t k_t v_t^\top
$$

可以把它分成三个动作：用 γ_t 调节旧记忆的总体保留；用含 k_t 的项削弱相关旧内容；再用 β_t 控制新关联的写入。

**理解补充：为什么不能一直相加？** 想象状态先后接收到“某对象现在是 A”和“同一对象现在改成 B”。一直叠加可能让新旧关联相互干扰；定向更新则试图减少旧关联的影响。实际 Key 是学习到的向量，不是数据库里精确唯一的字段，这个例子只说明动机。

“投影擦除”也是直觉说法。当 k_t 为单位向量且 β_t=1 时，I−k_tk_tᵀ 才是去掉该方向的正交投影；一般条件下应理解为对相关方向的削弱。

讲师还指出，类似更新会出现在在线最小二乘、快速权重和测试时训练等研究中。不同出发点有时会导向相近的更新规则；这不表示所有这些方法都等同于同一个完整模型。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00835.jpg" alt="Gated DeltaNet 的衰减门、写入门和沿当前 Key 方向削弱旧状态的更新公式" width="960">

*课堂画面：Gated DeltaNet 的衰减门、写入门和沿当前 Key 方向削弱旧状态的更新公式。[跳转到 13:55](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=835)。*

<details>
<summary>展开本节其余 7 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [11:50](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=710) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00710.jpg" alt="11:50 原始课堂画面" width="480" loading="lazy"> |
| [12:15](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=735) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00735.jpg" alt="12:15 原始课堂画面" width="480" loading="lazy"> |
| [12:40](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=760) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00760.jpg" alt="12:40 原始课堂画面" width="480" loading="lazy"> |
| [13:05](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=785) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00785.jpg" alt="13:05 原始课堂画面" width="480" loading="lazy"> |
| [13:30](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=810) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00810.jpg" alt="13:30 原始课堂画面" width="480" loading="lazy"> |
| [14:20](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=860) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00860.jpg" alt="14:20 原始课堂画面" width="480" loading="lazy"> |
| [14:45](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=885) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00885.jpg" alt="14:45 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-8"></a>

## 8. 混合比例的实验，以及“等价”到底指什么（15:04–18:21）

讲师展示了三个 Gated DeltaNet 层搭配一个全注意力层的模型例子，并比较长上下文解码吞吐量与任务表现。课堂结果说明，合适的混合方案可以减少成本，同时维持较强的能力。

另一组受控实验逐步增加非全注意力层的比例。部分机制在较低替换比例下损失不大，但随着比例继续增大，长上下文和问答等任务的表现下降；完全切换到循环状态机制时，下降更加明显。不同任务的敏感程度不同，不能仅凭单针检索表现就判断所有长上下文能力。

> **课堂问答：既然并行形式和循环形式等价，为什么表现还会不同？**（17:07–17:32）
>
> 需要区分两次变化。第一次从 softmax Attention 改为线性机制，已经改变了模型，输出不保证相同；第二次在选定的线性机制内部，把并行写法改成循环写法，才是数学上可以等价的转换。

```text
softmax Attention
    ↓ 改变机制，不保证等价
选定的线性注意力
    ↔ 对同一规则改写计算形式
循环更新状态
```

这也是阅读前面所有公式时最重要的边界。讲师补充提到的 Value 直通项和输出门，则是对输出路径的进一步设计，应与历史状态怎样更新分别理解。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00904.jpg" alt="混合架构的模型表现与长上下文解码吞吐比较，用来观察效率和能力的取舍" width="960">

*课堂画面：混合架构的模型表现与长上下文解码吞吐比较，用来观察效率和能力的取舍。[跳转到 15:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=904)。*

<details>
<summary>展开本节其余 13 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [15:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=929) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00929.jpg" alt="15:29 原始课堂画面" width="480" loading="lazy"> |
| [15:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=936) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00936.jpg" alt="15:36 原始课堂画面" width="480" loading="lazy"> |
| [16:01](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=961) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00961.jpg" alt="16:01 原始课堂画面" width="480" loading="lazy"> |
| [16:26](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=986) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/00986.jpg" alt="16:26 原始课堂画面" width="480" loading="lazy"> |
| [16:51](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1011) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01011.jpg" alt="16:51 原始课堂画面" width="480" loading="lazy"> |
| [17:02](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1022) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01022.jpg" alt="17:02 原始课堂画面" width="480" loading="lazy"> |
| [17:07](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1027) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01027.jpg" alt="17:07 原始课堂画面" width="480" loading="lazy"> |
| [17:32](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1052) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01052.jpg" alt="17:32 原始课堂画面" width="480" loading="lazy"> |
| [17:39](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1059) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01059.jpg" alt="17:39 原始课堂画面" width="480" loading="lazy"> |
| [17:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1064) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01064.jpg" alt="17:44 原始课堂画面" width="480" loading="lazy"> |
| [17:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1069) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01069.jpg" alt="17:49 原始课堂画面" width="480" loading="lazy"> |
| [17:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1076) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01076.jpg" alt="17:56 原始课堂画面" width="480" loading="lazy"> |
| [18:15](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1095) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01095.jpg" alt="18:15 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-9"></a>

## 9. DSA：先便宜地筛选，再对少数位置仔细计算（18:21–21:56）

线性机制通过固定状态汇总历史。讲师接着介绍另一种路线：保留历史位置，但每次只选择其中一小部分参与昂贵的注意力计算。这就是课堂讨论的 DeepSeek Sparse Attention，简称 DSA。

其前向过程可以分为两步。先用轻量索引器给候选历史位置打分，对当前 Query 选出分数最高的 k 个位置；再只对这些位置运行较昂贵的注意力计算，汇总对应的 Value。

```text
当前 Query + 候选历史位置
          ↓ 轻量索引器打分
       选出 Top-k 位置
          ↓ 对选中位置计算注意力
          输出
```

**理解补充：把它和固定状态分开记。** 固定状态像是边读边更新一份容量有限的笔记；稀疏选择像是保留材料，每次先筛出相关段落再精读。前者可能在汇总时丢失细节，后者可能在筛选时漏掉关键位置。

讲师还介绍了一种训练流程：先训练普通的较短上下文模型，再在长上下文扩展阶段加入索引器并继续训练。模型需要学习适应稀疏选择，并不是把一个未经训练的筛选器接上去就能获得相同效果。

课堂展示的模型对比与消融实验，说明这种路线在相应设置中能改善预填充和解码成本，并保持接近完整注意力的表现。但索引器仍对候选位置打分，整段计算中仍有 n² 级的位置对，因此 DSA 不能直接归为线性注意力。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01151.jpg" alt="DSA 使用轻量索引器选择历史位置，再对选中位置执行较昂贵的注意力计算" width="960">

*课堂画面：DSA 使用轻量索引器选择历史位置，再对选中位置执行较昂贵的注意力计算。[跳转到 19:11](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1151)。*

<details>
<summary>展开本节其余 8 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [18:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1101) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01101.jpg" alt="18:21 原始课堂画面" width="480" loading="lazy"> |
| [18:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1126) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01126.jpg" alt="18:46 原始课堂画面" width="480" loading="lazy"> |
| [19:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1176) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01176.jpg" alt="19:36 原始课堂画面" width="480" loading="lazy"> |
| [20:01](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1201) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01201.jpg" alt="20:01 原始课堂画面" width="480" loading="lazy"> |
| [20:26](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1226) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01226.jpg" alt="20:26 原始课堂画面" width="480" loading="lazy"> |
| [20:51](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1251) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01251.jpg" alt="20:51 原始课堂画面" width="480" loading="lazy"> |
| [21:16](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1276) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01276.jpg" alt="21:16 原始课堂画面" width="480" loading="lazy"> |
| [21:40](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1300) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01300.jpg" alt="21:40 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-10"></a>

## 10. 注意力问答：复杂度、训练阶段与信息容量（21:56–28:04）

**问：索引器仍是平方级，为什么还能加速？**（22:09–22:38）

答：关键在于把大部分位置对的计算换成很便宜的打分，再把较贵的计算限制在少数选中位置上。对于长度 n、每个 Query 选 k 个历史位置的情况，较贵部分只处理约 nk 个位置对；它不是对每个选中集合再做一次无关的 k×k 自注意力。

**理解补充**：若忽略具体维度和实现细节，可以把总成本粗略记为“便宜的 n² 项 + 昂贵的 nk 项”。虽然仍有平方项，常数却可能小得多。这与本讲开头强调的系统效率相呼应。

**问：索引器在哪个阶段训练？k 会随上下文无限增加吗？**（23:09–24:14）

答：课堂描述的流程是短上下文预训练、长上下文扩展，再进行后训练。索引器可以在长上下文扩展阶段引入。选取的位置数有预算或上限，具体 k 需要根据效果和成本决定。这里应区分长上下文继续预训练与之后的指令、偏好等后训练。

**问：这些注意力替代方案会不会更不稳定？**（24:30–24:44）

答：讲师没有认为去掉 softmax 必然造成新的主要稳定性问题，并提醒 softmax 本身涉及指数与归一化，数值处理也有难点。这个回答不能推广为所有线性或状态模型都天然稳定，仍需看具体归一化、门控和训练实现。

**问：未来还会有什么注意力架构？**（24:49–25:48）

答：讲师没有给出确定配方，而是认为多种有效方法可能继续组合。更高层的方向，是通过后训练让模型更主动地管理上下文，把压缩、检索等机制与模型内部计算更紧密地结合。这是研究展望。

**问：能否用 FP4、FP8 等低精度计算注意力？**（25:54–26:31）

答：一种设计思路是用便宜、较低精度的运算筛选位置，再用更高精度完成选中内容的加权汇总。softmax 对数值误差较敏感，完整注意力能降到什么精度，需要具体实现和实验支持。原字幕对此表述不一致，这里保留其设计动机，不把它写成已验证的统一结论。

**问：固定状态这么省，为什么不全部使用它？**（26:36–27:46）

答：主要取舍在表达能力和信息容量。普通注意力可以直接读取各个历史位置；固定状态则必须把越来越长的历史传递在有限容量中。扩大状态能缓解容量问题，却又增加计算和存储成本。现代状态模型改善了并行训练效率，但没有因此消除这个取舍。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01642.jpg" alt="注意力部分的课堂问答，讨论固定状态容量与长上下文信息保留之间的取舍" width="960">

*课堂画面：注意力部分的课堂问答，讨论固定状态容量与长上下文信息保留之间的取舍。[跳转到 27:22](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1642)。*

<details>
<summary>展开本节其余 46 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [21:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1316) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01316.jpg" alt="21:56 原始课堂画面" width="480" loading="lazy"> |
| [22:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1324) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01324.jpg" alt="22:04 原始课堂画面" width="480" loading="lazy"> |
| [22:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1329) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01329.jpg" alt="22:09 原始课堂画面" width="480" loading="lazy"> |
| [22:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1334) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01334.jpg" alt="22:14 原始课堂画面" width="480" loading="lazy"> |
| [22:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1341) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01341.jpg" alt="22:21 原始课堂画面" width="480" loading="lazy"> |
| [22:26](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1346) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01346.jpg" alt="22:26 原始课堂画面" width="480" loading="lazy"> |
| [22:33](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1353) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01353.jpg" alt="22:33 原始课堂画面" width="480" loading="lazy"> |
| [22:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1358) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01358.jpg" alt="22:38 原始课堂画面" width="480" loading="lazy"> |
| [23:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1383) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01383.jpg" alt="23:03 原始课堂画面" width="480" loading="lazy"> |
| [23:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1389) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01389.jpg" alt="23:09 原始课堂画面" width="480" loading="lazy"> |
| [23:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1394) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01394.jpg" alt="23:14 原始课堂画面" width="480" loading="lazy"> |
| [23:19](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1399) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01399.jpg" alt="23:19 原始课堂画面" width="480" loading="lazy"> |
| [23:32](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1412) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01412.jpg" alt="23:32 原始课堂画面" width="480" loading="lazy"> |
| [23:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1418) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01418.jpg" alt="23:38 原始课堂画面" width="480" loading="lazy"> |
| [23:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1424) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01424.jpg" alt="23:44 原始课堂画面" width="480" loading="lazy"> |
| [23:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1429) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01429.jpg" alt="23:49 原始课堂画面" width="480" loading="lazy"> |
| [23:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1434) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01434.jpg" alt="23:54 原始课堂画面" width="480" loading="lazy"> |
| [23:59](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1439) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01439.jpg" alt="23:59 原始课堂画面" width="480" loading="lazy"> |
| [24:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1444) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01444.jpg" alt="24:04 原始课堂画面" width="480" loading="lazy"> |
| [24:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1449) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01449.jpg" alt="24:09 原始课堂画面" width="480" loading="lazy"> |
| [24:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1454) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01454.jpg" alt="24:14 原始课堂画面" width="480" loading="lazy"> |
| [24:20](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1460) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01460.jpg" alt="24:20 原始课堂画面" width="480" loading="lazy"> |
| [24:25](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1465) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01465.jpg" alt="24:25 原始课堂画面" width="480" loading="lazy"> |
| [24:30](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1470) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01470.jpg" alt="24:30 原始课堂画面" width="480" loading="lazy"> |
| [24:35](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1475) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01475.jpg" alt="24:35 原始课堂画面" width="480" loading="lazy"> |
| [24:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1484) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01484.jpg" alt="24:44 原始课堂画面" width="480" loading="lazy"> |
| [24:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1489) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01489.jpg" alt="24:49 原始课堂画面" width="480" loading="lazy"> |
| [24:55](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1495) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01495.jpg" alt="24:55 原始课堂画面" width="480" loading="lazy"> |
| [25:02](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1502) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01502.jpg" alt="25:02 原始课堂画面" width="480" loading="lazy"> |
| [25:18](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1518) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01518.jpg" alt="25:18 原始课堂画面" width="480" loading="lazy"> |
| [25:23](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1523) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01523.jpg" alt="25:23 原始课堂画面" width="480" loading="lazy"> |
| [25:28](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1528) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01528.jpg" alt="25:28 原始课堂画面" width="480" loading="lazy"> |
| [25:48](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1548) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01548.jpg" alt="25:48 原始课堂画面" width="480" loading="lazy"> |
| [25:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1554) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01554.jpg" alt="25:54 原始课堂画面" width="480" loading="lazy"> |
| [26:01](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1561) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01561.jpg" alt="26:01 原始课堂画面" width="480" loading="lazy"> |
| [26:18](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1578) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01578.jpg" alt="26:18 原始课堂画面" width="480" loading="lazy"> |
| [26:25](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1585) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01585.jpg" alt="26:25 原始课堂画面" width="480" loading="lazy"> |
| [26:31](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1591) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01591.jpg" alt="26:31 原始课堂画面" width="480" loading="lazy"> |
| [26:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1596) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01596.jpg" alt="26:36 原始课堂画面" width="480" loading="lazy"> |
| [26:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1604) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01604.jpg" alt="26:44 原始课堂画面" width="480" loading="lazy"> |
| [27:01](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1621) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01621.jpg" alt="27:01 原始课堂画面" width="480" loading="lazy"> |
| [27:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1629) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01629.jpg" alt="27:09 原始课堂画面" width="480" loading="lazy"> |
| [27:17](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1637) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01637.jpg" alt="27:17 原始课堂画面" width="480" loading="lazy"> |
| [27:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1656) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01656.jpg" alt="27:36 原始课堂画面" width="480" loading="lazy"> |
| [27:41](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1661) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01661.jpg" alt="27:41 原始课堂画面" width="480" loading="lazy"> |
| [27:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1666) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01666.jpg" alt="27:46 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-11"></a>

## 11. MoE：为什么参数可以增加，单次计算却不同比例增加？（28:04–32:34）

课程接下来转向 Transformer 的另一部分：FFN。混合专家 Mixture of Experts 的基本设计，是准备多个 FFN，再由一个路由器为每个 token 选择少数几个执行。

讲师给出的例子是：原来有一个 FFN，现在准备四个同样大小的 FFN。假设每个 token 只选一个，那么 FFN 总参数约为原来的四倍，每个 token 的专家计算仍约为一个 FFN 的量。

```text
原来：token → 一个 FFN

MoE：token → 路由器 → 从多个 FFN 中选少数几个 → 合并输出
```

这就是 MoE 最重要的区别：**总参数量表示模型拥有多少参数；激活参数量表示这次计算实际动用了多少参数。** 未选中的专家本次不执行，并不意味着它们不存在或不占存储。

课堂引用的 Switch Transformer、OLMoE 等实验显示，在相应的计算预算和设置下，增加专家可以改善语言建模损失或下游任务表现。其意义是更多参数可以分担不同输入的处理，而每个输入不必使用所有参数。

**理解补充**：四倍参数的说法只针对这个 FFN 例子，不能直接当成整个模型四倍大。如果每次选两个专家，就需要运行两个 FFN；路由、合并、通信也有额外开销。因此“激活计算接近不变”不是“显存、延迟和总成本全部不变”。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01754.jpg" alt="用路由器选择少数专家 FFN，替换原本单个稠密 FFN 的 MoE 结构" width="960">

*课堂画面：用路由器选择少数专家 FFN，替换原本单个稠密 FFN 的 MoE 结构。[跳转到 29:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1754)。*

<details>
<summary>展开本节其余 11 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [28:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1684) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01684.jpg" alt="28:04 原始课堂画面" width="480" loading="lazy"> |
| [28:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1709) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01709.jpg" alt="28:29 原始课堂画面" width="480" loading="lazy"> |
| [28:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1724) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01724.jpg" alt="28:44 原始课堂画面" width="480" loading="lazy"> |
| [28:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1729) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01729.jpg" alt="28:49 原始课堂画面" width="480" loading="lazy"> |
| [29:39](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1779) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01779.jpg" alt="29:39 原始课堂画面" width="480" loading="lazy"> |
| [30:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1804) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01804.jpg" alt="30:04 原始课堂画面" width="480" loading="lazy"> |
| [30:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1829) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01829.jpg" alt="30:29 原始课堂画面" width="480" loading="lazy"> |
| [30:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1854) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01854.jpg" alt="30:54 原始课堂画面" width="480" loading="lazy"> |
| [31:19](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1879) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01879.jpg" alt="31:19 原始课堂画面" width="480" loading="lazy"> |
| [31:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1904) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01904.jpg" alt="31:44 原始课堂画面" width="480" loading="lazy"> |
| [32:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1929) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01929.jpg" alt="32:09 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-12"></a>

## 12. 专家并行的机会，以及 MoE 为什么不容易部署（32:34–39:25）

每个专家都是相对独立的 FFN 模块，因此可以自然地放到不同设备上，再把 token 的激活值发送到选中专家所在的设备。这称为专家并行，为大模型提供了额外的切分方式。

**问：设备之间传来传去，会不会出现通信瓶颈？**（34:27–35:00）

答：会。专家并行增加了可用计算和分布式存储容量，也带来了激活值传输、结果汇集和调度成本。是否划算取决于设备数量、网络拓扑、批量规模和专家分布；并不是设备越多就一定越快。

**问：训练时可以让所有专家都运行一遍，看看谁更适合吗？**（35:12–35:43）

答：这样确实更容易比较，但也要支付全部专家的计算成本。MoE 在训练阶段同样需要保持稀疏，因此只看得到被选中专家的表现。路由器必须在缺少其他候选结果的情况下学习选择，这正是后面训练部分的难点。

**问：路由是给整道题选一个“领域专家”吗？**（35:51–36:03）

答：课堂主要讨论 token 级路由。路由器通常只做很小的投影或内积计算，根据当前 token 在这一层的表示给专家打分。同一句话的不同 token、同一个 token 在不同层，都可能走不同专家。

**理解补充**：专家通常不是人工命名的医学、法律等模块；但路由输入可以包含上下文信息，也不能据此断言路由完全不可能反映语义。其实际分工需要观察模型，而不能只凭“专家”这个名字想象。

讲师随后回顾了 MoE 的研究和部署进展。稀疏参数多、基础设施复杂、负载和训练稳定性难处理，都是其普及需要时间的原因。也有将专家机制用于 Attention 的研究，但本讲的主要对象是替换 FFN 的主流设计。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02004.jpg" alt="专家分布到不同设备的并行方式，以及路由激活值带来的通信开销" width="960">

*课堂画面：专家分布到不同设备的并行方式，以及路由激活值带来的通信开销。[跳转到 33:24](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2004)。*

<details>
<summary>展开本节其余 28 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [32:34](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1954) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01954.jpg" alt="32:34 原始课堂画面" width="480" loading="lazy"> |
| [32:59](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=1979) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/01979.jpg" alt="32:59 原始课堂画面" width="480" loading="lazy"> |
| [33:41](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2021) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02021.jpg" alt="33:41 原始课堂画面" width="480" loading="lazy"> |
| [34:02](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2042) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02042.jpg" alt="34:02 原始课堂画面" width="480" loading="lazy"> |
| [34:27](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2067) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02067.jpg" alt="34:27 原始课堂画面" width="480" loading="lazy"> |
| [34:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2078) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02078.jpg" alt="34:38 原始课堂画面" width="480" loading="lazy"> |
| [34:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2089) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02089.jpg" alt="34:49 原始课堂画面" width="480" loading="lazy"> |
| [35:00](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2100) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02100.jpg" alt="35:00 原始课堂画面" width="480" loading="lazy"> |
| [35:12](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2112) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02112.jpg" alt="35:12 原始课堂画面" width="480" loading="lazy"> |
| [35:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2129) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02129.jpg" alt="35:29 原始课堂画面" width="480" loading="lazy"> |
| [35:34](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2134) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02134.jpg" alt="35:34 原始课堂画面" width="480" loading="lazy"> |
| [35:43](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2143) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02143.jpg" alt="35:43 原始课堂画面" width="480" loading="lazy"> |
| [35:51](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2151) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02151.jpg" alt="35:51 原始课堂画面" width="480" loading="lazy"> |
| [35:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2156) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02156.jpg" alt="35:56 原始课堂画面" width="480" loading="lazy"> |
| [36:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2163) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02163.jpg" alt="36:03 原始课堂画面" width="480" loading="lazy"> |
| [36:24](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2184) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02184.jpg" alt="36:24 原始课堂画面" width="480" loading="lazy"> |
| [36:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2189) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02189.jpg" alt="36:29 原始课堂画面" width="480" loading="lazy"> |
| [36:34](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2194) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02194.jpg" alt="36:34 原始课堂画面" width="480" loading="lazy"> |
| [36:39](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2199) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02199.jpg" alt="36:39 原始课堂画面" width="480" loading="lazy"> |
| [36:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2204) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02204.jpg" alt="36:44 原始课堂画面" width="480" loading="lazy"> |
| [36:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2209) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02209.jpg" alt="36:49 原始课堂画面" width="480" loading="lazy"> |
| [36:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2214) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02214.jpg" alt="36:54 原始课堂画面" width="480" loading="lazy"> |
| [37:19](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2239) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02239.jpg" alt="37:19 原始课堂画面" width="480" loading="lazy"> |
| [37:36](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2256) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02256.jpg" alt="37:36 原始课堂画面" width="480" loading="lazy"> |
| [37:55](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2275) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02275.jpg" alt="37:55 原始课堂画面" width="480" loading="lazy"> |
| [38:20](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2300) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02300.jpg" alt="38:20 原始课堂画面" width="480" loading="lazy"> |
| [38:45](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2325) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02325.jpg" alt="38:45 原始课堂画面" width="480" loading="lazy"> |
| [39:00](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2340) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02340.jpg" alt="39:00 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-13"></a>

## 13. 路由器怎样选专家？（39:25–45:06）

MoE 有三个主要设计维度：怎样路由、专家怎样划分大小、怎样训练。先看路由：既可以由 token 选择专家，也可以由专家选择 token，或者为一批 token 求一个全局分配。课堂讨论的多数模型采用第一种。

最常见的路由器很简单。对当前输入向量 x 做一次线性投影，得到每个专家的分数，再选出最高的 k 个：

```text
s = x W_router                # 对所有候选专家打分
I = top_k(s)                  # 选择 k 个专家的编号
y = Σ(i∈I) g_i · FFN_i(x)     # 执行选中专家，按门控权重合并
```

这是示意流程，省略了残差等结构。g_i 是门控权重；不同模型可能在 Top-k 前后使用不同的归一化，也可能采用 sigmoid 等打分方式，不能把一种写法当成所有 MoE 的标准实现。

**理解补充：打分不等于运行专家。** 路由器虽然给所有候选专家打分，但这种小规模计算通常比执行所有 FFN 便宜得多。DSA 与 MoE 都利用了这个模式：前者先选历史位置，后者先选参数模块。

讲师还提到几种替代思路。哈希路由可以作为简单基线；强化学习或多臂老虎机方法可以处理“只能观察部分候选结果”的问题，但有方差和实现开销；全局指派可以把分配适配度与容量约束一起考虑，但求解和系统成本更高。实践中，简单路由加训练技巧往往更容易扩展到大规模。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02645.jpg" alt="Top-k 路由的详细公式，展示专家打分、门控选择、输出加权与残差连接" width="960">

*课堂画面：Top-k 路由的详细公式，展示专家打分、门控选择、输出加权与残差连接。[跳转到 44:05](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2645)。*

<details>
<summary>展开本节其余 16 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [39:25](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2365) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02365.jpg" alt="39:25 原始课堂画面" width="480" loading="lazy"> |
| [39:50](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2390) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02390.jpg" alt="39:50 原始课堂画面" width="480" loading="lazy"> |
| [40:15](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2415) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02415.jpg" alt="40:15 原始课堂画面" width="480" loading="lazy"> |
| [40:20](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2420) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02420.jpg" alt="40:20 原始课堂画面" width="480" loading="lazy"> |
| [40:45](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2445) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02445.jpg" alt="40:45 原始课堂画面" width="480" loading="lazy"> |
| [40:53](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2453) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02453.jpg" alt="40:53 原始课堂画面" width="480" loading="lazy"> |
| [41:18](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2478) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02478.jpg" alt="41:18 原始课堂画面" width="480" loading="lazy"> |
| [41:30](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2490) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02490.jpg" alt="41:30 原始课堂画面" width="480" loading="lazy"> |
| [41:55](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2515) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02515.jpg" alt="41:55 原始课堂画面" width="480" loading="lazy"> |
| [42:20](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2540) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02540.jpg" alt="42:20 原始课堂画面" width="480" loading="lazy"> |
| [42:45](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2565) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02565.jpg" alt="42:45 原始课堂画面" width="480" loading="lazy"> |
| [43:10](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2590) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02590.jpg" alt="43:10 原始课堂画面" width="480" loading="lazy"> |
| [43:35](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2615) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02615.jpg" alt="43:35 原始课堂画面" width="480" loading="lazy"> |
| [44:00](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2640) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02640.jpg" alt="44:00 原始课堂画面" width="480" loading="lazy"> |
| [44:30](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2670) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02670.jpg" alt="44:30 原始课堂画面" width="480" loading="lazy"> |
| [44:55](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2695) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02695.jpg" alt="44:55 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-14"></a>

## 14. 细粒度专家与共享专家：怎样安排分工？（45:06–48:38）

经典设计可以使用少量较大的专家；另一种选择，是把专家划分得更小，在给定预算下提供更多组合。细粒度专家的目的，是让模型能够选择更细的计算单元，而不只是每次从几个大块中选一个。

共享专家则处理另一件事：有些处理可能对多数 token 都有用，如果每个路由专家都重复学习它，参数利用未必高效。共享专家始终执行，路由专家再按需参与，让二者有机会形成互补。

```text
                     → 共享专家：每次都运行 ──────┐
当前 token 的表示 ──┤                           ├→ 合并
                     → 路由器 → 选中的路由专家 ──┘
```

讲师对比了相关消融实验：细粒度专家在所讨论的设置中有收益；共享专家的证据则不完全一致。DeepSeek 的实验显示相应改进，OLMoE 在自己的受控设置中没有测出同样明显的共享专家收益。因此，理解设计动机后，仍要看具体预算、模型和任务。

**问：共享专家每次都运行，怎样并行？**（48:16–48:32）

答：它们不会获得“本次不激活”的稀疏计算节省，但可以复制到多个设备上，减少激活值为访问共享专家而产生的通信。这是用更多存储换取更低通信成本，具体复制方式仍取决于部署。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02731.jpg" alt="从少量大专家到细粒度路由专家与共享专家的结构变化" width="960">

*课堂画面：从少量大专家到细粒度路由专家与共享专家的结构变化。[跳转到 45:31](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2731)。*

<details>
<summary>展开本节其余 12 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [45:06](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2706) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02706.jpg" alt="45:06 原始课堂画面" width="480" loading="lazy"> |
| [45:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2756) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02756.jpg" alt="45:56 原始课堂画面" width="480" loading="lazy"> |
| [46:13](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2773) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02773.jpg" alt="46:13 原始课堂画面" width="480" loading="lazy"> |
| [46:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2798) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02798.jpg" alt="46:38 原始课堂画面" width="480" loading="lazy"> |
| [46:58](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2818) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02818.jpg" alt="46:58 原始课堂画面" width="480" loading="lazy"> |
| [47:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2841) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02841.jpg" alt="47:21 原始课堂画面" width="480" loading="lazy"> |
| [47:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2866) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02866.jpg" alt="47:46 原始课堂画面" width="480" loading="lazy"> |
| [48:11](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2891) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02891.jpg" alt="48:11 原始课堂画面" width="480" loading="lazy"> |
| [48:16](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2896) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02896.jpg" alt="48:16 原始课堂画面" width="480" loading="lazy"> |
| [48:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2901) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02901.jpg" alt="48:21 原始课堂画面" width="480" loading="lazy"> |
| [48:27](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2907) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02907.jpg" alt="48:27 原始课堂画面" width="480" loading="lazy"> |
| [48:32](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2912) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02912.jpg" alt="48:32 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-15"></a>

## 15. 训练难点：没选中的专家，怎样获得机会？（48:38–52:03）

MoE 希望训练时也只运行少数专家，这带来两个问题：Top-k 的选择是离散的；没有运行的专家，也就没有这次输入上的结果可供比较。

**理解补充：设有 A、B、C、D 四个专家，本次只选 A。** A 参与前向计算，可以根据这次损失更新参数；其余专家没有执行，无法知道它们这次是否会做得更好。如果每次都选择 A，其余专家也就一直缺少训练机会。

讲师介绍三类处理办法：用强化学习学习选择；对路由分数加入随机扰动，让相近候选获得探索机会；或者使用简单路由，并搭配负载均衡等辅助机制。课堂重点在第三类，因为它在实际大规模训练中很常用。

随机扰动的直觉是，当两个专家得分接近时，偶尔换一个尝试，可以打破早期偏好。但这并不代表噪声越多越好。讲师引用的后续消融也表明，有些设置移除这种随机项反而更稳定。

**理解补充：Top-k 不可微，不等于整个模型不能反向传播。** 选中专家的计算和连续门控权重仍可提供梯度；离散索引本身不能像普通连续函数那样传递有用梯度。具体能获得哪些路由梯度还取决于门控实现。负载均衡帮助改善分配，不是把离散选择变成可微操作。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02948.jpg" alt="稀疏 MoE 的训练难点，包括离散门控与未选专家缺少反馈" width="960">

*课堂画面：稀疏 MoE 的训练难点，包括离散门控与未选专家缺少反馈。[跳转到 49:08](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2948)。*

<details>
<summary>展开本节其余 8 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [48:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2918) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02918.jpg" alt="48:38 原始课堂画面" width="480" loading="lazy"> |
| [48:43](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2923) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02923.jpg" alt="48:43 原始课堂画面" width="480" loading="lazy"> |
| [49:33](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2973) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02973.jpg" alt="49:33 原始课堂画面" width="480" loading="lazy"> |
| [49:58](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=2998) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/02998.jpg" alt="49:58 原始课堂画面" width="480" loading="lazy"> |
| [50:23](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3023) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03023.jpg" alt="50:23 原始课堂画面" width="480" loading="lazy"> |
| [50:48](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3048) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03048.jpg" alt="50:48 原始课堂画面" width="480" loading="lazy"> |
| [51:13](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3073) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03073.jpg" alt="51:13 原始课堂画面" width="480" loading="lazy"> |
| [51:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3098) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03098.jpg" alt="51:38 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-16"></a>

## 16. 负载均衡损失：为什么要给热门专家“降温”？（52:03–54:33）

如果直接采用简单路由，早期较常被选中的专家可能得到更多训练，从而更容易表现好，进而继续被选择。这个正反馈会使少数专家包揽工作，其余专家长期闲置，形成专家坍缩或专家饥饿。

一种常用处理方式，是在语言建模损失之外加入负载均衡损失。课堂以 Switch Transformer 的 Top-1 路由为例。设有 N 个专家，一批共有 T 个 token：

- f_i：这一批中实际分配给专家 i 的 token 比例。
- P_i：路由器分配给专家 i 的平均概率质量。
- α：均衡项的权重。

$$
L_{\mathrm{balance}}=\alpha N\sum_{i=1}^{N}f_iP_i
$$

讲师建议从梯度看这个式子。把实际分配统计 f_i 当作本次计算中的常量，有：

$$
\frac{\partial L_{\mathrm{balance}}}{\partial P_i}=\alpha N f_i
$$

分到的 token 越多，这一项对其概率质量的惩罚系数就越大。梯度下降因而倾向于减少继续把概率集中到繁忙专家上的做法。路由概率之间有归一化耦合，因此这是理解作用方向的方法，不是说所有概率可以各自独立下降。

**理解补充：为什么同时需要 f_i 和 P_i？** f_i 告诉模型“实际已经分过去多少”，但硬分配本身不方便求导；P_i 是路由器给出的连续量，可以承接优化信号。两者结合，把实际拥挤程度转成对路由概率的约束。

均衡项也不能无限加强。它应当防止训练资源过度集中，同时允许模型保留有用的分工；强迫所有输入都平均分配，并不自动等于最好的语言建模效果。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03198.jpg" alt="Switch Transformer 的均衡损失，结合实际 token 分配比例与平均路由概率" width="960">

*课堂画面：Switch Transformer 的均衡损失，结合实际 token 分配比例与平均路由概率。[跳转到 53:18](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3198)。*

<details>
<summary>展开本节其余 5 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [52:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3123) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03123.jpg" alt="52:03 原始课堂画面" width="480" loading="lazy"> |
| [52:28](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3148) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03148.jpg" alt="52:28 原始课堂画面" width="480" loading="lazy"> |
| [52:53](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3173) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03173.jpg" alt="52:53 原始课堂画面" width="480" loading="lazy"> |
| [53:43](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3223) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03223.jpg" alt="53:43 原始课堂画面" width="480" loading="lazy"> |
| [54:08](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3248) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03248.jpg" alt="54:08 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-17"></a>

## 17. 从专家均衡到设备均衡：实验告诉了我们什么？（54:33–59:42）

把专家放到不同设备上后，还要关心设备是否负载均衡。如果某台设备长期繁忙、其他设备等待，即使模型计算量看起来不大，整体速度也会受限。课堂因此介绍了专家级、设备级的均衡目标，以及后续通过在线调整专家偏置来修正路由的方法。

“无辅助损失均衡”应结合具体模型理解：有些设计用偏置调整替代某一类专家均衡损失，同时仍保留其他约束。它不等于从此无需关注负载分配。

讲师展示了 OLMoE 的消融：在对应实验中，去掉均衡项后，训练损失变差，几乎所有 token 流向少数专家；保留均衡项时，专家利用更分散。这个现象说明均衡不仅关乎机器是否闲置，还关乎模型是否用上了已经分配的参数容量。

**问：专家具体学出了哪些分工？**（58:14–58:59）

答：一些可视化可以观察到标点、字符或某些输入模式的路由差异，但不能直接把某个专家理解为预先定义的职业专家。具体行为需要实测。

**问：如果专家均衡了，设备不就自然均衡了吗？**（59:12–59:17）

答：在专家均匀放置、计算量相近并且分配足够均匀等条件下，确实能带来设备层面的均衡。但实践中未必希望把专家均衡约束推到极强，因此可能另外施加设备级约束，兼顾模型分工和系统利用率。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03398.jpg" alt="保留与移除均衡损失的消融对比，展示训练曲线和专家利用分布的差异" width="960">

*课堂画面：保留与移除均衡损失的消融对比，展示训练曲线和专家利用分布的差异。[跳转到 56:38](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3398)。*

<details>
<summary>展开本节其余 16 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [54:33](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3273) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03273.jpg" alt="54:33 原始课堂画面" width="480" loading="lazy"> |
| [54:58](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3298) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03298.jpg" alt="54:58 原始课堂画面" width="480" loading="lazy"> |
| [55:23](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3323) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03323.jpg" alt="55:23 原始课堂画面" width="480" loading="lazy"> |
| [55:48](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3348) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03348.jpg" alt="55:48 原始课堂画面" width="480" loading="lazy"> |
| [56:13](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3373) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03373.jpg" alt="56:13 原始课堂画面" width="480" loading="lazy"> |
| [57:03](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3423) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03423.jpg" alt="57:03 原始课堂画面" width="480" loading="lazy"> |
| [57:28](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3448) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03448.jpg" alt="57:28 原始课堂画面" width="480" loading="lazy"> |
| [57:53](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3473) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03473.jpg" alt="57:53 原始课堂画面" width="480" loading="lazy"> |
| [58:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3494) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03494.jpg" alt="58:14 原始课堂画面" width="480" loading="lazy"> |
| [58:37](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3517) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03517.jpg" alt="58:37 原始课堂画面" width="480" loading="lazy"> |
| [58:42](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3522) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03522.jpg" alt="58:42 原始课堂画面" width="480" loading="lazy"> |
| [58:47](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3527) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03527.jpg" alt="58:47 原始课堂画面" width="480" loading="lazy"> |
| [58:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3534) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03534.jpg" alt="58:54 原始课堂画面" width="480" loading="lazy"> |
| [58:59](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3539) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03539.jpg" alt="58:59 原始课堂画面" width="480" loading="lazy"> |
| [59:12](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3552) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03552.jpg" alt="59:12 原始课堂画面" width="480" loading="lazy"> |
| [59:17](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3557) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03557.jpg" alt="59:17 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-18"></a>

## 18. 系统实现：通信、小矩阵与热门专家排队（59:42–63:21）

数据并行、模型并行等方式都有适用范围和扩展限制。专家并行提供了额外维度，但要把理论上的稀疏计算转成实际吞吐，还需要处理三个问题。

**第一，怎样高效执行许多专家的计算？** 如果每个专家只分到很少的 token，朴素实现会产生大量小矩阵乘法，GPU 利用率可能不高。可以用分组矩阵乘法、块稀疏等方式组织计算，减少碎片化。具体收益取决于内核和硬件支持，不能简单把任意专家稀疏性等同于 GPU 原生支持的某一种稀疏格式。

**第二，怎样减少设备间传输？** 专家路由需要把 token 激活发送到目标设备，再汇集结果。课堂介绍了一种降低通信量的结构：在需要传输的路由分支上先把表示投影到较低维，用较窄的激活进行通信和相应专家处理，再映射回模型表示；共享分支则可以保留较宽表示。这需要模型结构配合，不是把向量随意截短后照常使用。

**第三，热门专家排队时怎么办？** 如果实现给每个专家设定容量上限，超过上限的分配就需要被调度或处理。讲师提到，早期某些实现会丢弃超额专家计算，使同一个请求的结果可能受到同批其他请求的影响。无丢弃设计和更好的调度可以避免这类问题。

**理解补充**：这里“丢 token”通常指某个 token 被分配到专家的计算没有执行，不是直接从用户输入中删掉对应文字。这是特定实现行为，也不是所有 MoE 都必然存在的性质。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03691.jpg" alt="专家并行中的低维路由分支，用较小的激活表示减少设备间通信" width="960">

*课堂画面：专家并行中的低维路由分支，用较小的激活表示减少设备间通信。[跳转到 61:31](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3691)。*

<details>
<summary>展开本节其余 10 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [59:42](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3582) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03582.jpg" alt="59:42 原始课堂画面" width="480" loading="lazy"> |
| [59:47](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3587) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03587.jpg" alt="59:47 原始课堂画面" width="480" loading="lazy"> |
| [60:12](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3612) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03612.jpg" alt="60:12 原始课堂画面" width="480" loading="lazy"> |
| [60:37](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3637) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03637.jpg" alt="60:37 原始课堂画面" width="480" loading="lazy"> |
| [60:43](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3643) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03643.jpg" alt="60:43 原始课堂画面" width="480" loading="lazy"> |
| [61:08](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3668) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03668.jpg" alt="61:08 原始课堂画面" width="480" loading="lazy"> |
| [61:56](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3716) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03716.jpg" alt="61:56 原始课堂画面" width="480" loading="lazy"> |
| [62:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3741) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03741.jpg" alt="62:21 原始课堂画面" width="480" loading="lazy"> |
| [62:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3766) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03766.jpg" alt="62:46 原始课堂画面" width="480" loading="lazy"> |
| [63:11](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3791) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03791.jpg" alt="63:11 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-19"></a>

## 19. 数值稳定性与微调：计算省了，训练要求仍然在（63:21–65:59）

路由器又引入了一处需要谨慎处理的打分与归一化计算。讲师回顾上一讲：指数运算和除法可能放大数值问题，因此路由部分常采用比其他计算更高的精度，并在适用设置中加入 router z-loss。

**理解补充：z-loss 与负载均衡不是一回事。** 均衡项主要约束专家分配；router z-loss 约束路由 logits 的 log-sum-exp 等尺度，帮助控制数值稳定性。两者对应不同问题，是否启用及其系数都要结合实现和实验。

MoE 的另一个问题是小数据微调。总专家参数很多，有限的下游数据可能只覆盖部分路由和输入模式。课堂展示的实验中，稀疏模型出现了较大的训练与验证差距，提示对专家参数的微调可能过拟合。

讲师提到两类应对办法：选择性微调 Attention 或其他非 MoE 部分；增加训练数据，使更多专家获得足够的有效样本。这些是可选策略，不能据此断言所有 MoE 微调都必须冻结专家，也不能仅凭参数量推断最终泛化表现。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03867.jpg" alt="MoE 路由稳定性实验，比较 router z-loss 对训练曲线的影响" width="960">

*课堂画面：MoE 路由稳定性实验，比较 router z-loss 对训练曲线的影响。[跳转到 64:27](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3867)。*

<details>
<summary>展开本节其余 6 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [63:21](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3801) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03801.jpg" alt="63:21 原始课堂画面" width="480" loading="lazy"> |
| [63:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3826) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03826.jpg" alt="63:46 原始课堂画面" width="480" loading="lazy"> |
| [64:11](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3851) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03851.jpg" alt="64:11 原始课堂画面" width="480" loading="lazy"> |
| [64:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3884) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03884.jpg" alt="64:44 原始课堂画面" width="480" loading="lazy"> |
| [65:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3909) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03909.jpg" alt="65:09 原始课堂画面" width="480" loading="lazy"> |
| [65:34](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3934) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03934.jpg" alt="65:34 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-20"></a>

## 20. Upcycling：从已有稠密模型开始训练 MoE（65:59–68:04）

Upcycling 的思路是复用一个已经训练好的稠密模型。保留原有结构中的可复用权重，把 FFN 复制成多个专家，加入路由器，再继续训练。

```text
已有稠密模型
    ↓ 复制 FFN，建立多个专家
    ↓ 加入路由器
    ↓ 继续训练，让路由与专家适应新结构
得到 MoE 模型
```

刚复制出来的专家起点相同；后续接收到不同输入和梯度，才可能逐渐形成不同处理方式。讲师引用早期实验与模型案例，说明在相关设置中，这种路线比继续训练原稠密模型取得了更好的效果。

**理解补充**：复制权重本身不会自动创造新的知识或完成专家分工。Upcycling 的价值是提供已有能力和训练起点，仍需后续训练、合适的路由与均衡机制。原字幕中部分模型参数数字不清晰，此处不据此给出具体规模结论。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03959.jpg" alt="Upcycling 从已训练稠密模型复制 FFN 专家，加入路由并继续训练" width="960">

*课堂画面：Upcycling 从已训练稠密模型复制 FFN 专家，加入路由并继续训练。[跳转到 65:59](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3959)。*

<details>
<summary>展开本节其余 4 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [66:24](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=3984) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/03984.jpg" alt="66:24 原始课堂画面" width="480" loading="lazy"> |
| [66:49](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4009) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04009.jpg" alt="66:49 原始课堂画面" width="480" loading="lazy"> |
| [67:14](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4034) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04034.jpg" alt="67:14 原始课堂画面" width="480" loading="lazy"> |
| [67:39](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4059) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04059.jpg" alt="67:39 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-21"></a>

## 21. DeepSeek 的演进：架构选择也要服务于系统（68:04–69:44）

讲师用 DeepSeek 的几代设计串联前面讨论的机制。早期 DeepSeekMoE 采用细粒度专家、共享专家和 token 路由，并使用辅助目标改善分配。后续模型扩大规模后，更显式地考虑设备负载和通信限制。

在课堂对 DeepSeek-V3 的介绍中，专家均衡进一步结合了在线偏置调整，路由亲和度采用 sigmoid 并对选中专家的权重归一化。理解重点是：分数怎样用于选择、怎样用于输出加权、负载怎样反馈到选择过程，是可以分别设计的部分。

**理解补充**：不要把这里读成“只换一个激活函数就能解决 MoE 训练”。模型效果与路由、专家规模、训练目标和系统实现共同相关；“无辅助损失”的命名也要结合它实际替代的是哪一项损失来看。

讲师推荐阅读这些模型的技术报告，尤其关注消融实验：改变一个组件后，效果和成本分别怎样变化。理解这些取舍，比背诵每代模型的专家数量更有用。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04134.jpg" alt="DeepSeek-V2 的共享专家、细粒度专家，以及设备路由和通信均衡设计" width="960">

*课堂画面：DeepSeek-V2 的共享专家、细粒度专家，以及设备路由和通信均衡设计。[跳转到 68:54](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4134)。*

<details>
<summary>展开本节其余 3 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [68:04](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4084) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04084.jpg" alt="68:04 原始课堂画面" width="480" loading="lazy"> |
| [68:29](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4109) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04109.jpg" alt="68:29 原始课堂画面" width="480" loading="lazy"> |
| [69:19](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4159) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04159.jpg" alt="69:19 原始课堂画面" width="480" loading="lazy"> |

</details>

<a id="part-22"></a>

## 22. MLA 与 MTP：同一个模型中的另外两项设计（69:44–71:46）

讲师最后介绍 MLA 和 MTP。它们可以与 MoE 共存，但分别属于注意力缓存和预测机制，不能直接归入专家路由。

**MLA：用低维潜在表示减少 KV cache。** 多头潜在注意力将每个位置的部分 K/V 内容表示为较低维的潜在向量。解码时缓存这些潜在表示及必要的位置相关部分，而不必按普通方式保存全部展开后的 K/V。具体计算还可以利用投影间的代数关系进行优化。

位置编码让实现更复杂。特别是 RoPE 与内容投影的结合，需要专门设计位置相关分支，不能简单认为所有 K/V 内容都能不加区分地压成同一个向量。原字幕把 Q 与 K/V 的潜在表示混在一起描述；这里应明确，Query 的生成路径与用于历史缓存的 KV 潜在表示不能混为一谈。

**理解补充：MLA 与前面的固定状态压缩有什么不同？**

| 机制 | 主要压缩什么 | 历史继续变长时 |
|---|---|---|
| 线性或状态机制 | 把许多历史位置累积到固定维度的状态中 | 单层用于循环解码的状态尺寸可保持固定 |
| MLA | 压缩每个历史位置需要保存的 K/V 表示 | 仍需为新增位置保存潜在表示，缓存仍随长度增长 |

**MTP：让训练涉及多个未来 token 的预测。** 多 token 预测在下一个 token 之外引入更多未来位置的预测目标。它可以提供更丰富的训练信号，也可以为投机解码等推理方法产生候选。候选仍需要相应的验证或接受流程，不意味着任意多个未来 token 都能一次预测后直接无条件输出。

课程在这里收束：MoE 通过稀疏激活把总参数量与单次计算量部分分开；要让这件事真正有效，还需要路由学习、负载均衡和系统实现协同工作。后面的推理课程会进一步展开解码加速。

<img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04209.jpg" alt="MLA 用低维潜在表示减少历史 KV 缓存，并单独处理位置编码相关部分" width="960">

*课堂画面：MLA 用低维潜在表示减少历史 KV 缓存，并单独处理位置编码相关部分。[跳转到 70:09](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4209)。*

<details>
<summary>展开本节其余 6 个时间点与画面</summary>

以下保留本段其余原始画面；相邻的重复字幕已合并到上文。

| 时间 | 课堂画面 |
|---|---|
| [69:44](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4184) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04184.jpg" alt="69:44 原始课堂画面" width="480" loading="lazy"> |
| [70:34](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4234) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04234.jpg" alt="70:34 原始课堂画面" width="480" loading="lazy"> |
| [70:59](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4259) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04259.jpg" alt="70:59 原始课堂画面" width="480" loading="lazy"> |
| [71:16](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4276) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04276.jpg" alt="71:16 原始课堂画面" width="480" loading="lazy"> |
| [71:41](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4301) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04301.jpg" alt="71:41 原始课堂画面" width="480" loading="lazy"> |
| [71:46](https://www.bilibili.com/video/BV11LEA6eEuj/?p=4&t=4306) | <img src="https://raw.githubusercontent.com/tsingyuec/cs336-blog/e966bb4c04d05b76d08db954da55cf4a51bd7a63/transcripts/img/p04/04306.jpg" alt="71:46 原始课堂画面" width="480" loading="lazy"> |

</details>

## 阅读后自查

用下面五个问题检查自己是否把机制串起来，而不只是记住名称：

1. 为什么普通 softmax Attention 不能直接移动括号，而去掉 softmax 的教学版本可以？
2. 为什么 KᵀV 能写成逐项求和？为什么自回归模型需要每个位置自己的前缀状态？
3. 并行计算与循环计算的等价性，为什么不代表线性机制与普通注意力等价？
4. DSA 与 MoE 的 Top-k 分别在选什么？哪些计算被省下，哪些成本仍然存在？
5. 为什么 MoE 在训练时也必须稀疏？负载均衡怎样帮助那些长期未被选中的专家？

[对应的逐讲笔记](../notes/Lecture%204%20Attention%20Alternatives.md) · [返回图文转录目录](README.md)
