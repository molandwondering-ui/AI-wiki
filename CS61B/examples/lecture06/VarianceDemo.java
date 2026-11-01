public class VarianceDemo {
    static double variance(double[] numbers) {
        if (numbers.length == 0) { return 0.0; } // 本例明确约定空数组返回 0。
        double sum = 0.0;
        for (double number : numbers) { sum += number; }
        double mean = sum / numbers.length;
        double squared = 0.0;
        for (double number : numbers) {
            double difference = number - mean;
            squared += difference * difference;
        }
        return squared / numbers.length; // 除以 N，不是 N - 1。
    }

    static void check(double[] input, double expected) {
        double actual = variance(input);
        // 容许少量浮点舍入误差，但 NaN、无穷和明显错误都不能通过。
        if (!Double.isFinite(actual) || Math.abs(actual - expected) > 1e-9) {
            throw new AssertionError("预期 " + expected + "，实际 " + actual);
        }
    }

    public static void main(String[] args) {
        check(new double[] {1, 2, 3, 4}, 1.25);
        check(new double[] {}, 0.0);
        check(new double[] {5, 5}, 0.0);
        check(new double[] {-2, -1}, 0.25);
        check(new double[] {0.5, 1.5}, 0.25);
        System.out.println("5 组方差检查全部通过");
        System.out.println("整数除法：" + (59 / 8));
        System.out.println("浮点除法：" + (59.0 / 8));
    }
}
