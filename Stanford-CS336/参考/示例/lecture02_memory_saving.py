"""比较整批、梯度累积和检查点的结果；不在 CPU 上宣称 GPU 显存收益。"""

from copy import deepcopy

import torch
from torch import nn
import torch.nn.functional as F
from torch.utils.checkpoint import checkpoint


def main():
    torch.manual_seed(7)
    full_model = nn.Sequential(
        nn.Linear(4, 8, bias=False), nn.ReLU(), nn.Linear(8, 2, bias=False)
    ).double()
    accumulated_model = deepcopy(full_model)
    checkpointed_model = deepcopy(full_model)
    inputs = torch.randn(64, 4, dtype=torch.float64)
    targets = torch.randn(64, 2, dtype=torch.float64)

    # 一次计算完整 64 个样本的平均损失。
    full_output = full_model(inputs)
    F.mse_loss(full_output, targets).backward()

    # 8 个等大的微批次，累加同一批样本的平均梯度；中途不更新参数。
    for start in range(0, 64, 8):
        prediction = accumulated_model(inputs[start:start + 8])
        loss = F.mse_loss(prediction, targets[start:start + 8])
        (loss / 8).backward()

    for full_parameter, accumulated_parameter in zip(
        full_model.parameters(), accumulated_model.parameters()
    ):
        torch.testing.assert_close(full_parameter.grad, accumulated_parameter.grad)
    print("整批与梯度累积：各参数的梯度一致")

    # 检查点在反向时重算需要的中间结果。
    checkpointed_output = checkpoint(checkpointed_model, inputs, use_reentrant=False)
    F.mse_loss(checkpointed_output, targets).backward()
    torch.testing.assert_close(full_output, checkpointed_output)
    for full_parameter, checkpointed_parameter in zip(
        full_model.parameters(), checkpointed_model.parameters()
    ):
        torch.testing.assert_close(full_parameter.grad, checkpointed_parameter.grad)
    print("普通前向与检查点：输出、各参数的梯度一致")
    print("此例只核对计算结果；GPU 上能省多少显存，要另行测量。")


if __name__ == "__main__":
    main()
