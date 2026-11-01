public class DogDemo {
    static class Dog {
        int weight;
        Dog(int weight) { this.weight = weight; }

        // 类方法：两只狗都从参数传进来。
        static Dog heavier(Dog a, Dog b) {
            return a.weight >= b.weight ? a : b;
        }

        // 实例方法：this 是点号前面的狗，另一只从参数传入。
        Dog heavier(Dog other) {
            return weight >= other.weight ? this : other;
        }
    }

    public static void main(String[] args) {
        Dog small = new Dog(5);
        Dog big = new Dog(20);
        System.out.println("类方法选中：" + Dog.heavier(small, big).weight);
        System.out.println("实例方法选中：" + small.heavier(big).weight);
        System.out.println("返回原来的 big：" + (small.heavier(big) == big));
    }
}
