# 第二课：文件内容如何存进 Git

来源：https://wyag.thb.lt/#objects 。当前练习只处理 SHA-1 仓库的松散 blob，不支持 tree、commit、打包对象、短 ID 或复杂引用。

blob 是文件内容对象。它保存字节，不保存文件名；同样字节产生同样 ID。

## 亲手运行

在新的练习仓库中操作，避开此前 demo：

```bash
cd /Users/gemini/wyag-learning
./wyag init demo-objects
cd demo-objects
printf 'hello git\n' > hello.txt
../wyag hash-object -w hello.txt
```

记下最后输出的完整 ID。`-w` 表示写入对象存储；不加 -w 只计算 ID。随后把下面占位符替换为完整 ID（不要保留尖括号）：

```bash
../wyag cat-file blob <完整ID>
git cat-file blob <完整ID>
git hash-object hello.txt
git status
```

前两条都应输出 hello git；第三条 ID 应与 WYAG 一致。status 仍显示 No commits yet 和未跟踪的 hello.txt，因为写入 blob 并不等于 add，更不等于 commit。

## 保存过程

hello git 加换行有 10 个字节。程序先加头部：

```text
blob 10\0hello git\n
```

这里 \0 是一个实际的零字节，用于分隔对象头与正文；\n 表示换行。

1. 对“头部 + 正文”计算 SHA-1，得到 40 位 ID。
2. 用 zlib 压缩同一份数据。
3. 写到 .git/objects/ID前两位/ID剩余38位。

读取则按 ID 找文件、解压、拆开头部并输出正文。压缩不是加密。

阅读顺序：main() 的 hash-object 分支 → blob_store() → main() 的 cat-file 分支 → blob_read()。repo_find() 从当前目录向上查找 .git。

## 验证记录

在独立临时仓库验证普通文本、UTF-8 中文和空文件：WYAG 计算的 ID 与 git hash-object 一致，git cat-file 能读取 WYAG 写入的对象，WYAG 也能还原原始字节。没有改变 demo 的文件或提交状态。
