# CS336 Lecture 2：PyTorch、einops 与资源核算基础知识框架

> 核心问题：给定算力和显存，如何判断一个模型能不能放得下、训练要多久，以及代码为什么快或慢？

## 0. 阅读口径与来源

本文首先使用两类核心材料：

- **[C：Stanford 官方课程执行轨迹](https://cs336.stanford.edu/lectures/?trace=lecture_02)**：包含完整 `lecture_02.py`、逐行执行状态和变量值。本文的代码、公式和数值以它为准。文中的 `C:L73–77` 表示内嵌源码第 73–77 行。
- **[T：第三方中文字幕，固定到提交 7b6da52](https://github.com/molandwondering-ui/AI-wiki/blob/7b6da5229a9350542530e3c77be1d14efebd1bf2/Stanford-CS336/subtitles/P02_Lecture%202%EF%BC%9A%20PyTorch(einops)%20%E9%87%8D%E5%88%B6%E7%89%88_clean.txt)**：用于补充老师口头解释。它不是 Stanford 官方文本，存在语音识别和翻译错误。
- **补充说明**：本文为帮助理解而加入的推导、限制条件和代码勘误，会明确标成“补充”或“注意”。

本讲配图取自 [tsingyuec 的 Lecture 2 图文解读（固定提交）](https://github.com/tsingyuec/cs336-blog/blob/e966bb4c04d05b76d08db954da55cf4a51bd7a63/blog/Lecture%202%20PyTorch%28einops%29.md)，用于对照张量、精度、算术强度与训练内存的课堂画面；图注是对画面的辅助解释。

官方轨迹中的源码 JSON 可直接查看：[lecture_02.json](https://cs336.stanford.edu/lectures/var/traces/lecture_02.json)。代码行号以其中 `files["lecture_02.py"]` 为准。

引用优先级为：**官方可执行源码 C > 讲师口述字幕 T > 本文补充解释**。这样既能保留课堂直觉，也不会把字幕错听当成源码事实。

### 怎样阅读课程的代码轨迹

这份课程页面不是普通幻灯片，而是把 Python 程序逐行执行后展示出来。源码中的特殊注释由课程展示工具使用，不属于 PyTorch 语法：

- `# @inspect x`：执行到这里时，把变量 `x` 的值、shape 或 dtype 展示出来；
- `# @stepover`：展示时把这次函数调用当成一步，不继续钻进内部实现；
- `# @clear x y`：从展示面板清掉旧变量，避免后面的同名变量混淆。

阅读时可以把每个函数看作一张“可运行幻灯片”：`text()` 输出讲义文字，`image()` 插图，普通 Python 行则真正执行。最外层 `main()` 决定授课顺序，函数在文件中的定义位置不等于课堂播放顺序。

开头 import 也可以按职责分组：

```python
import torch
from torch import nn
import torch.nn.functional as F
from einops import rearrange, einsum, reduce

from edtrace import text, image, link
from gpu_util import cuda_if_available, get_max_memory_usage
from facts import h100_flop_per_sec, h100_bytes_per_sec
```

- `torch`：张量创建、设备、自动微分等基础能力；
- `nn`：带参数的模型模块，例如 `nn.Module`、`nn.Parameter`；
- `F`：无状态函数式算子，例如 `F.relu`、`F.mse_loss`；
- `einops`：用有名字的轴表达张量运算；
- `edtrace`：课程页面的展示工具，不是训练模型必须安装的标准库；
- `gpu_util`、`facts`：课程自带辅助函数和 H100 常量，不能假设普通 PyTorch 环境天然存在。

**来源：** 官方轨迹源码中的标记和逐步执行数据，C:L16–68 及各 `@inspect/@stepover` 行。

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

![张量基础与显存估算：幻灯片给出 8 块 H100 上 AdamW 的每参数字节数 `2+2+(4+4)` 与最大参数量估算，并点明"张量是存储一切的基本单元"。](assets/p02/00224.jpg)

*图：张量基础与显存估算：幻灯片给出 8 块 H100 上 AdamW 的每参数字节数 `2+2+(4+4)` 与最大参数量估算，并点明"张量是存储一切的基本单元"。*

- **张量（tensor）**：规则排列的多维数值数组。
- **rank（秩）**：轴的数量，不是矩阵代数里的矩阵秩。
- **shape（形状）**：每个轴的长度。

可以先用容器来理解：一个数是 0 维张量，一排数是 1 维张量，一张表是 2 维张量，多张表再按 batch、序列或注意力头堆起来，就是更高维张量。rank 回答“有几层索引”，shape 回答“每层索引各有多少个位置”。

```python
x = torch.zeros(4)        # rank 1，shape=(4,)
x = torch.zeros(4, 8)     # rank 2，shape=(4, 8)
x = torch.zeros(4, 8, 2)  # rank 3，shape=(4, 8, 2)

B, S, H, D = 32, 16, 16, 64
x = torch.zeros(B, S, H, D)  # batch, sequence, heads, head_dim
```

最后一个例子是 Transformer 中常见的四维张量。`B/S/H/D` 不只是变量名，而是轴的**含义**；后面 einops 正是把这种含义写进操作表达式。

例如 `x[b, s, h, d]` 可以读成：“第 `b` 个样本、第 `s` 个 token、第 `h` 个注意力头、第 `d` 个头内特征”。只看 `(32, 16, 16, 64)` 很难知道每个 16 的意义，所以读模型代码时应同时写下**轴名和轴长**。

训练时，数据、参数、梯度、激活值和优化器状态最终都以张量存在。它们的区别是生命周期和用途，而不是底层容器不同。

| 张量类别 | 它表示什么 | 通常存在多久 |
|---|---|---|
| 数据 | 当前输入 token 或特征 | 当前 batch |
| 参数 | 模型学到的权重 | 整个训练过程 |
| 激活 | 前向计算得到的中间结果 | 至少保留到对应反向完成 |
| 梯度 | 损失对参数或激活的导数 | 一个更新周期，可跨微批次累加 |
| 优化器状态 | 梯度历史，如 Adam 的一阶、二阶动量 | 整个训练过程 |

**来源：** `tensors_basics()`，C:L89–110；字幕关于“张量是存储一切的基础单元”的口述，T:L1。

### 2.2 张量内存的唯一基础公式

![float16 的位布局（5 位指数、10 位尾数），以及"张量内存 = 元素数 × 字节数"的代码示例：4×8 的 fp32 张量 = 128 字节。](assets/p02/00345.jpg)

*图：float16 的位布局（5 位指数、10 位尾数），以及"张量内存 = 元素数 × 字节数"的代码示例：4×8 的 fp32 张量 = 128 字节。*

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

![float32 的位布局：1 位符号、8 位指数、23 位尾数，共 32 位 / 4 字节。](assets/p02/00249.jpg)

*图：float32 的位布局：1 位符号、8 位指数、23 位尾数，共 32 位 / 4 字节。*

浮点数可以类比成二进制科学计数法：

```text
数值 ≈ 符号 × 有效数字（尾数）× 2^指数
```

- 符号位决定正负；
- 指数位决定小数点能移动多远，也就是能表示多大或多小的数；
- 尾数位决定有效数字有多少，也就是相邻可表示数之间有多细。

| 类型 | 每元素 | 符号/指数/尾数位 | 动态范围 | 数值分辨率 | 本讲中的定位 |
|---|---:|---:|---|---|---|
| FP32 | 4 B | 1 / 8 / 23 | 大 | 高 | 稳定但贵 |
| FP16 | 2 B | 1 / 5 / 10 | 小 | 高于 BF16 | 容易上溢/下溢 |
| BF16 | 2 B | 1 / 8 / 7 | 约等于 FP32 | 低于 FP16 | 深度学习常用折中 |
| FP8 E4M3 | 1 B | 1 / 4 / 3 | 较小 | 两种 FP8 中较高 | 偏向精度 |
| FP8 E5M2 | 1 B | 1 / 5 / 2 | 较大 | 两种 FP8 中较低 | 偏向范围 |
| NVFP4 | 0.5 B/值，另有缩放开销 | 极少数据位 | 依赖分块缩放 | 很低 | 依赖专用硬件和库 |

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

一个容易混淆的点是：**“范围大”不等于“更精确”**。BF16 能像 FP32 一样表示 `1e-8` 这个数量级，但轨迹里实际保存成约 `1.00117e-8`，这正体现了它“能表示，但刻度比较粗”。

**FP4 为什么还能工作？** 课程列出的单个 NVFP4 值只有少量离散选项。实际系统会把一小组相邻值组成 block，并给整个 block 配一个缩放因子：4 位值描述块内相对大小，缩放因子决定整块落在哪个数量级。代价是同一块中的数共享尺度，若一个值极大、相邻值极小，就难以同时精确表达。

**低精度训练和训练后量化不是一回事：**

- 低精度训练：前向、反向乃至更新过程就使用 BF16、FP8 或 FP4，需要处理梯度稳定性；
- 训练后量化：先以较高精度训练好，再把权重压到更低位宽，主要服务推理；
- “能把模型量化成 1 bit”不能推出“能从零稳定训练一个 1-bit 模型”。这也是课堂问答强调的边界。

**来源：** `tensors_memory()`，C:L134–152。中文字幕把 FP16 示例说成 `1e-5`，但可执行源码明确是 `1e-8`，应以源码为准。

关于 FP8、NVFP4 和量化/训练之别的课堂说明来自 C:L168–181 与 T:L1；位布局的说明为本文补充。

### 3.1 混合精度

![混合精度训练与 fp8：bf16 用于参数/激活/梯度，fp32 用于优化器状态；下方给出 fp8 的两种变体（E4M3、E5M2）。](assets/p02/00514.jpg)

*图：混合精度训练与 fp8：bf16 用于参数/激活/梯度，fp32 用于优化器状态；下方给出 fp8 的两种变体（E4M3、E5M2）。*

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

小白调试时优先检查三件事：

```python
print(x.shape)   # 轴是否对得上
print(x.dtype)   # 精度是否符合预期
print(x.device)  # 是否和模型在同一设备
```

同一个运算中的张量通常必须位于同一设备；CPU 张量和 CUDA 张量混用时，PyTorch 通常会直接报 device mismatch，而不是悄悄替你完成一次免费搬运。数据加载阶段要有意识地安排 `.to(device)`，并避免在训练循环里反复进行不必要的 CPU↔GPU 往返。

**来源：** `tensors_on_gpus()`，C:L184–199。

## 4. 第三层：用 einops 给维度命名

einops 的主要价值不是提高速度，而是让形状变换和求和维度可读、可检查。字幕也明确把 `reduce` 称为相同底层操作的“语法糖”。

老师为什么专门插入这一部分？因为原生写法 `transpose(-2, -1)` 只告诉计算机“交换倒数两个轴”，没有告诉读者那两个轴究竟是 token、head 还是 hidden。模型一复杂，记错一个负索引也可能得到 shape 合法但语义错误的结果。einops 的目标是把“我想做什么”直接写在字符串里。

读 einops 表达式时统一使用下面的方法：

1. 先在每个输入上方写 shape；
2. 从左到右把轴长和轴名一一对应；
3. 找出输入中存在、输出中消失的轴——它们会被归约；
4. 最后按箭头右侧的轴顺序写输出 shape。

`einsum` 负责“相乘并求和”，`reduce` 负责“单张量归约”，`rearrange` 负责“拆轴、合轴、换轴”。它们首先是**表达和检查工具**，不能仅凭换了一种写法就假定程序一定更快。

### 4.1 `einsum`：对齐、相乘、求和

![einsum 示例：用命名维度 `seq1 hidden, hidden seq2 -> seq1 seq2` 表达矩阵乘法，`hidden` 被求和消去。](assets/p02/00798.jpg)

*图：einsum 示例：用命名维度 `seq1 hidden, hidden seq2 -> seq1 seq2` 表达矩阵乘法，`hidden` 被求和消去。*

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

这里每个轴名的角色不同：

- `hidden` 同时出现在两个输入中，表示两者按同一个 hidden 位置配对；
- `hidden` 没出现在输出中，因此所有配对结果沿 hidden 相加；
- `seq1`、`seq2` 出现在输出中，所以它们成为结果矩阵的两个轴。

名字本身没有魔法，叫 `hidden`、`h` 或 `feature` 都可以；真正起作用的是“哪些名字相同、哪些名字出现在输出”。

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

![reduce 与 rearrange：`reduce(x, "... hidden -> ...", "sum")` 把维度求和；`rearrange` 用括号把 `total_hidden` 拆成 `heads × hidden1`。](assets/p02/00999.jpg)

*图：reduce 与 rearrange：`reduce(x, "... hidden -> ...", "sum")` 把维度求和；`rearrange` 用括号把 `total_hidden` 拆成 `heads × hidden1`。*

```python
x.shape == (2, 3, 4)  # batch, seq, hidden
y = reduce(x, "... hidden -> ...", "sum")
# y.shape == (2, 3)
```

`hidden` 没出现在输出，因此沿它求和；操作也可以换成 `mean`、`max`、`min` 等。

若输入全是 1，每个输出都是 4，是因为 hidden 轴长度为 4，`1+1+1+1=4`。这个小例子比只背 `dim=-1` 更容易检查自己是否理解了归约方向。

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

为什么必须给 `heads=2`？因为只看到总长度 8，既可能拆成 `2×4`，也可能拆成 `4×2`；代码必须提供至少一个轴长来消除歧义。还要注意，`rearrange` 描述的是逻辑形状变换，底层结果是否为 view、是否需要复制取决于具体排列与后端，不能一概认为零拷贝。

**来源：** `einops_rearrange()`，C:L261–276。

## 5. 第四层：FLOPs、FLOP/s 与 MFU

### 5.1 三个概念不要混

![线性模型的 FLOPs：`X(B×D) · W(D×K)`，FLOPs = 2·(#token)·(#参数)；并给出 H100 规格与"8 块 H100 跑两周"的总 FLOPs 估算。](assets/p02/01279.jpg)

*图：线性模型的 FLOPs：`X(B×D) · W(D×K)`，FLOPs = 2·(#token)·(#参数)；并给出 H100 规格与"8 块 H100 跑两周"的总 FLOPs 估算。*

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

用一个很小的例子检查：若 `B=2, D=3, K=4`，输出有 `2×4=8` 个元素。每个元素需要 3 次乘法和 2 次加法，精确总量是 `8×5=40` FLOPs；工程近似用 `8×(2×3)=48` FLOPs。模型很大时，省略的那一个加法相对 `2D` 很小，所以大家习惯直接使用 `2BDK`。

硬件有时把一次乘加融合成一条 FMA 指令，但资源核算仍通常把其中“一次乘法 + 一次加法”计为 2 FLOPs。不要把“指令条数”和“数学 FLOPs”混为一谈。

#### 5.1.1 建立计算量的数量级直觉

课程给出的参照物包括：GPT-3 训练约 `3.14e23` FLOPs；GPT-4 的 `2e25` FLOPs 只是外界推测，不是公开确认数据。另一段代码估算 8 张 H100 按稠密 BF16 峰值连续运行两周可提供约 `9.58e21` FLOPs。

这些数字的作用不是要求背诵，而是培养单位检查：

```text
硬件数 × 秒 × FLOP/s = FLOPs
任务 FLOPs ÷ 集群有效 FLOP/s = 秒
```

只要左右单位能约掉，估算链路通常就没有方向性错误。再乘 MFU，才是从理论峰值走向实际有效产出。

**来源：** C:L288–296。GPT-4 数值在源码中明确标为 `speculated`，只能作为数量级参照。

**来源：** `tensor_operations_flops()`，C:L279–325。

### 5.2 GPU 计时为什么要 synchronize

CUDA 操作默认异步提交。如果只测 Python 调用返回的时间，可能只测到“任务入队”，而没测到 GPU 真正完成计算。

```python
torch.cuda.synchronize()
func()
torch.cuda.synchronize()
```

源码的 `benchmark()` 在计时前和每次运行后同步，避免这个错误。

一个更稳妥的真实 benchmark 还会先做若干次 warm-up，再重复多次并取中位数或分位数。warm-up 可以排除首次 kernel 加载、缓存建立和 GPU 升频的影响。课程代码只重复 5 次取平均值，足够演示原理，但不是完整的性能测试模板。

**来源：** `benchmark()`，C:L830–848。

### 5.3 MFU

![MFU 幻灯片：实测 `actual_flop_per_sec = 实测 FLOPs / 实测时间`，标称值来自 GPU 规格表，且 FLOP/s 强烈依赖数据类型；下方给出 MFU 定义。](assets/p02/01509.jpg)

*图：MFU 幻灯片：实测 `actual_flop_per_sec = 实测 FLOPs / 实测时间`，标称值来自 GPU 规格表，且 FLOP/s 强烈依赖数据类型；下方给出 MFU 定义。*

```text
MFU = 实际 FLOP/s ÷ 该硬件、该 dtype 下的理论峰值 FLOP/s
```

轨迹中的矩阵乘法使用默认 FP32：

- 实际约 `5.3395e13 FLOP/s`；
- H100 FP32 峰值按源码取 `6.75e13 FLOP/s`；
- MFU 约 `0.791`。

课程说 MFU 达到 0.5 通常已经不错。理论峰值一定要和**数据类型、稠密/稀疏口径**对应；源码把 H100 的 BF16 稀疏峰值 `1979 TFLOP/s` 除以 2，得到稠密峰值约 `989.5 TFLOP/s`。

可以把 MFU 理解成“花钱买来的理论算力，真正有多少转化成模型需要的计算”。它低不一定说明矩阵乘法 kernel 写坏了：小矩阵、逐元素算子、CPU 调度、GPU 间通信、数据等待和同步空洞都会让端到端 MFU 下降。课程轨迹中的 79.1% 是单卡大矩阵乘法，更容易接近峰值；完整分布式训练达到 50% 已经是另一种难度。

源码的 `get_promised_flop_per_sec(dtype)` 先识别 A100、H100 或 B200，再按 dtype 返回对应峰值。这说明“某张卡有多少算力”并不是一个脱离精度的单值。函数在没有 CUDA 时返回 1，只是为了让课程页面可继续执行，不代表 CPU 的真实性能是 1 FLOP/s；遇到未知 GPU 则返回 `None`，调用者也相应避免计算 MFU。

**来源：** C:L292–330、L795–827；[NVIDIA H100 数据表](https://resources.nvidia.com/en-us-gpu-resources/h100-datasheet-24306)。

## 6. 第五层：算术强度与 Roofline

### 6.1 两种时间、两个强度

一个 GPU 操作粗略分为：从 HBM 读取 → 计算 → 写回 HBM。

可以把 GPU 想成一家后厨：计算核心是非常快的厨师，HBM 是远处的大仓库，片上 SRAM/缓存是灶台边的小料台。厨师再快，如果每做一步都要等人从仓库取原料，瓶颈就是搬运；如果一批原料放到料台后能反复加工很多次，厨师才可能持续满负荷工作。

因此“显存问题”其实有两层含义：

- **容量问题**：参数、激活等能不能装进 HBM；装不下就直接 OOM；
- **带宽问题**：即使装得下，计算时能否足够快地送到计算核心；送不及就 memory-bound。

前半讲的 `numel × element_size` 主要回答容量，算术强度主要回答带宽与速度。

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

![算术强度代码：先算出 `arithmetic_intensity = flops/bytes`，与 `h100_accelerator_intensity` 比较并断言"内存受限"；下面定义矩阵乘法的 `bytes` 与 `flops` 计算。](assets/p02/02160.jpg)

*图：算术强度代码：先算出 `arithmetic_intensity = flops/bytes`，与 `h100_accelerator_intensity` 比较并断言"内存受限"；下面定义矩阵乘法的 `bytes` 与 `flops` 计算。*

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

ReLU 和 GELU 是课堂中特别重要的反直觉例子：GELU 每个元素大约做 20 次计算，ReLU 只做约 1 次比较，但两者都远低于 H100 的约 295 FLOP/byte 平衡点。若分别作为孤立 kernel 执行，耗时都可能主要由“读输入、写输出”决定，所以 GELU 不一定比 ReLU 慢 20 倍，甚至可能接近同一量级。优化这类算子时，常见办法不是少做几次加法，而是把它与前后算子融合，减少一次写回和再次读取。

这段直觉由 C:L363–415 的两个算例给出；算子融合的说明为本文补充。

**补充限制：** 这个矩阵乘法字节数假设输入从 HBM 读一次、结果写一次，实际能否接近它依赖 kernel 的分块、缓存和数据复用。它是 Roofline 下界式估算，不是逐条硬件指令模拟。

**来源：** C:L363–468；字幕对五类操作的口头推导，T:L127–168。

### 6.3 Roofline 公式

![屋顶线图：横轴为算术强度（对数刻度），纵轴为实际 FLOP/s；斜线段是内存受限区，平台上沿是计算受限区，不同线对应不同带宽/加速器。](assets/p02/02370.jpg)

*图：屋顶线图：横轴为算术强度（对数刻度），纵轴为实际 FLOP/s；斜线段是内存受限区，平台上沿是计算受限区，不同线对应不同带宽/加速器。*

```text
可达性能 ≤ min(峰值 FLOP/s, 内存带宽 × 算术强度)
```

在课程的理想化假设下：

```text
MFU ≈ min(1, AI / AI_hw)
```

Roofline 的折点就是 `AI_hw`：左侧受带宽限制，性能随 AI 线性上升；右侧受计算峰值限制，形成水平屋顶。

训练通常把很多 token 组成大矩阵乘法，较容易 compute-bound；单 token 自回归推理更像矩阵向量乘法，往往 memory-bound。这里是方向性结论，真实推理还受 batch、KV cache、attention kernel、通信等因素影响。

更具体地说：训练或 prefill 能把很多 token 一次送入同一权重矩阵，权重被读取后可服务许多 token，数据复用高；逐 token 解码时，每步只有很少的新向量，却仍要读取大量权重和 KV cache，数据复用低。增大推理 batch 可以改善复用，但还会受到延迟目标和 KV cache 容量约束。

这里关于训练和单 token 推理的直接结论来自 C:L464–468 与 T:L163–168；KV cache 和 batch 的进一步背景为本文补充。

**来源：** `roofline_plots()`，C:L471–481；[JAX Scaling Book 的 Roofline 章节](https://jax-ml.github.io/scaling-book/roofline/)。

### 6.4 过渡：把课程里的最小深度网络读懂

在进入梯度前，老师先搭了一个只有“线性变换 + ReLU”的网络。它不是现实中的 Transformer，而是为了让参数量、激活和 FLOPs 都容易手算。

```python
class Block(nn.Module):
    def __init__(self, dim: int):
        super().__init__()
        self.weight = nn.Parameter(
            torch.randn(dim, dim) / math.sqrt(dim)
        )

    def forward(self, x):
        x = x @ self.weight
        x = F.relu(x)
        return x
```

逐行看：

- `class Block(nn.Module)`：声明一个可被 PyTorch 管理的模型模块；
- `super().__init__()`：初始化 `nn.Module` 的内部登记机制；
- `nn.Parameter(...)`：告诉 PyTorch 这是需要学习的权重。普通 tensor 赋给属性不会自动成为模型参数；
- `torch.randn(dim, dim)`：创建一个 `D×D` 权重矩阵；
- `/ math.sqrt(dim)`：把随机初始化缩小。输入维度变大时，一个输出会累加更多项；除以 `√D` 可让输出方差不随 D 粗暴放大；
- `forward()`：描述一次前向传播；写 `block(x)` 时，`nn.Module.__call__` 会处理钩子等机制并调用它，不建议手写 `block.forward(x)`；
- `x @ weight`：跨特征维度混合信息；`ReLU` 再提供非线性，否则多层线性矩阵仍可合并成一层线性变换。

多层网络只是把这些 block 注册并串起来：

```python
class DeepNetwork(nn.Module):
    def __init__(self, dim, num_layers):
        super().__init__()
        self.layers = nn.ModuleList(
            [Block(dim) for _ in range(num_layers)]
        )

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x
```

`ModuleList` 不是为了方便循环才存在，而是为了让 PyTorch 知道列表中的 block 都是子模块。这样 `model.parameters()`、`model.state_dict()` 和 `model.to(device)` 才能递归找到所有权重。若只用一个未正确注册的普通 Python 容器，参数可能不会进入优化器或不会随模型移动设备。

数据流和 shape 始终不变：

```text
x [B,D]
  → @ W1 [D,D] → ReLU → h1 [B,D]
  → @ W2 [D,D] → ReLU → h2 [B,D]
  → ...
  → y [B,D]
```

每层有 `D²` 个参数，`L` 层共有 `P=L×D²`。源码取 `D=8, L=3`，所以 `P=3×8×8=192`；`get_num_parameters()` 正是把每个参数张量的 `numel()` 加起来。

**来源：** `deep_network()`、`Block`、`DeepNetwork`、`get_num_parameters()`，C:L559–599、L851–852。初始化解释为本文补充说明。

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

把这段程序画成图更直观：

```text
w ──┐
    ├─ 点积 ─→ pred_y ─→ 减 5 ─→ 平方 ─→ ×0.5 ─→ loss
x ──┘                                                  │
                                                       └─ backward 反向走回去
```

PyTorch 在前向时记录“结果由哪些操作产生”，反向时从标量 loss 出发，把局部导数按链式法则相乘。这里的计算图是动态图：每次执行 Python 前向都会按本次实际走过的分支重新建立。

还要分清两类张量：

- **叶子张量**：通常是用户直接创建、要求梯度的参数，例如 `w`；反向后会保留 `.grad`；
- **非叶子张量**：由运算生成的中间结果，例如 `h1`、`h2`；它们参与反向，但默认不会把 `.grad` 留给用户查看，以节省内存。

源码为了核对手推梯度，显式调用：

```python
h1.retain_grad()
h2.retain_grad()
loss.backward()
```

`retain_grad()` 只是在教学或调试时要求 PyTorch 保留中间张量的梯度，并不是正常训练必需步骤。`loss.backward()` 也不会自动清空已有梯度，而是继续累加，这个行为正是梯度累积能够工作的基础。

**来源：** `gradients_basics()` 与 `gradients_flops()`，C:L484–523。

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

不用背转置位置也能写对：先写目标 shape，再看哪些轴必须保留。例如 `h1_grad` 要得到 `[batch, in]`，已知 `h2.grad` 是 `[batch, out]`，就必须和 `w2[in, out]` 在 `out` 上求和。`einsum` 把这套检查直接写成了 `"batch out, in out -> batch in"`。

同理，`w2_grad` 的目标是 `[in, out]`，因此要保留 `in/out`，消掉 batch。这就是老师说 einsum 能让链式法则里的转置更不容易写错。

**来源：** `gradients_flops()`，C:L502–545。

### 7.3 `6BP` / `6TP` 从哪里来

![6ND 的来源：幻灯片实测 `num_forward_flops = 134,217,728`、`num_backward_flops = 268,435,456`，证明反向是前向的 2 倍；汇总为前向 2、反向 4、合计 6 倍（#数据点）×（#参数）。](assets/p02/02823.jpg)

*图：6ND 的来源：幻灯片实测 `num_forward_flops = 134,217,728`、`num_backward_flops = 268,435,456`，证明反向是前向的 2 倍；汇总为前向 2、反向 4、合计 6 倍（#数据点）×（#参数）。*

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

这里的“数据点”在普通 MLP 例子里是 batch 中的样本；在语言模型的大线性投影中，每个 token 都对应一行 hidden vector，所以通常把 `B×S` 个 token 视为数据点。于是：

```text
每步 token 数 = batch_size × sequence_length
总 token 数 T = 每步 token 数 × 训练步数
```

这也解释了为什么同一个 `6×参数量×数据量`，在单步分析里常写 `6BP`，在完整预训练预算里常写 `6TP` 或 `6ND`。不同资料的字母命名可能不同，先看它代表 batch、token 数还是参数量，不要只背字母。

**适用范围：** 源码明确说它对 MLP 成立，对短上下文 Transformer 是良好近似。长上下文时 attention 的 `S²` 项、embedding、归一化、通信以及激活重计算会带来额外成本。

**来源：** C:L547–556；字幕关于“6ND 的来源”和长上下文平方项的说明，T:L183。

## 8. 第七层：优化器状态和完整训练循环

### 8.1 AdaGrad 代码在做什么

优化器解决的问题是：“梯度已经算出来，下一步怎样修改参数？”最简单的 SGD 直接沿负梯度方向走；AdaGrad 还会记住每个坐标过去的梯度平方，让经常出现大梯度的坐标以后走得更谨慎。

自定义优化器继承 `torch.optim.Optimizer`：

```python
class AdaGrad(torch.optim.Optimizer):
    def __init__(self, params, lr=0.01):
        super().__init__(params, dict(lr=lr))

    def step(self):
        for group in self.param_groups:
            lr = group["lr"]
            for p in group["params"]:
                ...
```

- `params` 是 `model.parameters()` 提供的可训练参数；
- `param_groups` 把参数分组，每组可拥有不同学习率、权重衰减等超参数；
- `step()` 遍历每个参数，根据 `p.grad` 修改 `p`；
- `self.state[p]` 保存与某个参数绑定、跨 step 延续的历史量。

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

第一步时 `state` 里还没有 `g2`，所以 `state.get(..., torch.zeros_like(grad))` 创建一个和梯度 shape、dtype、device 相同的全零张量。执行 `g2 += grad²` 后，再把它放回 `state[p]`，下一步便能继续累计。

还要区分三个容易混淆的对象：

- `model.state_dict()`：模型中有名字的参数和持久 buffer，用于保存模型；
- `optimizer.state`：运行时以参数对象为键的优化器历史状态；
- `optimizer.state_dict()`：把优化器状态整理成可序列化结构，用于断点续训。

课程 C:L617 展示的是 `model.state_dict()`；C:L628 展示的才是自定义 AdaGrad 更新后产生的 `optimizer.state`。

源码用 `.data` 绕过 autograd，适合讲解机制；生产实现通常在 `torch.no_grad()` 下更新参数，优先使用 PyTorch 内置优化器。

关系梳理：

- Momentum：维护梯度的一阶动量；
- AdaGrad：累计梯度平方；
- RMSProp：对梯度平方做指数移动平均；
- Adam：一阶动量 + 二阶动量。

**来源：** `optimizer()`、自定义 `AdaGrad`，C:L602–680；课程引用的 [AdaGrad 论文](https://jmlr.org/papers/v12/duchi11a.html)。

### 8.2 训练内存账本

![显存账本：参数 `2*(D*D*L)`（bf16）、激活 `2*B*D*L`、梯度 `2*参数量`、优化器状态 `4*参数量`（fp32）；Adam 需 8 字节/参数。](assets/p02/02973.jpg)

*图：显存账本：参数 `2*(D*D*L)`（bf16）、激活 `2*B*D*L`、梯度 `2*参数量`、优化器状态 `4*参数量`（fp32）；Adam 需 8 字节/参数。*

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

这四项还可以按“静态/动态”理解：

- 参数、梯度、优化器状态主要随参数量 `P` 增长，是相对固定的训练底座；
- 激活随 micro-batch、序列长度和层数变化，是最常用来调节峰值显存的部分。

内存既影响容量，也可能影响速度。优化器状态很大，首先限制模型能否放下；逐元素计算频繁读写激活，则更容易成为带宽瓶颈。不能只把所有字节加总后，就认为它们对运行时间的影响完全一样。

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

把每一步的职责讲清楚：

1. `get_batch()` 只负责给出输入和监督目标；
2. `model(x)` 运行 `forward()`，产生预测；
3. 损失函数把整批预测压成一个可优化的标量；
4. `loss.backward()` 只计算并累积梯度，还没有修改参数；
5. `optimizer.step()` 才真正更新参数；
6. `zero_grad()` 为下一个更新周期清理梯度。

课程中的 `pred_y = model(x).mean()` 会得到一个标量，而 `y` 是长度为 B 的向量，`mse_loss` 会发生广播；这只是为了快速展示训练循环的骨架，不是一个严谨设计的回归模型。实际任务通常应让预测和目标 shape 明确一致，并留意 PyTorch 的广播警告。

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

为什么分开算还能得到同一批数据的梯度？因为求和可以拆开：

```text
∇(L₁ + L₂ + ... + Lₖ) = ∇L₁ + ∇L₂ + ... + ∇Lₖ
```

PyTorch 的 `.grad` 默认采用加法累积，所以依次对各 micro-batch 调用 `backward()`，在数学上可以合成整个逻辑 batch 的梯度。若每个 micro-batch 的 loss 是平均值，还必须正确缩放；最后一个 micro-batch 大小不同时，简单除以固定步数也可能不再严格等价，应按样本或 token 数加权。

课堂提到大 batch 往往能提高梯度估计稳定性，但这种收益不会无限增长：超过 critical batch size 后，再增大 batch 的收益会递减。梯度累积解决的是“希望使用较大有效 batch，但单卡放不下激活”的调度矛盾，不会提高单次矩阵乘法的数据并行度，也不自动缩短训练时间。

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

为什么反向需要激活？以一层为例：

```text
h1 ──@W2──> g2 ──ReLU──> h2
```

- 求 `W2.grad` 时需要这层输入 `h1`；
- 求 ReLU 的梯度时需要知道预激活 `g2` 哪些位置大于 0；
- 普通 autograd 会在前向时保存这些反向所需张量。

若把整个 `linear + ReLU` block 设为 checkpoint，前向只保留 block 边界输入。反向走到这里时再用输入重跑一次 block，恢复 `g2` 等中间值，然后继续求梯度。

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

梯度累积和 checkpoint 很容易混：

| 方法 | 切分对象 | 主要少存什么 | 主要代价 |
|---|---|---|---|
| 梯度累积 | batch | 同一时刻的样本激活 | 更多串行 micro-step，可能降低吞吐 |
| 激活检查点 | 网络深度 | 层内部中间激活 | 反向时重做部分前向 |

二者可以同时使用，因为一个沿 batch 维拆，一个沿层深度拆。

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
3. 能解释 `nn.Module`、`nn.Parameter`、`ModuleList` 和 `forward()` 各自负责什么。
4. 能用 `numel × element_size` 算张量内存。
5. 能推导矩阵乘法的 `2BDK`。
6. 能用 `AI` 与 `AI_hw` 判断带宽瓶颈还是计算瓶颈。
7. 能说明 `requires_grad`、`backward()`、`.grad`、`retain_grad()` 的关系。
8. 能从前向一次、反向两次矩阵乘法推到 `6BP`。
9. 能说清 `backward → step → zero_grad` 的先后关系。
10. 能列出参数、梯度、激活、优化器状态四项显存。
11. 能解释梯度累积和激活检查点各自省什么、牺牲什么。

第一次学习可以只抓三条线路：

```text
代码线：Tensor → einops → nn.Module → autograd → optimizer
计算线：矩阵乘法 → FLOPs → MFU → arithmetic intensity → Roofline
显存线：dtype → 四类训练状态 → gradient accumulation / checkpointing
```

如果这十一项都能用自己的话讲出来，你就掌握了 Lecture 2 的基础骨架；FP8/FP4 的具体硬件实现、精确 Transformer FLOPs 和分布式显存切分可以后续再补。
