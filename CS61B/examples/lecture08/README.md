# 同一个接口变量，为什么能有不同表现

两种打招呼工具都叫 greet。第一种沿用接口的通用介绍，第二种改写介绍方式。main 用同一段循环调用它们。

[查看完整代码](InterfaceDemo.java) · [返回本讲笔记](../../notes/Lecture08_接口继承与动态方法选择.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture08/InterfaceDemo.java
```

预期输出：

```text
通用问候：你好，Lin
英文问候：Hello, Lin
```

## 按这个顺序读代码

接口约定 greet 接收名字、返回问候语。两个类都实现它，所以都能放进 Greeter 数组。ChineseGreeter 没写 description，就用接口默认方法；EnglishGreeter 重写了它，运行时就选这份。这个例子把课堂列表换成问候语，专门让你看清接口和方法选择。

## 改一处试试

把 EnglishGreeter 的 description 方法连同它的 @Override 删除。第二行开头会变成什么？再加一种自己的问候实现，看看 main 的循环是否需要改。
