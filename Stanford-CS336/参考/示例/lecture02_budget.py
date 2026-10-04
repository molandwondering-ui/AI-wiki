"""复算官方 motivating_questions；仅用 Python 标准功能，不需要 GPU。"""


def main():
    parameters = 70e9
    tokens = 15e12
    gpu_count = 1024
    h100_dense_bf16_flops_per_second = 1979e12 / 2
    mfu = 0.5
    training_flops = 6 * parameters * tokens
    effective_flops_per_second = gpu_count * h100_dense_bf16_flops_per_second * mfu
    days = training_flops / effective_flops_per_second / 86400
    print(f"训练计算量：{training_flops:.2e} FLOPs")
    print(f"按给定假设估算的时间：{days:.1f} 天")

    # BF16 参数、BF16 梯度、两组 FP32 Adam 状态。
    bytes_per_parameter = 2 + 2 + 4 + 4
    parameter_upper_bound = 8 * 80e9 / bytes_per_parameter
    print(f"8 张 80 GB 卡的参数量上界：{parameter_upper_bound / 1e9:.1f} B")
    print("上界假设训练状态在多卡间切分，且没有为激活等开销留空间。")


if __name__ == "__main__":
    main()
