public class InheritanceDemo {
    static class Dog {
        private final String name;
        Dog(String name) { this.name = name; }
        void bark() { System.out.println(name + "：汪"); }
    }

    static class Poodle extends Dog {
        Poodle(String name) { super(name); }
        @Override
        void bark() {
            super.bark(); // 在这只狗上使用父类实现，没有创建另一只狗。
            System.out.println("然后摇尾巴");
        }
        void groom() { System.out.println("给贵宾犬梳毛"); }
    }

    public static void main(String[] args) {
        Dog dog = new Poodle("豆豆");
        dog.bark(); // 实际对象是 Poodle，因此运行 Poodle 的重写。
        // dog.groom(); // 若取消注释，编译失败：Dog 没声明 groom。
        Poodle poodle = (Poodle) dog;
        poodle.groom();
        System.out.println("转换后仍是同一只狗：" + (dog == poodle));
        Dog ordinary = new Dog("小黄");
        System.out.println("小黄是贵宾犬吗：" + (ordinary instanceof Poodle));
        try {
            Poodle wrong = (Poodle) ordinary; // 故意演示不匹配的转换。
            wrong.groom();
        } catch (ClassCastException error) {
            System.out.println("转换失败：普通 Dog 不能当作 Poodle");
        }
    }
}
