"""张量内存与 einops；改编自官方 lecture_02.py 的 tensors_memory / einops_*。"""

import torch
from einops import einsum, rearrange, reduce


def main():
    table = torch.zeros(4, 8, dtype=torch.float32)
    memory_bytes = table.numel() * table.element_size()
    print("4×8 FP32 张量的字节数：", memory_bytes)
    assert memory_bytes == 128

    x = torch.tensor([[1., 2., 3.], [4., 5., 6.]])
    w = torch.tensor([[1., 0.], [0., 1.], [1., 1.]])
    result = einsum(x, w, "row feature, feature out -> row out")
    torch.testing.assert_close(result, x @ w)
    print("矩阵乘法结果：", result.tolist())

    means = reduce(x, "row feature -> row", "mean")
    print("每行平均值：", means.tolist())
    torch.testing.assert_close(means, torch.tensor([2., 5.]))

    features = torch.arange(24).reshape(2, 3, 4)
    heads = rearrange(
        features, "batch seq (head channel) -> batch head seq channel", head=2
    )
    merged = rearrange(heads, "batch head seq channel -> batch seq (head channel)")
    print("拆成两个头后的形状：", tuple(heads.shape))
    print("合并后是否恢复原数据：", torch.equal(features, merged))
    assert torch.equal(features, merged)


if __name__ == "__main__":
    main()
