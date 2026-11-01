# 可以直接运行的 Java 小例子

先挑对应讲次的例子，看预期输出，再运行代码对照。每个文件都是完整程序，有 main，不需要拼接课堂片段，也不用添加第三方依赖。代码是为笔记补写的教学示例，不是课程官方 starter 或逐字转录。

## 第一次怎么运行

在 IntelliJ 中打开一个 `.java` 文件，选择 JDK 17 或更新版本，点 main 旁边的绿色三角形。若提示没有项目 SDK，在 File → Project Structure → Project 的 SDK 中选择已安装的 JDK。

也可以在终端运行。先进入 AI-wiki 的 `CS61B` 目录，例如这台电脑：

```sh
cd /Users/gemini/AI-wiki/CS61B
java examples/lecture03/ReferenceDemo.java
```

这里 `java 文件.java` 会直接编译并运行这一份源文件，适合这些独立例子。如果系统的 java 提示找不到运行环境，这台电脑已验证可用的命令是：

```sh
/opt/homebrew/opt/openjdk/bin/java examples/lecture03/ReferenceDemo.java
```

其他电脑请使用自己安装的 JDK 路径。每个例子目录都有运行命令、完整输出和阅读提示。

## 按讲次选择

| 讲次 | 看什么 |
|---|---|
| Lecture 1 | [两辆车，各记各的轮子数](lecture01/README.md) |
| Lecture 2 | [比较两只狗：点号前面有没有当前对象](lecture02/README.md) |
| Lecture 3 | [改数组里的数，和改为指向另一个数组](lecture03/README.md) |
| Lecture 4 | [空列表也有一个固定的起点](lecture04/README.md) |
| Lecture 5 | [复制了一排位置，为什么里面的对象还会一起变](lecture05/README.md) |
| Lecture 6 | [让程序自动检查算出来的方差](lecture06/README.md) |
| Lecture 7 | [亲眼看见元素数量和容量分别怎么变](lecture07/README.md) |
| Lecture 8 | [同一个接口变量，为什么能有不同表现](lecture08/README.md) |
| Lecture 9 | [复用父类方法，并试一次成功和失败的转换](lecture09/README.md) |
| Lecture 19 | [Aa 和 BB 哈希值相同，为什么还能分别查出来](lecture19/README.md) |

这些例子用于先看懂一个知识点。要练习自己找错、实现数据结构，再去做 [Labs](../labs/README.md)。
