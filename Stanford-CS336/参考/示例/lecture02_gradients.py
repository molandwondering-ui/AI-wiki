"""手算梯度与自动微分对照；改编自官方 gradients_basics / gradients_flops。"""

import torch
from einops import einsum


def main():
    x = torch.tensor([1., 2., 3.])
    w = torch.tensor([1., 1., 1.], requires_grad=True)
    loss = 0.5 * (x @ w - 5).square()
    loss.backward()
    print("标量例子的梯度：", w.grad.tolist())
    print("backward 后权重：", w.detach().tolist())
    torch.testing.assert_close(w.grad, x)
    torch.testing.assert_close(w.detach(), torch.ones(3))

    # float64 仅用于小规模手算对照，降低舍入误差。
    inputs = torch.tensor([[1., 2., 3.], [4., 5., 6.]],
                          dtype=torch.float64, requires_grad=True)
    weights = torch.tensor([[1., 0.], [0., 1.], [1., 1.]],
                           dtype=torch.float64, requires_grad=True)
    output = inputs @ weights
    output.retain_grad()  # 查看中间结果的梯度，用于核对公式。
    output.square().mean().backward()

    with torch.no_grad():
        input_grad = einsum(output.grad, weights, "batch out, feature out -> batch feature")
        weight_grad = einsum(output.grad, inputs, "batch out, batch feature -> feature out")
    torch.testing.assert_close(inputs.grad, input_grad)
    torch.testing.assert_close(weights.grad, weight_grad)
    print("输入梯度与权重梯度：均与自动微分一致")

    rows, input_dim, output_dim = 2, 3, 2
    forward_flops = 2 * rows * input_dim * output_dim
    backward_flops = 2 * forward_flops
    print("矩阵乘法 FLOPs 估算：", forward_flops, "+", backward_flops,
          "=", forward_flops + backward_flops)


if __name__ == "__main__":
    main()
