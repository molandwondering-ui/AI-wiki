"""WYAG 练习：init 和 blob 对象；根据原教程简化，使用 main 作为初始分支。"""
import argparse
import configparser
import hashlib
import sys
import zlib
from pathlib import Path


def repo_create(path):
    """在指定目录建立最小 Git 仓库结构，不改动已有文件。"""
    worktree = Path(path).resolve()  # 正在编辑的项目目录
    gitdir = worktree / ".git"      # Git 保存管理数据的目录

    if worktree.exists() and not worktree.is_dir():
        raise ValueError(f"路径不是文件夹：{worktree}")
    # 练习版不处理重复初始化，防止覆盖已有 Git 数据。
    if gitdir.exists():
        raise ValueError(f".git 已存在，练习版不会覆盖：{gitdir}")

    worktree.mkdir(parents=True, exist_ok=True)
    for name in ("objects", "refs/heads", "refs/tags"):
        (gitdir / name).mkdir(parents=True, exist_ok=True)

    # HEAD 先指向分支名；第一次提交前，该分支还没有提交 ID。
    (gitdir / "HEAD").write_text("ref: refs/heads/main\n", encoding="utf-8")
    (gitdir / "description").write_text(
        "WYAG learning repository\n", encoding="utf-8"
    )

    config = configparser.ConfigParser()
    config["core"] = {
        "repositoryformatversion": "0",  # 基本仓库格式
        "filemode": "false",             # 不跟踪工作区权限位变化
        "bare": "false",                 # 仓库有工作区
    }
    with (gitdir / "config").open("w", encoding="utf-8") as file:
        config.write(file)

    return worktree


def repo_find(path="."):
    """从当前目录向上找 .git；本练习只支持普通仓库。"""
    start = Path(path).resolve()
    for directory in (start, *start.parents):
        if (directory / ".git").is_dir():
            return directory
    raise ValueError("当前目录不属于普通 Git 仓库")


def blob_store(data, worktree=None):
    """为文件字节加对象头，计算 ID；指定仓库时才写入。"""
    header = f"blob {len(data)}".encode("ascii") + b"\x00"
    raw = header + data
    oid = hashlib.sha1(raw).hexdigest()
    if worktree is not None:
        path = worktree / ".git" / "objects" / oid[:2] / oid[2:]
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_bytes(zlib.compress(raw))
    return oid


def blob_read(worktree, oid):
    """读取完整 SHA-1 ID 对应的松散 blob；其他对象留待后续课程。"""
    if len(oid) != 40 or any(c not in "0123456789abcdef" for c in oid):
        raise ValueError("本练习要求完整的 40 位小写十六进制对象 ID")
    path = worktree / ".git" / "objects" / oid[:2] / oid[2:]
    raw = zlib.decompress(path.read_bytes())
    header, data = raw.split(b"\x00", 1)
    kind, size = header.split(b" ", 1)
    if kind != b"blob" or int(size) != len(data):
        raise ValueError("不是有效的 blob 对象")
    if hashlib.sha1(raw).hexdigest() != oid:
        raise ValueError("对象内容与 ID 不一致")
    return data


def main():
    parser = argparse.ArgumentParser(description="WYAG：init 与 blob 对象练习")
    commands = parser.add_subparsers(dest="command", required=True)
    init_parser = commands.add_parser("init", help="创建仓库")
    init_parser.add_argument("path", nargs="?", default=".")
    hash_parser = commands.add_parser("hash-object", help="计算文件的 blob ID")
    hash_parser.add_argument("-w", action="store_true", help="同时写入仓库")
    hash_parser.add_argument("path")
    cat_parser = commands.add_parser("cat-file", help="读取松散 blob 的内容")
    cat_parser.add_argument("kind", choices=["blob"])
    cat_parser.add_argument("oid")
    args = parser.parse_args()

    try:
        if args.command == "init":
            worktree = repo_create(args.path)
            print(f"已创建练习仓库：{worktree / '.git'}")
        elif args.command == "hash-object":
            data = Path(args.path).read_bytes()
            worktree = repo_find() if args.w else None
            print(blob_store(data, worktree))
        elif args.command == "cat-file":
            sys.stdout.buffer.write(blob_read(repo_find(), args.oid))
    except (ValueError, OSError, zlib.error) as error:
        parser.exit(1, f"错误：{error}\n")
