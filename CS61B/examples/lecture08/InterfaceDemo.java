public class InterfaceDemo {
    interface Greeter {
        String greet(String name);
        default String description() { return "通用问候"; }
    }

    static class ChineseGreeter implements Greeter {
        @Override
        public String greet(String name) { return "你好，" + name; }
    }

    static class EnglishGreeter implements Greeter {
        @Override
        public String greet(String name) { return "Hello, " + name; }
        @Override
        public String description() { return "英文问候"; }
    }

    public static void main(String[] args) {
        Greeter[] tools = {new ChineseGreeter(), new EnglishGreeter()};
        for (Greeter tool : tools) {
            // 编译时看 Greeter 是否声明这些方法；运行时看实际对象的实现。
            System.out.println(tool.description() + "：" + tool.greet("Lin"));
        }
    }
}
