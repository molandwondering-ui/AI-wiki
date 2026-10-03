# CS336 Lecture 3：现代 Transformer 架构与超参数基础知识框架

> 核心问题：一个现代大语言模型为什么通常选择 Pre-Norm、RMSNorm、SwiGLU 和 RoPE？模型的宽度、深度、词表、注意力头又该怎样定？训练或推理不稳定时应该检查哪里？

## 0. 阅读口径、数据来源与参考来源

本文把“课堂原始材料”和“帮助理解的二手材料”分开标记：

- **[P：Stanford 官方 Lecture 3 讲义，固定到提交 `de53a9f`](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_03.pdf)**：本文的课程结论、模型配置表、公式和页码以它为准。`P:p.10` 表示 PDF 第 10 页。
- **[T：第三方中文字幕，固定到提交 `7b6da52`](https://github.com/molandwondering-ui/AI-wiki/blob/7b6da5229a9350542530e3c77be1d14efebd1bf2/Stanford-CS336/subtitles/P03_Lecture%203%EF%BC%9A%20Architectures%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)**：用于补充讲师口头给出的直觉、问答和限制条件。它不是 Stanford 官方文本，可能有语音识别或翻译错误。
- **[B：tsingyuec 的 Lecture 3 解读，固定到提交 `e966bb4`](https://github.com/tsingyuec/cs336-blog/blob/e966bb4c04d05b76d08db954da55cf4a51bd7a63/blog/Lecture%203%20Architectures.md)**：用于对照残差流、串行块和架构取舍的讲解方式；它是基于课程的二次整理。
- **[N2：仓库既有笔记](notes/笔记02_现代%20Transformer%20核心架构与张量算子工程_笔记.md)**：用于补充中文解释和知识之间的联系；它是二次整理，不能反过来覆盖官方讲义。
- **补充说明**：本文为小白增加的 shape、参数量推导、示意代码和易错点，明确标成“补充”。

引用优先级是：**官方讲义 P > 讲师口述字幕 T > 二次整理 B/N2 > 本文补充说明**。

### Lecture 3 的“原代码”在哪里？

这点与 Lecture 2 不同。Lecture 2 有完整的 `lecture_02.py` 和逐行执行轨迹；Stanford 官方仓库当前与 Lecture 3 对应的文件只有 `lecture_03.pdf`，**没有 `lecture_03.py`**。

因此本文会区分三类代码：

1. **讲义原代码**：PDF 第 35 页展示的 RoPE 片段，按幻灯片转写；
2. **公式的等价伪代码**：把讲义公式写成易读的 PyTorch 风格，帮助理解，不冒充课程源码；
3. **shape 注释**：由本文补充，用来解释每一步张量形状。

官方课程入口是 [CS336 Lectures](https://cs336.stanford.edu/lectures/?trace=lecture_03)。本文生成时核对的官方 PDF 共 67 页，作者为 Tatsu Hashimoto。

## 1. 一张图看懂本讲

```text
现代 Transformer 的选择
├── 块里面怎样计算
│   ├── Norm 放哪里：Post-Norm → Pre-Norm / 分支外 Post-Norm
│   ├── 用什么 Norm：LayerNorm → RMSNorm
│   ├── FFN 用什么：ReLU/GELU → SwiGLU/GeGLU
│   └── 子层怎样排：串行 Attention→FFN，少数模型并行
├── 怎样表达位置
│   ├── 正弦/绝对/相对位置编码
│   └── RoPE：旋转 Q、K，使点积主要依赖相对位置
├── 模型多宽、多深
│   ├── 普通 FFN：d_ff ≈ 4d_model
│   ├── 门控 FFN：等参数量时 d_ff ≈ 8/3 d_model
│   ├── 头维度 × 头数通常接近 d_model
│   ├── d_model / n_layers 常在 100–200 左右
│   └── 词表：单语常见 30k–50k，多语/生产系统常见 100k–250k
├── 怎样保持训练稳定
│   ├── 输出 Softmax：z-loss
│   ├── 注意力 Softmax：QK-Norm
│   └── 更强约束：logit soft-capping
└── 怎样降低推理成本
    ├── KV cache 的内存带宽瓶颈
    ├── MHA → MQA/GQA/MLA
    └── 全注意力 → 滑动窗口与全注意力交错
```

这堂课的中心思想不是背“唯一正确架构”，而是从大量模型中找出三类信息：

- **已经很稳定的默认选择**：例如 Pre-Norm、RMSNorm、门控 FFN；
- **有经验范围但不是定理的超参数**：例如 `d_ff/d_model`、宽深比；
- **仍在快速变化的部分**：位置编码、长上下文注意力和推理优化。

**来源：** P:p.2、p.7–9、p.67；T 开场关于“从其他模型的经验中寻找共同点”的说明。

## 2. 起点：先看一个现代 Transformer 块

**先记住一句话：一个现代 Transformer 块连续更新表示两次——Attention 让 token 读取前文，FFN 再分别处理每个 token；每次更新都加回原来的表示。** 这两次相加形成贯穿各块的残差流，也给旧信息和梯度留出直通路径。

先分清范围：**整个语言模型**把 token ID（词或子词在词表中的编号）变成下一 token 的预测；它中间重复堆叠的 **Transformer 块**只负责更新表示。下图以常见的 *decoder-only*（生成时只能读取当前位置及之前内容）、串行 Pre-Norm 块为例。Pre-Norm 指先归一化分支输入，再计算分支输出。

```text
token ID → 词嵌入 → Transformer 块 × N → 最终 Norm → 输出投影 → 词表 logits

块内：x ──┬────────────────→ (+) → h
         └→ Norm → Attention ─┘
      h ──┬────────────────→ (+) → 更新后的 x
         └→ Norm → FFN ───────┘
```

图中每个 `(+)` 都把分支算出的增量加回主干。块的输入和输出宽度相同，才能连续堆叠。最后的输出投影才把表示变成对词表中每个 token 的分数（`logits`）；它属于**整个模型**，不是每个块都做一次。

**来源：** P:p.3–4；B 的“残差流”与“串行块”两节。数据流图与块/模型边界为本文补充。

### 2.1 先认清表示的形状

后文统一使用：

| 符号 | 含义 | 常见张量 shape |
|---|---|---|
| `B` | batch size，一批有多少条序列 | — |
| `S` 或 `n` | sequence length，序列长度 | — |
| `d_model` 或 `d` | 残差流/隐藏状态宽度 | `x: [B, S, d_model]` |
| `h_q` | Query 的头数 | — |
| `h_kv` | Key/Value 的头数 | — |
| `d_head` | 每个注意力头的宽度 | `q: [B, h_q, S, d_head]` |
| `d_ff` | FFN 中间层宽度 | `[B, S, d_ff]` |
| `V` | 词表大小 | `logits: [B, S, V]` |

`d_model` 是每个 token 在模型主干中的向量长度；`d_ff` 是 token 进入前馈网络后暂时扩张到的宽度。不要把这里的 `V`（vocabulary size）和注意力里的 Value 张量混为一谈。

### 2.2 Attention 读前文，FFN 逐 token 加工

例如模型读到“猫喝”时，预测后续 token 要参考前面的“猫”：Attention 负责让当前位置利用前文；FFN 则对当前位置已有的表示进一步变换。FFN 自己不读取别的位置。一个块接收 `x: [B, S, d_model]`，先经过 Attention 分支，再经过 FFN 分支。课程作业采用的现代简化配置是：

- Norm 放在 Attention/FFN **之前**；
- 使用 **RoPE**；
- FFN 使用 **SwiGLU**；
- Linear 和 Norm 通常不带 bias。

一个 Pre-Norm 串行块可写成：

```python
# 补充伪代码，不是 Lecture 3 官方源码
h = x + causal_attention(rms_norm_1(x))  # [B, S, d_model]
x = h + swiglu_ffn(rms_norm_2(h))        # [B, S, d_model]
```

按顺序读：

1. **Attention 分支**：先对 `x` 做 RMSNorm（按均方根缩放表示），再投影出 Q、K、V。Q、K 用来计算当前位置该关注哪里，V 提供汇入当前位置的内容；RoPE 给 **Q 和 K** 注入位置信息。随后用因果掩码挡住未来位置，计算注意力并投影回 `d_model`。
2. **第一次残差相加**：把 Attention 的输出加到原来的 `x`，得到 `h`。原来的表示有一条不经过 Attention 的直通路径。
3. **FFN 分支**：对更新后的 `h` 做 RMSNorm，再用 SwiGLU（带门控的前馈网络）将每个 token 的向量暂时扩张到 `d_ff`、压回 `d_model`；这个分支本身不在 token 之间交换信息。
4. **第二次残差相加**：把 FFN 的输出加到 `h`，得到下一块的输入 `x`。

这里的 `causal_attention` 只是示意函数：RoPE、因果掩码和 Q/K/V 投影都包含在其中。**RoPE 不直接旋转残差流 `x`**。后文第 3、4、6 节分别展开 Norm、SwiGLU 和 RoPE，第 10 节再讨论 Q、K、V 的头数。

为什么示例块选这几个组件？B 的讲法把选择放在**表达能力、训练稳定性、系统效率**三个目标之间看；这些做法是经验形成的常见组合，不是由两行伪代码推导出的唯一答案：

| 选择 | 主要解决什么问题 | 后文展开 |
|---|---|---|
| Pre-Norm：归一化分支输入 | 保留不经过 Norm 的残差路径，帮助深层训练稳定 | 第 3 节 |
| RMSNorm、常省略 bias | 减少归一化和逐元素操作的开销；效果仍需实验验证 | 第 3 节 |
| SwiGLU：带门控的 FFN | 用额外一条投影调节中间特征，改善表达 | 第 4 节 |
| 串行执行 Attention → FFN | 让 FFN 处理 Attention 更新后的表示 | 第 5 节 |
| RoPE：旋转 Q、K | 让注意力分数带上相对位置信息 | 第 6 节 |

**来源：** P:p.3–4、p.10–29、p.30–35；B 的“架构权衡”“归一化”“门控”“串行块”“RoPE”各节；T 开场对作业实现与原始 Transformer 差异的说明。逐步数据流、函数封装和对照表为本文补充。

### 2.3 每次残差相加前，分支必须回到主干宽度

取一个便于计算的例子：`B=2`、`S=4`、`d_model=12`，用 `h_q=h_kv=3` 个注意力头、每头 `d_head=4`，SwiGLU 中间宽度 `d_ff=32`。这里 `3×4=12`，而 `32=(8/3)×12`，正好对应后文两条常见的宽度经验。

| 阶段 | shape | 为什么 |
|---|---|---|
| 块输入 `x` | `[2, 4, 12]` | 2 条序列，每条 4 个 token，每个 token 的主干宽度为 12 |
| Q、K、V | 各 `[2, 3, 4, 4]` | 分成 3 个头，每头宽 4；RoPE 只改变 Q、K 的数值，不改变 shape |
| 注意力分数 | `[2, 3, 4, 4]` | 每个头中，4 个查询位置分别与 4 个键位置计算分数 |
| Attention 输出并合并头 | `[2, 4, 12]` | 回到主干宽度，才能与 `x` 相加 |
| FFN 的两条中间分支 | 各 `[2, 4, 32]` | SwiGLU 逐元素相乘后，仍是 `[2, 4, 32]` |
| 块输出 | `[2, 4, 12]` | 压回主干宽度，交给下一块 |

这个例子使用 `h_q=h_kv`，对应普通多头注意力；使用 GQA 时，K、V 的头数可以比 Q 少，但块输入和输出仍是 `[B, S, d_model]`。因果掩码限制可读取的位置，并不缩小分数张量的 shape。

### 2.4 原始模型与现代示例的选择不同

原始 Transformer 论文使用编码器—解码器结构，包含正弦位置编码、ReLU FFN 和 Post-Norm；上面的图则专门画了现代语言模型常用的 decoder-only 块。不要把“原始论文的完整模型”与“现代模型的单个块”当成同一层级比较。

| 选择 | 原始 Transformer | 本节现代简化示例 |
|---|---|---|
| 归一化位置 | 残差相加后做 Post-Norm | 分支计算前做 Pre-Norm |
| 位置处理 | 将正弦位置编码加到输入表示 | 在注意力内部对 Q、K 应用 RoPE |
| FFN | ReLU，两次线性投影 | SwiGLU，三次线性投影 |
| 线性层 bias | 原始实现可带 bias | 常省略 bias |

这些是课程用来讲解的典型选择，不是所有现代模型都完全相同；后文会逐项解释原因与例外。

**来源：** P:p.3–4、p.7–9；B 对 Pre-Norm、RMSNorm、门控 FFN 与 RoPE 的梳理。shape 示例与层级区分为本文补充。

## 3. 归一化：放在哪里，比叫什么更重要

### 3.1 Post-Norm 与 Pre-Norm

**Post-Norm** 先计算分支、做残差相加，再归一化：

```text
x_next = Norm(x + F(x))
```

**Pre-Norm** 先归一化分支输入，再把分支输出加回未经归一化的主干：

```text
x_next = x + F(Norm(x))
```

它们最关键的差别不是“Norm 提前了一行”，而是主残差路径是否被 Norm 截断：

```text
Post-Norm：x ──> F ──> 加法 ──> Norm ──> 下一层
             └─────────▲

Pre-Norm： x ──────────> 加法 ──────────> 下一层
              Norm→F ──▲
```

Pre-Norm 中存在一条更干净的恒等路径，梯度可以沿着加法直接向前传播。因此深层模型通常更容易训练，能承受更大的学习率，并较少出现梯度尖峰。

**注意：** “更稳定”不代表理论上彻底消灭梯度爆炸，也不代表一定不需要 warmup。课程把“去掉 warmup”称为早期主张，而把现代实际优势概括为稳定性和更大的可用学习率。

**来源：** P:p.10–12；T 的 Pre-Norm/Post-Norm 讲解；N2“归一化拓扑位置与残差动力学”。

### 3.2 分支外 Post-Norm 与 Double Norm

如果不想把 Norm 放进主残差流，可以只归一化分支输出：

```text
x_next = x + Norm(F(x))
```

也可以在分支入口和出口都归一化：

```text
x_next = x + Norm_out(F(Norm_in(x)))
```

后者常被直观地称为 **Double Norm**。它的目标是既保留干净残差路径，又限制进入或离开分支的数值尺度。课程列出的相关现代模型包括 Grok、Gemma 2 和 OLMo 2，但各模型具体放置位置并不完全一样，不能只看“用了两个 Norm”就认为实现相同。

**来源：** P:p.13；T 关于 non-residual post norm 的口述；N2“外部后置归一化与双重归一化”。

### 3.3 LayerNorm 与 RMSNorm

对一个 token 的隐藏向量 `x ∈ R^d`，LayerNorm 同时减均值、除标准差：

```text
μ = mean(x)
σ² = mean((x - μ)²)
LayerNorm(x) = (x - μ) / sqrt(σ² + ε) * γ + β
```

RMSNorm 不减均值，也通常没有可学习 bias `β`：

```text
rms(x) = sqrt(mean(x²) + ε)
RMSNorm(x) = x / rms(x) * γ
```

等价的教学实现如下：

```python
# 补充示意代码；许多实际实现会用 FP32 统计平方均值
def rms_norm(x, weight, eps=1e-6):
    variance = x.float().pow(2).mean(dim=-1, keepdim=True)
    normalized = x.float() * torch.rsqrt(variance + eps)
    return normalized.to(x.dtype) * weight
```

逐行理解：

1. `pow(2).mean(..., keepdim=True)`：对每个 token 的 `d_model` 个特征求平方均值；
2. `rsqrt`：直接计算 `1/sqrt(...)`；
3. `normalized * weight`：每个特征仍有一个可学习缩放量 `γ`；
4. `keepdim=True`：保留最后一维为 1，方便广播回 `[B, S, d_model]`。

### 3.4 RMSNorm 为什么可能更快

RMSNorm 少做均值计算、中心化和 bias 相加，但真正重要的不是省了多少 FLOPs，而是少了多少数据搬运。Norm 是逐元素加归约操作，算术强度低，常受显存带宽限制；矩阵乘法才占大多数 FLOPs。

所以：

- “Norm 的 FLOPs 很少”不能推出“Norm 的运行时间可以忽略”；
- RMSNorm 的系统收益更多来自数据移动和实现融合，而不是只看理论运算量；
- 课程结论是其通常与 LayerNorm 一样好且更便宜，不是说它对所有任务都必然更准。

**来源：** P:p.14–17；T 关于 FLOPs 不等于 runtime 的解释；N2“归一化算子演进与算术强度瓶颈”。

### 3.5 为什么现代 Linear 常去掉 bias

普通线性层是 `y = xW + b`，去掉 bias 后是 `y = xW`。课程给出的直觉是：bias 参数相对少，却会增加逐元素读写；在大型矩阵乘法中，这类低算术强度操作的计算/参数权衡不一定划算，并且去掉它可能有利于优化稳定性。

**注意：** 这是一种常见工程选择，不是“bias 数学上没用”。小模型、分类头或其他任务仍可能保留 bias。

**来源：** P:p.18–19；T 对 dropping bias terms 的说明。

## 4. 前馈网络：从 ReLU/GELU 到门控 FFN

### 4.1 普通 FFN 在做什么

每个 token 独立经过同一套两层网络：

```text
FFN(x) = σ(xW₁)W₂
```

shape 是：

```text
[B,S,d_model] --W₁--> [B,S,d_ff] --激活--> [B,S,d_ff]
                --W₂--> [B,S,d_model]
```

常见激活：

- **ReLU**：`max(0, x)`，简单，负数区域直接变 0；
- **GELU**：`xΦ(x)`，对输入做较平滑的门控；
- **Swish/SiLU**：`x·sigmoid(x)`，也是平滑激活。

**来源：** P:p.20–21。

### 4.2 GLU 的核心：多一条“门”

ReGLU 把单分支激活：

```text
ReLU(xW₁)
```

改成两个投影逐元素相乘：

```text
ReGLU(x) = (ReLU(xW_gate) ⊙ xW_up)W_down
```

SwiGLU 只是把门控分支的 ReLU 换成 Swish/SiLU：

```text
SwiGLU(x) = (SiLU(xW_gate) ⊙ xW_up)W_down
```

对应的教学代码：

```python
# 补充伪代码，不是官方源码
def swiglu_ffn(x, w_gate, w_up, w_down):
    gate = torch.nn.functional.silu(x @ w_gate)
    value = x @ w_up
    return (gate * value) @ w_down
```

- `gate` 学“哪些中间特征应该通过、通过多少”；
- `value` 提供被调节的内容；
- `gate * value` 是逐元素乘，不是矩阵乘法；
- `w_down` 再把 `d_ff` 投影回 `d_model`。

课程展示的实验结论是：门控变体在等参数量比较中有较一致的小幅收益。具体使用 SwiGLU 还是 GeGLU，差异通常小于“有没有门控”本身。

**注意：** GPT-3 等非门控模型同样能正常工作。GLU 是强默认项，不是模型可用性的必要条件。

**来源：** P:p.22–26；T 关于门控机制、Shazeer 实验误差棒和非门控反例的口述；N2“门控线性单元拓扑与激活函数演进”。

### 4.3 为什么门控 FFN 常用 `8/3 d_model`

忽略 bias 时，普通 FFN 有两个大矩阵：

```text
参数量 ≈ d_model·d_ff + d_ff·d_model = 2d_model·d_ff
```

若取传统默认值 `d_ff = 4d_model`：

```text
参数量 ≈ 8d_model²
```

门控 FFN 有 `W_gate`、`W_up`、`W_down` 三个大矩阵：

```text
参数量 ≈ 3d_model·d_ff_gated
```

令两者参数量相同：

```text
3d_model·d_ff_gated = 8d_model²
d_ff_gated = 8/3 d_model ≈ 2.67d_model
```

这就是“门控模型把中间维度缩成原来的 2/3”的来源：原来是 `4d`，乘 `2/3` 后是 `8/3 d`。

**注意：** 这是等参数量比较的基准，不是硬规则。课程表中 PaLM 为 4、Mistral 7B 和 LLaMA-2 70B 为 3.5，而 Qwen 14B、DeepSeek 67B 等接近 2.67。

**来源：** P:p.23、p.38；T 关于三矩阵和 `2/3` 缩放的推导；N2“前馈参数守恒与维度扩展比例”。

## 5. Transformer 块：串行还是并行

### 5.1 串行块

现代常见的串行 Pre-Norm 块是：

```python
# 补充伪代码
h = x + attention(norm_1(x))
y = h + ffn(norm_2(h))
```

FFN 看到的是已经融合上下文后的 `h`。因此 Attention 和 FFN 形成两次连续的表征变换。

### 5.2 并行块

并行块让两条分支读取同一个输入：

```python
# 补充伪代码
z = norm(x)
y = x + attention(z) + ffn(z)
```

可能的系统收益：

- 两个分支共享一次 Norm；
- 输入投影可能融合成更大的矩阵乘法；
- 两个分支没有先后依赖，更容易并行。

课程引用的 PaLM 描述称大规模训练可快约 15%，但也强调行业后来大多又选择串行块。一个直觉是：并行块的 FFN 看不到本层 Attention 的输出，可能减少“有效表征深度”。

**注意：** 不能把 15% 当作任何模型、硬件和实现都能复现的固定加速；讲师也明确说缺少足够好的统一消融来精确量化质量差异。

**来源：** P:p.27–29；T 的课堂问答；N2“块级执行时序与层间拓扑结构”。

## 6. 位置编码：为什么现代模型偏爱 RoPE

### 6.1 Attention 本身不知道顺序

若没有位置信息，把 token 顺序一起打乱，纯点积 Attention 无法知道“谁在前、谁在后”。课程总结了四条路线：

| 方法 | 如何加入位置 | 直觉 | 代表模型（讲义举例） |
|---|---|---|---|
| 正弦位置编码 | 与 token embedding 相加 | 用不同频率定位位置 | 原始 Transformer |
| 绝对位置 embedding | 每个位置学习一个向量并相加 | “第 i 位”有专属向量 | GPT-1/2/3、OPT |
| 相对位置偏置 | 加到 Attention 分数中 | 直接描述距离 `i-j` | T5、Gopher、Chinchilla |
| RoPE | 旋转 Q、K | 让点积自然编码相对距离 | GPT-J、PaLM、LLaMA 等 |

**来源：** P:p.30。

### 6.2 RoPE 想满足什么

理想目标是构造位置相关表示 `f(x,i)`，让两个位置的内积只依赖相对距离：

```text
<f(x,i), f(y,j)> = g(x, y, i-j)
```

二维旋转矩阵满足：

```text
R(θ) = [[cosθ, -sinθ],
        [sinθ,  cosθ]]
```

将位置 `i` 的向量旋转 `iθ`，位置 `j` 的向量旋转 `jθ`：

```text
<R(iθ)x, R(jθ)y>
= xᵀR(iθ)ᵀR(jθ)y
= xᵀR((j-i)θ)y
```

最后只剩角度差 `j-i`。这就是 RoPE 最核心的几何直觉。

高维向量则被拆成许多二维对，每一对使用不同频率：高频更敏感于近距离，低频变化慢，能携带较长距离的信息。

**来源：** P:p.31–34；T 用 “we know” 在不同绝对位置仍保持相对角度的口头例子；N2“旋转位置编码几何机理”。

### 6.3 RoPE 与正弦位置编码的关键区别

两者都出现 sin/cos，但用途不同：

- 正弦位置编码把一个位置向量**加到** token embedding 上；
- RoPE 用 sin/cos 构造旋转，对 **Query 和 Key 做乘法变换**；
- 加法会产生内容与绝对位置之间的交叉项；旋转后的 QK 内积可以整理为相对角度差。

所以“公式里都有 sin/cos”不代表它们是同一种位置编码。

**来源：** P:p.30–34；T 对“不是 additive、没有绝对位置交叉项”的强调。

### 6.4 讲义中的 RoPE 原代码片段

下面按 PDF 第 35 页转写，变量命名保留原样：

```python
query_states = self.q_proj(hidden_states)
key_states = self.k_proj(hidden_states)
value_states = self.v_proj(hidden_states)

query_states = query_states.view(
    bsz, q_len, self.num_heads, self.head_dim
).transpose(1, 2)
key_states = key_states.view(
    bsz, q_len, self.num_key_value_heads, self.head_dim
).transpose(1, 2)
value_states = value_states.view(
    bsz, q_len, self.num_key_value_heads, self.head_dim
).transpose(1, 2)

cos, sin = self.rotary_emb(value_states, position_ids)
query_states, key_states = apply_rotary_pos_emb(
    query_states, key_states, cos, sin
)
```

逐段解释：

1. `q_proj/k_proj/v_proj`：先从隐藏状态生成 Q、K、V；
2. `view(...).transpose(1, 2)`：把投影结果拆出头维，Q 变成 `[B, h_q, S, d_head]`，K/V 变成 `[B, h_kv, S, d_head]`；
3. `rotary_emb(..., position_ids)`：为每个位置和每个旋转频率生成 cos/sin；
4. `apply_rotary_pos_emb(...)`：**只旋转 Q 和 K**，因为它们的点积决定注意力分数；
5. 后面才继续普通的点积、mask、Softmax 和对 V 的加权求和。

二维的一对坐标可用下面的等价伪代码理解：

```python
# 补充示意：x_pair[..., 0:2] 是一对坐标
x0, x1 = x_pair[..., 0], x_pair[..., 1]
rotated_0 = x0 * cos_theta - x1 * sin_theta
rotated_1 = x0 * sin_theta + x1 * cos_theta
```

**两个易错点：**

- 幻灯片旁边的 shape 注释存在简写/笔误风险；应以实际三行 `view(...).transpose(1,2)` 为准，而不是把 `head_dim` 和 `hidden_dim` 当作两个独立头轴。
- 不同代码库可能采用“相邻两维配对”或“前后两半配对”，`rotate_half` 写法也不同；cos/sin 的排列必须与配对方式一致，不能随意混用。

**来源：** P:p.35 的原代码截图；T 对 `position_ids → cos/sin → 应用到 Q/K` 的口述。上述逐行 shape 与易错点为本文补充。

## 7. 超参数：先记经验范围，再理解为什么不是定理

### 7.1 FFN 宽度

最常见默认值：

```text
普通 FFN：d_ff ≈ 4d_model
门控 FFN：d_ff ≈ 8/3 d_model
```

课程引用的扫描实验显示，`d_ff/d_model` 在约 1–10 的较宽范围内存在相对平坦的好区间。这说明默认值很可靠，但并不唯一。

T5 11B 曾用 `d_ff=65536, d_model=1024`，即 64 倍，模型仍能工作；但后续 T5 v1.1 的 GeGLU 使用更常规的 2.5 倍。因此课程把 64 倍视作“能工作但很可能次优”的反例，而不是新推荐值。

**来源：** P:p.37–41；T 关于 T5 和经验盆地的解释。

### 7.2 注意力头：总头宽通常接近模型宽度

常见关系是：

```text
h_q × d_head ≈ d_model
```

这使 Q 投影总宽度与残差流宽度大致相同，也便于 reshape。但它不是数学要求。课程表中的 T5、LaMDA、PaLM 等存在明显大于 1 的比例。

**补充例子：** `d_model=4096, h_q=32, d_head=128`，则 `32×128=4096`。把 `[B,S,4096]` 投影并拆成 `[B,32,S,128]`，所有头合起来仍是 4096 维。

**来源：** P:p.42–43。

### 7.3 深度与宽度：aspect ratio

课程用 `d_model / n_layers` 粗略描述模型是“宽而浅”还是“窄而深”：

- 许多模型约在 100–200；
- LLaMA/LLaMA 2 约 102；
- T5 11B 约 33；
- 课程表中也有低到约 61、87 的现代模型。

模型更深并不自动更强。极深模型存在更多串行依赖，难以跨设备并行，推理延迟也更高；更宽则会让大矩阵、参数量和显存压力上升。最终选择既是建模问题，也是系统问题。

**来源：** P:p.44–46；N2“几何纵横比与分布式并行博弈”。

### 7.4 词表大小

课程给出的粗略范围：

| 场景 | 常见词表规模 | 为什么 |
|---|---:|---|
| 单语模型 | 30k–50k | 单一语言的字符/子词覆盖较集中 |
| 多语或生产系统 | 100k–250k | 要覆盖更多文字系统、代码、特殊 token 和业务格式 |

词表更大并非免费：输入 embedding 和输出投影通常都与 `V×d_model` 成正比；Softmax 也要在更多类别上计算。但词表太小会把文本切得更碎，增加序列长度。它是在“每个 token 更贵”和“token 数更多”之间取舍。

**来源：** P:p.47；T 对 monolingual 与 multilingual vocabulary 的说明。最后一句取舍分析为本文补充。

### 7.5 一张“默认值不是定理”的表

| 项目 | 好用的起点 | 不应误解成 |
|---|---|---|
| 普通 `d_ff/d_model` | 约 4 | 只能等于 4 |
| 门控 `d_ff/d_model` | 等参数量时约 2.67 | 所有 GLU 模型都必须 2.67 |
| `h_q·d_head/d_model` | 常约 1 | 大于 1 一定错误 |
| `d_model/n_layers` | 常约 100–200 | 该区间必然最优 |
| 单语词表 | 常约 30k–50k | 词越少越好 |
| 多语词表 | 常约 100k–250k | 词越多表达力一定越强 |

## 8. Dropout 与 Weight Decay：大数据不等于完全不正则化

反对预训练 Dropout 的直觉是：训练数据有数万亿 token，模型常只遍历一次语料，不容易像小数据集那样反复记忆。课程表显示，较新的模型经常把预训练 Dropout 设为 0，但仍常使用 Weight Decay。

二者作用不同：

- **Dropout**：训练时随机屏蔽激活，直接给网络加入噪声；
- **Weight Decay**：每次优化更新时让参数向 0 缩小一点。

对于大模型预训练，Weight Decay 不只是“防止验证集过拟合”，还会与学习率和余弦调度共同改变优化轨迹。它的主要收益可能体现在优化动力学。

**注意：** 论文未报告 Dropout，不等于能确定其值为 0；课程也提醒，对闭源模型尤其不能据此下结论。

**来源：** P:p.48–51；T 关于 Weight Decay 与学习率协同调节的课堂问答；N2“预训练正则化机制与优化动力学”。

## 9. 稳定性：重点检查两个 Softmax

语言模型里最重要的两个 Softmax 是：

1. 输出端：把词表 logits 变成下一个 token 的概率；
2. Attention 内部：把 QK 分数变成对 V 的权重。

指数和归一化对极端数值很敏感。工程实现会用减去最大值等数值稳定技巧，但如果 logits 的尺度在训练中持续漂移，仍可能造成训练尖峰或发散。课程依次介绍了三种额外干预。

**来源：** P:p.52–53。

### 9.1 z-loss：约束输出 Softmax 的归一化常数

令词表 logits 为 `u_k`：

```text
Z = Σ_k exp(u_k)
log p(y) = u_y - log Z
```

Softmax 对“所有 logits 同时加同一个常数”不敏感，因此 logits 的整体平移方向没有被普通交叉熵充分约束。z-loss 利用这个自由度，把 `log Z` 拉向 0：

```text
最小化时：loss = cross_entropy + α(log Z)²
```

教学代码：

```python
# 补充伪代码
log_z = torch.logsumexp(logits, dim=-1)
z_loss = alpha * log_z.square().mean()
loss = cross_entropy + z_loss
```

`logsumexp` 比直接 `exp().sum().log()` 稳定。z-loss 不要求模型把所有类别概率变得一样；它主要控制 logits 的共同偏移与归一化尺度。

**符号注意：** 讲义以“最大化 log-likelihood”的写法展示减去惩罚项；训练代码通常“最小化 loss”，所以写成在交叉熵上**加** `α(log Z)²`，两者方向一致。

**来源：** P:p.54；T 关于 Softmax 平移不变性和 `log Z` 的解释；N2“输出端配分函数漂移与 Z-loss”。

### 9.2 QK-Norm：在点积前控制 Q、K 尺度

普通注意力分数：

```text
scores = QKᵀ / sqrt(d_head)
```

如果 Q 或 K 的范数越来越大，分数会变得极端，Softmax 可能接近完全饱和。QK-Norm 在点积前分别归一化它们：

```python
# 补充伪代码
q = q_norm(q)
k = k_norm(k)
scores = q @ k.transpose(-2, -1) / math.sqrt(d_head)
weights = torch.softmax(scores, dim=-1)
```

这相当于在危险操作的入口加“尺度护栏”。课程列举 DCLM、OLMo 2、Gemma 2、Qwen 3 等模型，并说明这条路线较早出现在视觉/多模态模型中。

**注意：** QK-Norm 不能替代正确的初始化、学习率和梯度处理；它只针对注意力 logits 的一个重要来源。

**来源：** P:p.55；T 对 Q、K 先 Norm 再点积的逐步说明；N2“注意力内部尺度控制”。

### 9.3 Logit soft-capping：直接限制 logits

一种平滑限制方式是：

```text
capped_logits = C · tanh(logits / C)
```

当 `|logits|` 很小时近似不变；当绝对值很大时，结果逐渐靠近 `±C`。它比硬截断可微，但仍会限制模型表达极高置信度。

```python
# 补充伪代码
logits = cap * torch.tanh(logits / cap)
```

课程态度很谨慎：它能防止 logits 爆掉，但约束较强，可能带来性能损失。不要因为“更稳定”就默认越强越好。

**来源：** P:p.56；T 关于 Gemma、QK-Norm 与 soft-cap 对比的口述；N2“极值截断方案”。

## 10. 推理注意力：为什么 KV cache 让内存成为瓶颈

### 10.1 Prefill 与逐 token Decode 不一样

- **Prefill**：整段 prompt 可以并行处理，大矩阵乘法通常有较高算术强度；
- **Decode**：必须生成一个 token，再把它作为输入生成下一个，时间上不能完全并行。

KV cache 保存每一层、每个历史 token 的 K 和 V，避免每一步从头重算历史 token。但“少算了”不等于“完全免费”：每生成一个新 token，都要读取历史 K/V，长上下文时容易受内存带宽限制。

粗略地，每层、每个 token 的 KV cache 元素数是：

```text
2 × h_kv × d_head
```

其中 2 分别对应 K 和 V。再乘 batch、序列长度、层数和每元素字节数，就是总缓存量级。

**来源：** P:p.58–60；T 从 prefill 算术强度过渡到增量生成的说明。缓存公式为本文基于张量 shape 的补充。

### 10.2 MHA、MQA 与 GQA

| 方法 | Query 头 | KV 头 | KV cache | 主要取舍 |
|---|---:|---:|---|---|
| MHA | `h_q` | `h_q` | 最大 | 每个 Q 头有独立 K/V，表达最充分 |
| MQA | `h_q` | `1` | 最小 | 所有 Q 头共享一组 K/V，可能损失质量 |
| GQA | `h_q` | `1 < h_kv < h_q` | 居中 | 用组数调节质量与效率 |

例如 `h_q=32, h_kv=8` 时，每 4 个 Query 头共享一组 K/V，KV cache 相对 `h_kv=32` 的 MHA 约缩小 4 倍。

可以把 GQA 理解成一只旋钮：

```text
更多 KV 头 ←—— 表达能力更强 / cache 更大 ——→ 更少 KV 头
   MHA                  GQA                    MQA
```

课程展示的实验表明，MQA 有时会带来小幅困惑度损失，而 GQA 往往能以较低推理成本接近 MHA 的质量。因此 GQA 成为现代部署友好的常见选择。

**注意：** “减少头数”在这里专指减少 **K/V 头**，Query 头数可以保持不变；不要误写成所有注意力头一起减少。

**来源：** P:p.61–63；T 对 MHA/MQA/GQA 表达能力与 KV cache 权衡的口述；N2“键值共享注意力拓扑演进”。

### 10.3 MLA 是什么位置

课程只简短提到 DeepSeek-V2 的 **MLA（Multi-head Latent Attention）**：它进一步用低维潜在表示和因子分解压缩需要缓存的内容。它不是简单把 `h_kv` 设得更少，具体机制和权衡超出本讲主线，后续注意力课程再展开更合适。

**来源：** P:p.62；T 关于 MLA 是另一种因子分解结构的说明。

## 11. 长上下文：滑动窗口与全注意力交错

### 11.1 为什么要局部注意力

长度为 `n` 的全注意力需要形成约 `n×n` 的分数关系，计算和内存随序列长度二次增长。若每个 token 只看最近 `w` 个 token：

```text
全注意力关系数：O(n²)
滑动窗口关系数：O(nw)，w << n
```

代价是单层无法直接连接相距超过窗口的两个位置。

### 11.2 为什么交错比“全局或局部二选一”更实用

课程展示的常见方案是每四层中约三层局部、一层全局：

```text
Layer 1：Sliding Window
Layer 2：Sliding Window
Layer 3：Sliding Window
Layer 4：Full Attention
然后重复
```

局部层便宜，负责近邻模式；周期性全局层让远距离信息重新连通。多层局部注意力的有效感受野也会逐层扩大，但不能简单说一层局部注意力已经具有全局视野。

课程以 Cohere Command A 为例：短程层使用 RoPE + SWA，长程全注意力层使用 NoPE；也指出其他模型会在局部和全局层都使用 RoPE。因此“交错模式”与“位置编码方案”是两个可以分开选择的维度。

**来源：** P:p.64–66；T 对每四层一层 full attention、局部信息逐层汇聚的解释；N2“超长上下文稀疏混合注意力架构”。

## 12. 把选择串起来：一个稳妥的学习基线

如果目标是先实现并理解一个可工作的现代密集 Transformer，而不是追逐每个最新变体，可以从下面的组合开始：

```text
Decoder-only causal LM
├── Pre-Norm，使用 RMSNorm
├── 串行 Attention → FFN
├── Linear/Norm 通常不带 bias
├── RoPE 作用于 Q、K
├── SwiGLU，d_ff 先从约 8/3 d_model 起步
├── h_q × d_head 先设为约 d_model
├── 训练稳定性：先保证基础数值实现正确，再考虑 QK-Norm / z-loss
└── 面向推理：用 GQA；超长上下文再评估 SWA + Full Attention
```

这不是“最优架构证明”，而是根据课程汇总得到的低风险起点。真正训练时还要结合：模型规模、数据语言、硬件拓扑、目标上下文长度、训练预算和服务延迟。

**来源：** P:p.19、p.29、p.51、p.67；本文对课程共识的整理。

## 13. 最容易误学的十点

1. **Pre-Norm 不是 Norm 消失了。** 它只是从残差相加之后移到分支之前。
2. **RMSNorm 的优势不能只用 FLOPs 解释。** 数据搬运和 kernel 实现同样关键。
3. **SwiGLU 不是单纯把 ReLU 换成 SiLU。** 它多了一个线性分支和逐元素门控。
4. **`8/3` 来自等参数量推导。** 不是自然定律，现代模型会偏离。
5. **并行块不是“同一层算得更聪明”。** 它换取系统并行性，却可能减少顺序表征深度。
6. **RoPE 不是把 sin/cos 加到词向量。** 它旋转 Q、K，并在 Attention 内使用。
7. **`h_q·d_head=d_model` 是常见设计，不是 shape 的强制定理。** 投影矩阵可以产生不同总宽度。
8. **大数据不代表 Weight Decay 没用。** 它经常影响优化动力学，而不只是过拟合。
9. **稳定性技巧不是叠得越多越好。** Soft-cap 过强可能降低表达能力和性能。
10. **GQA 减少的是 KV 头。** Query 头仍可很多；收益主要体现在 KV cache 和解码带宽。

## 14. 建议掌握顺序与自测标准

### 第一遍：先会画数据流

你应该能不看资料写出：

```text
x → RMSNorm → Attention → 残差相加
  → RMSNorm → SwiGLU FFN → 残差相加
```

并解释为什么这叫 Pre-Norm 和串行块。

### 第二遍：会追 shape 和参数量

给定 `d_model=4096, h_q=32, h_kv=8, d_head=128`，你应该能回答：

- Q shape 为 `[B,32,S,128]`；
- K/V shape 为 `[B,8,S,128]`；
- 相比 32 个 KV 头，cache 约缩小 4 倍；
- 普通 FFN 默认 `d_ff≈16384`；等参数量 SwiGLU 的起点约为 `10923`，实际实现通常再对齐到硬件友好的整数。

### 第三遍：会解释三个“为什么”

- 为什么 RoPE 点积与 `i-j` 有关？
- 为什么 QK-Norm 能缓解注意力 Softmax 极端值？
- 为什么 Decode 即使 FLOPs 不大，也可能被 KV cache 读写拖慢？

### 第四遍：能区分经验与定理

看到 `4d`、`8/3d`、100–200、30k–50k 时，能够说出它们是大量模型形成的经验范围，而不是任何任务都必须遵守的数学约束。

## 15. 来源索引

### 一手课程材料

- [Stanford CS336 Lecture 3 官方 PDF（固定提交）](https://github.com/stanford-cs336/lectures/blob/de53a9f979a6ee35f7d13a5e1aadee5ea1afc58e/lecture_03.pdf)
- [CS336 官方课程讲义入口](https://cs336.stanford.edu/lectures/?trace=lecture_03)

### 字幕与二次整理

- [Lecture 3 第三方中文字幕（固定提交）](https://github.com/molandwondering-ui/AI-wiki/blob/7b6da5229a9350542530e3c77be1d14efebd1bf2/Stanford-CS336/subtitles/P03_Lecture%203%EF%BC%9A%20Architectures%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)
- [仓库内中文字幕](subtitles/P03_Lecture%203%EF%BC%9A%20Architectures%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)
- [B：tsingyuec 的 Lecture 3 解读（固定提交）](https://github.com/tsingyuec/cs336-blog/blob/e966bb4c04d05b76d08db954da55cf4a51bd7a63/blog/Lecture%203%20Architectures.md)
- [N2：现代 Transformer 核心架构与张量算子工程](notes/笔记02_现代%20Transformer%20核心架构与张量算子工程_笔记.md)

### 讲义直接引用或讨论的代表论文

- [Xiong et al., 2020, *On Layer Normalization in the Transformer Architecture*](https://arxiv.org/abs/2002.04745)：Pre-Norm/Post-Norm 与梯度传播。
- [Zhang & Sennrich, 2019, *Root Mean Square Layer Normalization*](https://arxiv.org/abs/1910.07467)：RMSNorm。
- [Shazeer, 2020, *GLU Variants Improve Transformer*](https://arxiv.org/abs/2002.05202)：ReGLU、GeGLU、SwiGLU。
- [Narang et al., 2021, *Do Transformer Modifications Transfer Across Implementations and Applications?*](https://arxiv.org/abs/2102.11972)：多种 Transformer 改动的系统比较。
- [Su et al., 2021, *RoFormer: Enhanced Transformer with Rotary Position Embedding*](https://arxiv.org/abs/2104.09864)：RoPE。
- [Kaplan et al., 2020, *Scaling Laws for Neural Language Models*](https://arxiv.org/abs/2001.08361)：宽度、深度、FFN 比例等经验扫描。
- [Shazeer, 2019, *Fast Transformer Decoding: One Write-Head is All You Need*](https://arxiv.org/abs/1911.02150)：MQA。
- [Ainslie et al., 2023, *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints*](https://arxiv.org/abs/2305.13245)：GQA。
- [Child et al., 2019, *Generating Long Sequences with Sparse Transformers*](https://arxiv.org/abs/1904.10509)：稀疏注意力。

最后要注意：论文列表用于追溯概念来源；本文关于“当代模型通常怎么选”的汇总仍以本次 Lecture 3 官方讲义为主。
