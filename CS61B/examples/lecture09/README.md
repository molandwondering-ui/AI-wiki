# 复用父类方法，并试一次成功和失败的转换

贵宾犬先用父类的 bark 叫一声，再追加自己的动作。把实际为贵宾犬的 Dog 引用转回 Poodle 会成功；普通 Dog 转成 Poodle 会报错。

[查看完整代码](InheritanceDemo.java) · [返回本讲笔记](../../notes/Lecture09_类继承组合与类型转换.md) · [首次运行说明](../README.md)

## 运行

在 CS61B 目录运行：

```sh
java examples/lecture09/InheritanceDemo.java
```

预期输出：

```text
豆豆：汪
然后摇尾巴
给贵宾犬梳毛
转换后仍是同一只狗：true
小黄是贵宾犬吗：false
转换失败：普通 Dog 不能当作 Poodle
```

## 按这个顺序读代码

`super(name)` 初始化当前对象中父类负责的名字。`dog.bark()` 使用子类重写的方法，其中 `super.bark()` 再明确调用父类版本。强转后用 `==` 可看到引用仍指向同一个对象。最后一次转换是故意制造的失败，实际业务可先用 instanceof 判断，而不是靠报错判断品种。

## 改一处试试

取消 `dog.groom()` 的注释，先看编译器为何拒绝。恢复后，把 ordinary 也改成 `new Poodle("小黄")`，再看哪些输出发生变化。
