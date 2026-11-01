public class CarDemo {
    static class Car {
        String name;
        int wheels = 4; // 每次 new Car，都有它自己的一份 wheels。

        Car(String name) {
            this.name = name; // 左边是这辆车的名字，右边是传进来的名字。
        }

        void damage(int count) {
            wheels -= count; // 只修改当前这辆车。
        }
    }

    public static void main(String[] args) {
        Car first = new Car("小红");
        Car second = new Car("小蓝");
        first.damage(2);
        System.out.println(first.name + "剩余轮子：" + first.wheels);
        System.out.println(second.name + "剩余轮子：" + second.wheels);
    }
}
