# CS336 Lecture 2：PyTorch、einops 与资源核算基础知识框架

> 核心问题：给定算力和显存，如何判断一个模型能不能放得下、训练要多久，以及代码为什么快或慢？

## 0. 阅读口径与来源

本文同时使用两类材料：

- **[C：Stanford 官方课程执行轨迹](https://cs336.stanford.edu/lectures/?trace=lecture_02)**：包含完整 `lecture_02.py`、逐行执行状态和变量值。本文的代码、公式和数值以它为准。文中的 `C:L73–77` 表示内嵌源码第 73–77 行。
- **[T：第三方中文字幕，固定到提交 7b6da52](https://github.com/molandwondering-ui/AI-wiki/blob/7b6da5229a9350542530e3c77be1d14efebd1bf2/Stanford-CS336/subtitles/P02_Lecture%202%EF%BC%9A%20PyTorch(einops)%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)**：用于补充老师口头解释。它不是 Stanford 官方文本，存在语音识别和翻译错误。
- **补充说明**：本文为帮助理解而加入的推导、限制条件和代码勘误，会明确标成“补充”或“注意”。

官方轨迹中的源码 JSON 可直接查看：[lecture_02.json](https://cs336.stanford.edu/lectures/var/traces/lecture_02.json)。代码行号以其中 `files["lecture_02.py"]` 为准。

## 1. 一张图看懂本讲

```text
模型训练资源核算
├── 存储账本：有多少个元素 × 每个元素多少字节
│   ├── 参数 parameters
│   ├── 梯度 gradients
│   ├── 激活 activations
│   └── 优化器状态 optimizer states
├── 计算账本：一次操作需要多少 FLOPs
│   ├── 矩阵乘法约 2BDK
│   └── 一次训练约 6 × token/样本数 × 参数量
└── 两本账合并
    ├── 算术强度 = FLOPs / 搬运字节数
    ├── Roofline：判断 memory-bound / compute-bound
    ├── MFU：实际算力 / 理论峰值算力
    └── 优化：混合精度、梯度累积、激活检查点
```

这就是整讲的主线。PyTorch 和 einops 是描述计算的工具；真正要形成的是“每写一个操作，就同时问它占多少内存、做多少计算、瓶颈在哪里”的系统思维。

**来源：** `main()` 的课程目标和调用顺序，C:L26–68；字幕开头“今天我想谈谈资源核算”一段，T:L1。

## 2. 第一层：张量是所有训练状态的载体

### 2.1 rank、shape 和轴的语义

- **张量（tensor）**：规则排列的多维数值数组。
- **rank（秩）**：轴的数量，不是矩阵代数里的矩阵秩。
- **shape（形状）**：每个轴的长度。

```python
x = torch.zeros(4)        # rank 1，shape=(4,)
x = torch.zeros(4, 8)     # rank 2，shape=(4, 8)
x = torch.zeros(4, 8, 2)  # rank 3，shape=(4, 8, 2)

B, S, H, D = 32, 16, 16, 64
x = torch.zeros(B, S, H, D)  # batch, sequence, heads, head_dim
```

最后一个例子是 Transformer 中常见的四维张量。`B/S/H/D` 不只是变量名，而是轴的**含义**；后面 einops 正是把这种含义写进操作表达式。

训练时，数据、参数、梯度、激活值和优化器状态最终都以张量存在。它们的区别是生命周期和用途，而不是底层容器不同。

**来源：** `tensors_basics()`，C:L89–110；字幕关于“张量是存储一切的基础单元”的口述，T:L1。

### 2.2 张量内存的唯一基础公式

```text
张量内存 = numel（元素数）× element_size（每个元素的字节数）
```

```python
x = torch.zeros(4, 8)           # 默认 float32
x.numel()                       # 32
x.element_size()                # 4 bytes
memory = 32 * 4                 # 128 bytes

def get_memory_usage(x):
    return x.numel() * x.element_size()
```

源码还计算了 GPT-3 前馈层中的一个矩阵：`(12288*4, 12288)` 个 FP32 元素，占 `2304 MiB ≈ 2.25 GiB`。源码文字写“2.3 GB”，是近似表达。

**来源：** `tensors_memory()` 与 `get_memory_usage()`，C:L113–132、L791–792。

## 3. 第二层：数值精度决定内存、吞吐与稳定性

| 类型 | 每元素 | 指数位带来的动态范围 | 尾数带来的精细程度 | 本讲中的定位 |
|---|---:|---|---|---|
| FP32 | 4 B | 大 | 高 | 稳定但贵 |
| FP16 | 2 B | 小 | 比 BF16 高 | 容易上溢/下溢 |
| BF16 | 2 B | 与 FP32 大致相同 | 比 FP16 低 | 深度学习常用折中 |
| FP8 / FP4 | 1 B / 0.5 B | 依格式、缩放策略而定 | 很低 | 依赖硬件和专用库 |

源码中的关键实验：

```python
x = torch.tensor([1e-8], dtype=torch.float16)
assert x == 0                         # 下溢

x = torch.tensor([1e-8], dtype=torch.bfloat16)
assert x != 0                         # 仍可表示，轨迹值约 1.00117e-8
```

这里要区分两个概念：

- **动态范围**：最大数与最小非零数能到什么数量级，主要受指数位影响。
- **精度/分辨率**：相邻可表示数有多密，主要受尾数位影响。

BF16 保留了 FP32 的指数宽度，所以动态范围好；代价是尾数较短、数值更粗。

**来源：** `tensors_memory()`，C:L134–152。中文字幕把 FP16 示例说成 `1e-5`，但可执行源码明确是 `1e-8`，应以源码为准。

### 3.1 混合精度

本讲使用的简化策略是：

- 参数、激活、梯度用 BF16；
- 需要长期累积小变化的优化器状态用 FP32；
- AMP 根据操作的数值风险选择执行精度。

```python
with torch.amp.autocast("cuda", dtype=torch.bfloat16):
    x = torch.zeros(4, 8)
```

**注意：** `autocast` 不是“把代码块内创建的一切都改成 BF16”。它只对符合规则的运算自动选精度；`torch.zeros` 这类创建操作通常仍服从显式 `dtype` 或默认 dtype。要观察 AMP，矩阵乘法比单独创建 `zeros` 更合适。

**来源：** C:L154–166；[PyTorch AMP 文档](https://pytorch.org/docs/stable/amp.html)；课程引用的 [Mixed Precision Training 论文](https://arxiv.org/pdf/1710.03740.pdf)。

### 3.2 CPU 与 GPU

```python
x = torch.zeros(32, 32)
assert x.device == torch.device("cpu")

x = x.to(device)               # 把已有张量搬到 GPU

with torch.device(device):
    x = torch.zeros(32, 32)     # 直接在该设备创建
```

GPU 算得快不代表 CPU 张量会自动加速。张量必须位于相应设备上；CPU↔GPU 搬运本身也有成本。

**来源：** `tensors_on_gpus()`，C:L184–199。

## 4. 第三层：用 einops 给维度命名

einops 的主要价值不是提高速度，而是让形状变换和求和维度可读、可检查。字幕也明确把 `reduce` 称为相同底层操作的“语法糖”。

### 4.1 `einsum`：对齐、相乘、求和

```python
x = torch.ones(3, 4)  # [seq1, hidden]
y = torch.ones(4, 3)  # [hidden, seq2]

z = einsum(x, y, "seq1 hidden, hidden seq2 -> seq1 seq2")
```

读法分三步：

1. 给 `x` 的两个轴命名为 `seq1, hidden`；
2. 给 `y` 的两个轴命名为 `hidden, seq2`；
3. 输出只保留 `seq1, seq2`，所以未出现在输出中的 `hidden` 被求和。

数学上：

```text
z[i, j] = Σ_h x[i, h] y[h, j]
```

带 batch 的例子：

```python
x.shape == (2, 3, 4)  # batch, seq1, hidden
y.shape == (2, 3, 4)  # batch, seq2, hidden

z = einsum(
    x, y,
    "batch seq1 hidden, batch seq2 hidden -> batch seq1 seq2"
)
# z.shape == (2, 3, 3)
```

它等价于：

```python
z = x @ y.transpose(-2, -1)
```

但 einops 版本直接写出了“在 hidden 上做点积，保留 batch、seq1、seq2”。`...` 可以代表任意数量的前导批处理轴：

```python
z = einsum(x, y, "... seq1 hidden, ... seq2 hidden -> ... seq1 seq2")
```

**来源：** `einops_motivation()`、`einops_einsum()`，C:L214–247；[einops 官方基础教程](https://einops.rocks/1-einops-basics/)。

### 4.2 `reduce`：删除哪些轴，就沿哪些轴归约

```python
x.shape == (2, 3, 4)  # batch, seq, hidden
y = reduce(x, "... hidden -> ...", "sum")
# y.shape == (2, 3)
```

`hidden` 没出现在输出，因此沿它求和；操作也可以换成 `mean`、`max`、`min` 等。

**来源：** `einops_reduce()`，C:L250–258。

### 4.3 `rearrange`：拆轴、合轴和换轴

```python
x = torch.ones(3, 8)  # seq, total_hidden
w = torch.ones(4, 4)  # hidden1, hidden2

x = rearrange(x, "... (heads hidden1) -> ... heads hidden1", heads=2)
# (3, 8) -> (3, 2, 4)

x = einsum(x, w, "... hidden1, hidden1 hidden2 -> ... hidden2")
# (3, 2, 4) -> (3, 2, 4)

x = rearrange(x, "... heads hidden2 -> ... (heads hidden2)")
# (3, 2, 4) -> (3, 8)
```

括号表示把多个轴看成一个乘积轴。第一次 `rearrange` 把 `8=2×4` 拆成 head 数和每头维度；最后再合并。这正是多头注意力里常见的形状操作。

**来源：** `einops_rearrange()`，C:L261–276。

## 5. 第四层：FLOPs、FLOP/s 与 MFU

### 5.1 三个概念不要混

- **FLOP**：一次浮点加法或乘法等操作。
- **FLOPs**：某段计算一共做了多少浮点操作，是工作量。
- **FLOP/s**：硬件每秒能做多少浮点操作，是速度。

矩阵乘法：

```python
x.shape == (B, D)
w.shape == (D, K)
y = x @ w                  # shape=(B, K)
actual_num_flops = 2*B*D*K
```

每个输出元素是长度 `D` 的点积，严格说是 `D` 次乘法和 `D-1` 次加法；工程估算通常写成 `2D`，因此总量约为 `2BDK`。

**来源：** `tensor_operations_flops()`，C:L279–325。

### 5.2 GPU 计时为什么要 synchronize

CUDA 操作默认异步提交。如果只测 Python 调用返回的时间，可能只测到“任务入队”，而没测到 GPU 真正完成计算。

```python
torch.cuda.synchronize()
func()
torch.cuda.synchronize()
```

源码的 `benchmark()` 在计时前和每次运行后同步，避免这个错误。

**来源：** `benchmark()`，C:L830–848。

### 5.3 MFU

```text
MFU = 实际 FLOP/s ÷ 该硬件、该 dtype 下的理论峰值 FLOP/s
```

轨迹中的矩阵乘法使用默认 FP32：

- 实际约 `5.3395e13 FLOP/s`；
- H100 FP32 峰值按源码取 `6.75e13 FLOP/s`；
- MFU 约 `0.791`。

课程说 MFU 达到 0.5 通常已经不错。理论峰值一定要和**数据类型、稠密/稀疏口径**对应；源码把 H100 的 BF16 稀疏峰值 `1979 TFLOP/s` 除以 2，得到稠密峰值约 `989.5 TFLOP/s`。

**来源：** C:L292–330、L795–827；[NVIDIA H100 数据表](https://resources.nvidia.com/en-us-gpu-resources/h100-datasheet-24306)。

## 6. 第五层：算术强度与 Roofline

### 6.1 两种时间、两个强度

一个 GPU 操作粗略分为：从 HBM 读取 → 计算 → 写回 HBM。

```text
计算时间 = FLOPs / 峰值 FLOP/s
通信时间 = 搬运字节数 / 内存带宽
理想重叠时总时间 ≈ max(计算时间, 通信时间)
```

定义：

```text
工作负载算术强度 AI = FLOPs / 搬运字节数
硬件平衡点 AI_hw = 峰值 FLOP/s / 内存带宽
```

- `AI < AI_hw`：内存搬运更慢，**memory-bound**；
- `AI > AI_hw`：计算更慢，**compute-bound**。

源码采用 H100 稠密 BF16 `989.5e12 FLOP/s` 和 `3.35e12 byte/s`，所以：

```text
AI_hw ≈ 989.5 / 3.35 ≈ 295 FLOP/byte
```

**来源：** `arithmetic_intensity()` 与 `arithmetic_intensity_relu()`，C:L338–397。

### 6.2 五个算例

以下都按 BF16 每元素 2 字节，并采用源码的简化内存流量模型：

| 操作 | 近似 FLOPs | 近似字节数 | AI | 判断 |
|---|---:|---:|---:|---|
| ReLU，长度 n | `n` | 读 `2n` + 写 `2n` | `0.25` | memory-bound |
| GELU，长度 n | `20n` | `4n` | `5` | memory-bound |
| 点积 | `2n-1` | `4n+2` | `≈0.5` | memory-bound |
| 矩阵×向量 | `≈2n²` | `≈2n²` | `≈1` | memory-bound |
| 矩阵×矩阵 | `≈2n³` | `6n²` | `≈n/3` | 大矩阵可 compute-bound |

当 `n=1024` 时，矩阵乘法 AI 约 `341.17`，超过硬件平衡点 `295.37`，因此源码判断它是 compute-bound。

关键直觉：矩阵乘法搬运量按 `n²` 增长，计算量按 `n³` 增长；矩阵越大，每搬一个字节能复用数据做越多计算。逐元素操作几乎没有数据复用，所以常受内存带宽限制。

**补充限制：** 这个矩阵乘法字节数假设输入从 HBM 读一次、结果写一次，实际能否接近它依赖 kernel 的分块、缓存和数据复用。它是 Roofline 下界式估算，不是逐条硬件指令模拟。

**来源：** C:L363–468；字幕对五类操作的口头推导，T:L127–168。

### 6.3 Roofline 公式

```text
可达性能 ≤ min(峰值 FLOP/s, 内存带宽 × 算术强度)
```

在课程的理想化假设下：

```text
MFU ≈ min(1, AI / AI_hw)
```

Roofline 的折点就是 `AI_hw`：左侧受带宽限制，性能随 AI 线性上升；右侧受计算峰值限制，形成水平屋顶。

训练通常把很多 token 组成大矩阵乘法，较容易 compute-bound；单 token 自回归推理更像矩阵向量乘法，往往 memory-bound。这里是方向性结论，真实推理还受 batch、KV cache、attention kernel、通信等因素影响。

**来源：** `roofline_plots()`，C:L471–481；[JAX Scaling Book 的 Roofline 章节](https://jax-ml.github.io/scaling-book/roofline/)。

## 7. 第六层：自动微分、反向传播和 `6BP`

### 7.1 `requires_grad`、`backward`、`.grad`

```python
x = torch.tensor([1., 2, 3])
w = torch.tensor([1., 1, 1], requires_grad=True)
pred_y = x @ w                         # 6
loss = 0.5 * (pred_y - 5).pow(2)       # 0.5
loss.backward()
w.grad                                 # [1, 2, 3]
```

推导：

```text
dL/dw = (pred_y - 5) × d(x·w)/dw
      = 1 × x
      = [1, 2, 3]
```

`requires_grad=True` 要求 PyTorch 为涉及 `w` 的运算建立计算图；`backward()` 沿图应用链式法则；结果累加进叶子张量的 `.grad`。

**来源：** `gradients_basics()`，C:L484–499。

### 7.2 用 einsum 看清一层的反向传播

前向：

```python
h2 = einsum(h1, w2, "batch in, in out -> batch out")
```

数学表达：

```text
h2[b,o] = Σ_i h1[b,i] w2[i,o]
```

反向要计算两样东西：

```python
h1_grad = einsum(h2.grad, w2, "batch out, in out -> batch in")
w2_grad = einsum(h2.grad, h1, "batch out, batch in -> in out")
```

```text
dL/dh1[b,i] = Σ_o dL/dh2[b,o] · w2[i,o]
dL/dw2[i,o] = Σ_b dL/dh2[b,o] · h1[b,i]
```

前向只有一次同规模矩阵乘法，约 `2BD²`；反向要分别求输入梯度和权重梯度，共两次，约 `4BD²`。所以反向约为前向的 2 倍。

**来源：** `gradients_flops()`，C:L502–545。

### 7.3 `6BP` / `6TP` 从哪里来

设：

- `B`：一步中处理的数据点数；对语言模型更接近本步 token 数 `batch_size × sequence_length`；
- `P`：参数量；
- `T`：整个训练过程处理的 token 总数。

则近似：

```text
一步前向 ≈ 2BP
一步反向 ≈ 4BP
一步训练 ≈ 6BP
完整训练 ≈ 6TP
```

这不是神秘经验常数，而是“前向一次矩阵乘法 + 反向两次同规模矩阵乘法”的记账结果。

**适用范围：** 源码明确说它对 MLP 成立，对短上下文 Transformer 是良好近似。长上下文时 attention 的 `S²` 项、embedding、归一化、通信以及激活重计算会带来额外成本。

**来源：** C:L547–556；字幕关于“6ND 的来源”和长上下文平方项的说明，T:L183。

## 8. 第七层：优化器状态和完整训练循环

### 8.1 AdaGrad 代码在做什么

```python
state = self.state[p]
grad = p.grad.data
g2 = state.get("g2", torch.zeros_like(grad))
g2 += torch.square(grad)
state["g2"] = g2
p.data -= lr * grad / torch.sqrt(g2 + 1e-5)
```

- `self.state[p]`：与参数 `p` 绑定、跨训练步保留的状态。
- `g2`：到当前为止的逐元素梯度平方累加和。
- 梯度历史越大，分母越大，该坐标的有效学习率越小。
- `1e-5`：防止分母为零。

源码用 `.data` 绕过 autograd，适合讲解机制；生产实现通常在 `torch.no_grad()` 下更新参数，优先使用 PyTorch 内置优化器。

关系梳理：

- Momentum：维护梯度的一阶动量；
- AdaGrad：累计梯度平方；
- RMSProp：对梯度平方做指数移动平均；
- Adam：一阶动量 + 二阶动量。

**来源：** `optimizer()`、自定义 `AdaGrad`，C:L602–680；课程引用的 [AdaGrad 论文](https://jmlr.org/papers/v12/duchi11a.html)。

### 8.2 训练内存账本

令参数量为 `P=D²L`，课程采用 BF16 参数/梯度、FP32 优化器状态：

| 项目 | AdaGrad | Adam/AdamW |
|---|---:|---:|
| 参数 | `2P` bytes | `2P` bytes |
| 梯度 | `2P` bytes | `2P` bytes |
| 优化器状态 | `4P` bytes，一个二阶状态 | `8P` bytes，一阶+二阶状态 |
| 小计（不含激活） | `8P` bytes | `12P` bytes |

课程的简化激活内存是：

```text
activation_memory ≈ 2BDL bytes
```

真实 Transformer 还取决于序列长度、注意力实现、每层保存了哪些中间量、临时 buffer、显存碎片等，因此这只是教学模型。

**来源：** C:L633–650。开头 8 张 80GB H100 的估算使用 AdamW：`640e9 / 12 ≈ 53.3B` 参数，C:L79–83；它不含激活，因而只是上界。

### 8.3 标准训练循环

```text
取 batch → forward → loss → backward → optimizer.step → zero_grad
```

```python
for t in range(num_train_steps):
    x, y = get_batch()
    pred_y = model(x).mean()
    loss = F.mse_loss(pred_y, y)
    loss.backward()
    optimizer.step()
    optimizer.zero_grad(set_to_none=True)
```

`loss.backward()` 默认把新梯度**累加**到 `.grad`，所以正常训练要在更新后清空。`set_to_none=True` 让梯度回到 `None`，通常比填零更省写入和内存操作。

**来源：** `train_loop()`，C:L683–715。

## 9. 第八层：两种“用计算换显存”的方法

### 9.1 梯度累积（gradient accumulation）

目标是获得大有效批次的梯度，但每次只让一个小微批次的激活进入显存。

```text
有效 batch B = 微批次 M × 累积步数 A
```

伪代码：

```python
optimizer.zero_grad(set_to_none=True)
for micro_x, micro_y in micro_batches:
    loss = model_loss(micro_x, micro_y) / accumulation_steps
    loss.backward()                  # 不清梯度，继续累加
optimizer.step()
```

它降低的是激活峰值内存，近似从 `O(B)` 降为 `O(M)`；参数、梯度和优化器状态没有消失，总计算量也不会凭空减少。若 loss 默认取 mean，通常要除以累积步数，才能与一次完整 batch 的平均梯度一致。

**源码勘误：** C:L721 定义 `B=64`，L729 却定义 `micro_batch_size=256`，导致轨迹中的激活估算从 2 MiB 增加到 8 MiB，与“微批次节省内存”的目标相反。这里应满足 `M < B`，例如 `M=8`、累积 8 步。字幕正确描述了“把一个 batch 拆成若干 micro-batch”，但随后误说“节省算力”；准确说法是主要节省**峰值显存**。

**来源：** `gradient_accumulation()`，C:L718–730；T:L183。

### 9.2 激活检查点（activation checkpointing）

同义词：gradient checkpointing、rematerialization。

- 普通训练：前向保存反向所需的中间激活；
- 检查点：前向只保存部分边界激活；
- 反向：从最近边界重新执行一段前向，恢复缺失激活。

因此它是明确的：

```text
少存激活 ↔ 反向时多做计算
```

源码实现：

```python
for layer in self.layers:
    x = torch.utils.checkpoint.checkpoint(layer, x)
```

这段代码对每个 `Block` 做 checkpoint，主要避免保存 block 内部的中间激活。源码随后给出更一般的理论权衡：

- 每层都存：激活内存 `O(L)`，无重算；
- 一个都不存、每层都从头重算：内存 `O(1)`，计算 `O(L²)`；
- 每隔约 `√L` 层存一个边界：激活内存 `O(√L)`，额外重算 `O(L)`。

最后一种是概念推导，当前 `DeepNetworkCheckpointed` 并没有实现“每隔 `√L` 层分段”。

**轨迹注意：** 本次官方轨迹中普通模型峰值为 `202,114,048` bytes，checkpoint 版本反而为 `202,900,480` bytes，不能用这次测量证明节省。示例的估算激活只有约 2 MiB，且实际模型/输入仍是默认 FP32，checkpoint 自身也有开销；测量还会受 allocator 和实验隔离方式影响。应把代码视为机制示范，在更深、激活占比更高且测量隔离良好的模型上验证收益。

**来源：** `activation_checkpointing()`、`DeepNetworkCheckpointed`，C:L733–787；T:L183。

## 10. 两个开场估算，完整算一遍

### 10.1 70B 模型、15T token、1024 张 H100

```python
total_flops = 6 * 70e9 * 15e12             # 6.3e24
h100_dense_bf16 = 1979e12 / 2              # 9.895e14 FLOP/s
mfu = 0.5
flops_per_day = h100_dense_bf16 * mfu * 1024 * 86400
days = total_flops / flops_per_day          # 143.93 天
```

含义：

- `6PT`：训练总工作量；
- `/2`：数据表的 1979 TFLOP/s 是带稀疏性的口径，课程取一半作为稠密 BF16 峰值；
- `×MFU`：理论峰值折算为可持续有效吞吐；
- `×GPU 数×每天秒数`：集群每天可提供的计算量。

**重要不一致：** 中文字幕 T:L1 说“大概 40 天”，但官方可执行轨迹给出的 `days` 是 `143.9266`。按源码参数直接计算也是约 144 天，因此这里采用 144 天。

**来源：** `motivating_questions()`，C:L71–77，以及官方轨迹的运行值。

### 10.2 8 张 80GB H100 能放多大的 AdamW 模型

```python
bytes_per_parameter = 2 + 2 + (4 + 4)  # BF16 参数、BF16 梯度、两个 FP32 动量
num_parameters = 80e9 * 8 / 12         # ≈ 53.3B
```

这只是乐观上界，因为没有计入激活、临时 buffer、通信 buffer、显存碎片，某些混合精度实现还可能维护 FP32 master weights。它回答的是“做量级判断”，不是生产配置承诺。

**来源：** C:L79–86；优化器内存解释见 C:L633–646。

## 11. 源码中最容易误学的五点

1. **`6BP` 不是任意模型的精确公式。** 它来自矩阵乘法主导的近似，长上下文 attention 等会偏离。
2. **`autocast` 不等于全局改 dtype。** 它按操作选择精度。
3. **内存公式按 BF16 计算，但示例模型实际默认是 FP32。** `Block` 的 `torch.randn` 和输入没有指定 BF16；轨迹里的 `state_dict` 也显示 `torch.float32`。
4. **梯度累积例子的 `micro_batch_size=256` 大于 `B=64`。** 这是演示代码笔误，不是技术要求。
5. **checkpoint 的理论结论正确，但这次轨迹测量没有显示节省。** 要区分机制、复杂度分析和一次具体 benchmark。

## 12. 建议掌握顺序与自测标准

按下面顺序学习，不必一开始记所有硬件数字：

1. 看见张量就能说出每个轴的语义、shape、dtype、device。
2. 能把普通矩阵乘法改写为 `einsum`，并解释哪个轴被求和。
3. 能用 `numel × element_size` 算张量内存。
4. 能推导矩阵乘法的 `2BDK`。
5. 能用 `AI` 与 `AI_hw` 判断带宽瓶颈还是计算瓶颈。
6. 能从前向一次、反向两次矩阵乘法推到 `6BP`。
7. 能列出参数、梯度、激活、优化器状态四项显存。
8. 能解释梯度累积和激活检查点各自省什么、牺牲什么。

如果这八项都能独立讲出来，你就掌握了 Lecture 2 的基础骨架；FP8/FP4 的具体格式、精确 Transformer FLOPs 和分布式显存切分可以后续再补。
