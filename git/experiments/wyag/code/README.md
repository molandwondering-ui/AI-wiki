# WYAG 当前代码：init 与 blob

2026-10-11 的学习版本，来源：[Write Yourself a Git](https://wyag.thb.lt/)。这是根据教程思路编写的简化实现，不是完整 Git。

## 文件

- `wyag`：Python 命令行入口。
- `libwyag.py`：仓库初始化、仓库查找、blob 保存与读取、命令解析。
- [lesson-02.md](lesson-02.md)：blob 原理与操作说明，其中本地路径需替换为自己的代码目录。

支持 Python 3.10+，只依赖标准库。当前支持普通 `.git` 目录、SHA-1 和松散 blob，使用 `main` 作为初始分支；已有 `.git` 时拒绝重复初始化。

## 从 GitHub 克隆后运行

先进入本文件所在的 `code` 目录；以下命令适用于 macOS/Linux。`demo` 应是尚未存在的新练习目录。

```bash
./wyag --help
./wyag init demo
cd demo
printf 'hello git\n' > hello.txt
../wyag hash-object -w hello.txt
../wyag cat-file blob 8d0e41234f24b6da002d962a26c2495ea16a425f
git cat-file blob 8d0e41234f24b6da002d962a26c2495ea16a425f
git status
```

若文件下载后失去执行权限，可用 `chmod +x wyag`，或在代码目录用 `python3 wyag --help` 启动。

两次 cat-file 都应显示 `hello git`，status 仍显示未跟踪文件且没有提交。保存对象不等于暂存或提交。

## 尚未实现

tree、commit、引用解析、索引与 add、status、分支切换、reset、远程 fetch/push、pack 文件和短对象 ID。实验记录中的这些操作使用系统安装的真正 Git。

阅读顺序：`wyag` → `main()` → `repo_create()`/`repo_find()` → `blob_store()` → `blob_read()`。

这里保存程序与学习说明；本地练习仓库及 Python 缓存不随代码上传。

[实验 01](../01-从初始化到第一次提交.md) · [实验 02](../02-提交历史分支与恢复.md)
