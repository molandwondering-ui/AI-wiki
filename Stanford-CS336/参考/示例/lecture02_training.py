"""模型模块、AdaGrad 与训练步骤；改编自官方 Block / DeepNetwork / AdaGrad。

教学版：用 no_grad 更新参数，让预测和目标形状一致；不是完整通用优化器。
"""

import math

import torch
from torch import nn
import torch.nn.functional as F


class Block(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.weight = nn.Parameter(torch.randn(dim, dim) / math.sqrt(dim))

    def forward(self, x):
        return F.relu(x @ self.weight)


class DeepNetwork(nn.Module):
    def __init__(self, dim, num_layers):
        super().__init__()
        self.layers = nn.ModuleList([Block(dim) for _ in range(num_layers)])

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x


class AdaGrad(torch.optim.Optimizer):
    def __init__(self, params, lr=0.01):
        super().__init__(params, dict(lr=lr))

    @torch.no_grad()
    def step(self):
        for group in self.param_groups:
            for parameter in group["params"]:
                if parameter.grad is None:
                    continue
                state = self.state[parameter]
                if "g2" not in state:
                    state["g2"] = torch.zeros_like(parameter)
                grad = parameter.grad
                state["g2"].add_(grad.square())
                parameter.add_(-group["lr"] * grad / (state["g2"] + 1e-5).sqrt())


def main():
    torch.manual_seed(0)
    model = DeepNetwork(dim=4, num_layers=2)  # CPU，参数和优化器状态均为 FP32。
    optimizer = AdaGrad(model.parameters())
    inputs = torch.randn(2, 4)
    targets = torch.tensor([1., 2.])
    before = [parameter.detach().clone() for parameter in model.parameters()]
    print("参数个数：", sum(parameter.numel() for parameter in model.parameters()))

    for step in range(3):
        optimizer.zero_grad(set_to_none=True)
        predictions = model(inputs).mean(dim=-1)  # 每个样本一个预测值。
        assert predictions.shape == targets.shape
        loss = F.mse_loss(predictions, targets)
        loss.backward()
        optimizer.step()
        print(f"第 {step + 1} 次更新前的 loss：{loss.item():.6f}")

    changed = any(not torch.equal(old, new) for old, new in zip(before, model.parameters()))
    assert changed
    states = [state["g2"] for state in optimizer.state.values()]
    print("参数是否改变：", changed)
    print("AdaGrad 历史状态的元素数：", sum(state.numel() for state in states))
    print("AdaGrad 历史状态的字节数：", sum(state.numel() * state.element_size() for state in states))


if __name__ == "__main__":
    main()
