# Missing Semester：版本控制与 Git 阅读笔记

> 原文：[Version Control (Git) · Missing Semester 2020](https://missing.csail.mit.edu/2020/version-control/)
> 整理日期：2026-10-10
> 阅读目标：理解 Git 如何保存历史，掌握日常修改、提交、分支和远程同步。本文是中文整理与补充示例，未包含课堂视频转录；“现代命令补充”和 AI-wiki 操作流程为额外说明。

## 1. 为什么需要版本控制

版本控制系统（VCS）记录一个项目在不同时间的状态，以及每次修改的作者、说明和历史关系。它可以回答：这个文件以前是什么样？谁改了这行代码？为什么改？某个错误从哪个版本开始出现？

即使一个人写笔记，也有用：可以回看旧版、比较修改、恢复误改，并在分支上尝试新思路。多人协作时，它还帮助大家合并各自的修改、定位冲突。

Git 是版本控制工具；GitHub 是托管 Git 仓库并提供协作功能的平台。Git 可以离线使用，`commit` 不需要连接 GitHub。GitLab 等平台也可以托管 Git 仓库。

原文的学习路线是：**先理解数据模型，再把每条命令理解成对对象和引用的操作。** 如果只背命令，遇到意外状态时很难判断下一步。

## 2. 操作起点：终端当前在哪个目录

大多数操作已有仓库的 Git 命令，需要能从当前目录找到仓库。通常，Git 从当前目录向上寻找 `.git`；仓库根目录和它的子目录都能使用这些命令。

```bash
cd /Users/gemini/AI-wiki
git rev-parse --show-toplevel
git status
git remote -v
```

- `cd` 进入文件夹；不是打开某个 Markdown 文件。
- `git rev-parse --show-toplevel` 显示当前所属仓库的根目录，避免操作错仓库。
- `git status` 显示当前分支以及暂存、未暂存、未跟踪的文件。
- `git remote -v` 查看远程地址，确认后续会推送到哪里。

也可以显式指定目录：`git -C /Users/gemini/AI-wiki status`。

并非所有 Git 命令都要求已处在仓库中。`git clone` 可以在普通目录下载仓库；`git init` 可以创建仓库；`git help` 可以查询帮助。`.git` 通常是目录，某些工作树场景下也可能是指向实际 Git 数据位置的文件。

## 3. 快照：Git 保存的是什么

Git 在逻辑上保存项目的快照，也就是某个版本里被跟踪的文件和目录的完整状态。

| 概念 | 含义 | 例子 |
|---|---|---|
| blob | 文件内容，一串字节 | 某篇笔记的正文 |
| tree | 目录条目，记录名称、模式和指向 blob 或子 tree 的引用 | `notes/` 下有哪些文件 |
| commit | 指向根 tree，并记录父提交、作者等元数据和提交说明 | “新增 Git 阅读笔记”这个版本 |

```text
根目录 tree
├── README.md → blob
└── notes/ → tree
    └── Git.md → blob
```

文件名由 tree 的条目保存，blob 本身只表示内容。内容相同的文件可以引用同一个 blob。未变化的对象可以复用，因此“每次提交是完整快照”不意味着每次都重新复制全部文件。实际存储还可能使用打包和差量压缩。

普通 `git commit` 保存的是**暂存区所描述的快照**，不会自动把磁盘上所有文件都纳入版本。

## 4. 历史：为什么是一张图

如果只有一条开发路线，提交看起来像时间线。但并行开发会分叉，合并又会连接两条路线，所以 Git 的提交历史是有向无环图（DAG）。

下面的连线表示历史延续；真实提交对象保存的是指向父提交的引用。

```text
A ── B ── C ── E ── M    main
          ╲         ╱
           D ── F        feature
```

- 普通提交通常有一个父提交。
- 最初的提交没有父提交。
- 合并提交可以有多个父提交；图中的 M 的父提交是 E 和 F。
- Git 不只记录“文件现在长什么样”，还记录“这个版本从哪些版本发展而来”。

提交对象不可变。`commit --amend` 和 `rebase` 所谓的“修改历史”，实际是创建新提交，再移动引用，而不是原地修改旧提交。

## 5. 对象 ID、分支和 HEAD

Git 用对象 ID 引用对象。原文以 SHA-1 和 40 位十六进制 ID 解释这一机制；现代 Git 也支持 SHA-256 仓库。理解重点是：对象按其序列化内容计算 ID，修改内容或元数据可能产生不同的 ID。

例如，一条提交记录引用根 tree 和父提交，而不是直接把这些对象全部嵌入其中。可以只读查看底层对象：

```bash
git cat-file -p HEAD
git cat-file -p HEAD^{tree}
```

人不方便记忆长 ID，所以 Git 使用可读的引用名称。

| 名称 | 含义 |
|---|---|
| `main` | 本地分支名，指向某条提交 |
| `origin` | 本地为一个远程仓库配置的名字，惯例名，不是关键字 |
| `origin/main` | 本地记录的远程 main 分支位置；可能落后于服务器实际状态 |
| `HEAD` | 表示当前检出位置，通常指向当前分支 |

分支可以理解为**可移动的提交指针**。在某个分支上新建提交后，这个分支会指向新提交。原文举例使用 `master`；实际分支名可能是 `main`、`master` 或其他名字，需要用 `git branch` 确认。

```text
HEAD → main → 提交 C → 提交 B → 提交 A
```

如果直接检出某个提交 ID，HEAD 会直接指向提交，进入 detached HEAD 状态。在这个位置试验是可以的；如果要保留后续工作，可以创建分支：`git switch -c experiment`。

## 6. 工作区、暂存区、提交：最重要的三个状态

```text
工作区             暂存区（index）        本地提交历史          远程仓库
编辑文件 ── add ──→ 下一次提交的内容 ── commit ──→ 新提交 ── push ──→ 同步
```

- **工作区**：你正在编辑的实际文件。
- **暂存区**：准备放进下一次提交的内容。它可以只包含部分修改。
- **本地提交历史**：已经由 `commit` 保存的版本。

假设你修改了两篇笔记，只想先提交 Git 笔记：

```bash
git add -- notes/Git.md
git diff --staged
git commit -m "docs: add Git version control notes"
```

`git add` 暂存的是执行当时的文件内容。如果之后继续编辑同一个文件，新的修改不会自动进入暂存区，需要再次 `add`。所以一个文件可能同时有“已暂存修改”和“未暂存修改”。

原文强调暂存区的价值：把逻辑独立的修改拆成清晰的提交，例如只提交修复，不把临时调试语句一起放进去。`git add -p` 可以交互选择修改片段。

### 三种 diff 的比较对象

| 命令 | 比较什么 |
|---|---|
| `git diff` | 工作区与暂存区：尚未暂存的修改 |
| `git diff --staged` | 暂存区与 HEAD：下次准备提交的修改 |
| `git diff HEAD` | 工作区与 HEAD：已跟踪文件相对当前提交的修改 |
| `git diff A B -- path/to/file` | 两个版本中某个文件的差异 |

普通 `git diff` 不会展示未跟踪文件的正文。因此检查新文件时，既要看 `status`，也要在暂存后查看 `diff --staged`。

## 7. 常用命令：按问题来记

### 查看状态和历史

```bash
git status
git log --all --graph --decorate --oneline
git log -- README.md
git show HEAD
git blame README.md
git help commit
```

`log` 看提交历史；`show` 查看某条提交的详情和修改；`blame` 显示每行最近关联的修改提交。`blame` 提供历史线索，不一定代表该行最初的作者，更不能直接等同于责任归属。

提交说明应让后来的人知道这次修改做了什么；有必要时说明为什么改。把“新增笔记”和“修改另一门课的内容”拆成独立提交，通常更容易回溯。

### 创建、切换和合并分支

```bash
git branch
git switch -c git-notes
# 编辑并提交后，回到主分支合并
git switch main
git merge git-notes
```

现代命令补充：原文的 `git checkout -b git-notes` 相当于这里的 `git switch -c git-notes`。`git branch git-notes` 只创建分支，不切换。

`git merge git-notes` 把目标分支合并进**当前分支**。若当前分支是目标分支的祖先，可能只移动指针，称为 fast-forward，不一定产生新合并提交。

若双方修改不能自动合并，Git 会提示冲突。用 `git status` 找到文件，编辑并去掉 `<<<<<<<`、`=======`、`>>>>>>>` 等标记，保留正确内容，再 `git add` 并完成提交。也可以使用 `git mergetool`。要退出尚未完成的合并，可用 `git merge --abort`。

`git rebase main` 则把当前分支的一系列提交在 main 的新位置重新应用，通常会产生新的提交 ID。它适合整理自己的开发分支；对已经共享的历史，应先与协作者协调。

## 8. 远程同步：commit、fetch、pull、push 的区别

| 命令 | 作用 | 会把改动发布到远程吗？ |
|---|---|---|
| `git clone URL` | 创建本地仓库，通常配置 origin 并检出默认分支 | 否 |
| `git fetch origin` | 下载远程对象，更新本地远程跟踪引用 | 否 |
| `git pull` | 获取远程变化，并整合进当前分支 | 否 |
| `git commit` | 创建本地提交 | 否 |
| `git push` | 把提交对象发送到远程，并请求更新远程引用 | 是 |

原文把 `pull` 解释为 fetch 后 merge。现代 Git 中，整合方式还受到命令选项和配置影响，可以使用 rebase；`git pull --ff-only` 只允许快进，分叉时会停止。

```bash
git remote -v
git fetch origin
git log --all --graph --decorate --oneline
git push -u origin git-notes
```

`-u` 为成功推送的分支设置 upstream，之后在该分支上通常可以直接使用 `git push`。

完整推送形式是 `git push <remote> <local-branch>:<remote-branch>`。例如 `git push origin main:main` 表示用本地 main 请求更新远程 main。不是把当前文件夹里所有文件直接上传。

如果 push 被拒绝为 non-fast-forward，常见原因是远程包含本地没有的提交。先 fetch、查看历史，再合并或变基并处理冲突；不要直接用强制推送覆盖他人的提交。远程地址、认证信息和仓库权限也影响 push 是否成功。

## 9. 撤销：先判断修改在哪个阶段

以下“现代命令补充”用 `restore` 拆开原文中 `checkout` 的部分职责。

| 目标 | 命令 | 后果 |
|---|---|---|
| 取消暂存，保留文件修改 | `git restore --staged -- path/to/file` | 修改回到未暂存状态 |
| 丢弃文件未暂存的修改 | `git restore -- path/to/file` | 工作区恢复为暂存区版本，会丢失这部分修改 |
| 修正最近一次本地提交 | `git commit --amend` | 创建新提交替代分支末端的旧提交 |
| 撤销已提交修改，同时保留历史 | `git revert <commit>` | 创建一个反向修改的新提交；合并提交需要额外指定父线 |
| 暂时收起修改 | `git stash push -m "draft notes"` | 保存修改，使工作区便于切换任务 |
| 恢复暂存的工作 | `git stash pop` | 应用 stash，成功后删除对应记录；发生冲突时可能保留记录 |

原文的 `git reset HEAD <file>` 可以取消暂存；`git checkout -- <file>` 可以丢弃文件未暂存修改。

默认 stash 不包含未跟踪文件，需要时使用 `git stash push -u`；忽略文件也不会因此被包含。`git stash list` 查看记录，`git stash apply` 恢复但不删除记录。

`git reset --hard <commit>` 会移动当前分支并重置暂存区和工作区，可丢弃已跟踪文件的未提交修改；它不是日常“取消暂存”的必要步骤。`git reflog` 可以帮助找回仍可访问的旧提交，但不能保证找回从未提交、也未 stash 的内容。

## 10. 进阶工具与容易混淆的细节

- **`git add -p`**：按片段暂存，拆分逻辑独立的修改。
- **`git rebase -i`**：交互整理提交，例如重排、合并或修改说明；会改写历史。
- **`git bisect`**：给出已知正常版本和异常版本后，二分定位引入问题的提交。
- **`git clone --depth=1`**：浅克隆，减少历史下载；需要完整历史分析时再补全。
- **`.gitignore`**：声明有意不跟踪的文件，例如系统临时文件；对已经跟踪的文件不会自动取消跟踪。
- **配置、编辑器和 GUI 集成**：帮助查看状态与操作，但理解对象、分支和暂存区仍然重要。

可选的图形历史快捷命令：

```bash
git config --global alias.graph 'log --all --graph --decorate --oneline'
git graph
```

这会修改用户全局配置；上述代码只是供学习时手动使用，整理本文没有执行它。

删除工作区里的文件并提交，不会删除它在旧历史中的内容。如果误提交密钥，应先撤销或轮换密钥，再处理历史；历史清理还涉及远程和其他克隆副本。原文把删除不应纳入版本的文件历史作为练习，不是建议直接在正式仓库试验。

## 11. 应用到 AI-wiki：从修改笔记到推送

下面是后续发布本文时的操作示例，**并非已经执行的发布记录**。建议在仓库根目录执行，让路径明确。

### 第一步：确认仓库、分支和已有修改

```bash
cd /Users/gemini/AI-wiki
git rev-parse --show-toplevel
git status
git branch --show-current
git remote -v
```

确认远程地址是预期的 AI-wiki 仓库。若有其他任务的修改，暂存时只选本次笔记与索引，不要顺手全部纳入。

### 第二步：检查、暂存并提交

```bash
git diff -- README.md
git add -- README.md git/README.md git/Version-Control-Git.md
git diff --staged
git commit -m "docs: add Missing Semester Git reading notes"
git status
```

提交前的 `git diff --staged` 是最后一次检查：内容是否正确，是否夹带了其他文件。

### 第三步：查看远程变化，再推送当前目标分支

```bash
git fetch origin
git log --all --graph --decorate --oneline -15
git branch -vv
```

从结果判断当前分支与 upstream 的关系。若远程已有新提交，应先整合；工作区有未提交修改时，先妥善保存。整合方式取决于项目的分支约定，不应机械执行一条固定 pull 命令。

如果当前是有 upstream 的目标分支，可执行 `git push`。如果准备发布一个新的 `git-notes` 分支，可执行 `git push -u origin git-notes`，随后在 GitHub 创建 pull request。若直接推送 main，应确认当前分支确实是 main 且符合仓库协作约定。

**记忆顺序：进入正确仓库 → 查看状态 → 编辑 → 选择暂存内容 → 检查 → 本地提交 → 获取并整合远程变化 → 推送。**

## 12. 原文练习：如何学到能独立使用

原文最后提供练习，重点是把命令和数据模型对应起来。建议在练习仓库操作：

1. 用 [Learn Git Branching](https://learngitbranching.js.org/) 观察提交、分支、HEAD 如何变化。
2. 克隆课程网站仓库 `https://github.com/missing-semester/missing-semester.git`，使用图形日志查看历史。
3. 用 `git log -1 -- README.md` 找到最后修改 README 的提交；用 `git show <提交ID>` 查看作者、说明和内容。
4. 在 `_config.yml` 找到 `collections:` 的行号，用 `git blame -L 行号,行号 -- _config.yml` 定位提交，再 `git show <提交ID>` 看当时为什么修改。此处“行号”需要替换为实际数字。
5. 修改一个已跟踪文件，执行 stash，比较工作区与 `git log --all --oneline`，再 pop 恢复。思考它为什么适合临时切换任务。
6. 配置 `git graph` 别名；尝试全局忽略 `.DS_Store` 等机器相关文件。全局忽略路径配置后，还需要实际创建对应文件。
7. 在练习仓库体验历史清理；只有发现真实改进时，再 fork 课程仓库并提交有用的 PR。

这些是学习建议，本文整理时未实际完成上述练习。

## 13. 自检：能回答这些问题，就理解了主线

- 为什么在仓库子目录也能执行 Git 命令？因为 Git 通常向上发现仓库。
- 为什么 `add` 后再编辑，还要重新 `add`？因为暂存区不会自动追踪后续编辑。
- 为什么 commit 后 GitHub 页面还没变？因为 commit 只保存到本地，还没有 push。
- 为什么分支创建很快？因为分支主要是一个引用，不是复制整个项目。
- 为什么 `origin/main` 可能不是服务器最新状态？因为它是本地记录，需要 fetch 更新。
- 为什么 merge 有时没有新提交？因为可以快进移动指针。
- 为什么 amend 会改变提交 ID？因为它创建了内容或元数据不同的新提交对象。

## 参考与署名

- [Missing Semester 2020：Version Control (Git)](https://missing.csail.mit.edu/2020/version-control/)：本文主要来源，课程由 Anish Athalye、Jon Gjengset 和 Jose Javier Gonzalez 编写与讲授。原站注明 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；本文对原讲义的中文改编部分沿用该许可，改动包括中文归纳、重排和新增示例。
- [Pro Git 中文版](https://git-scm.com/book/zh/v2)：原文推荐精读前五章，进一步学习操作和工作流。
- [Git 官方命令文档](https://git-scm.com/docs)：查询命令选项与版本行为。
- [Oh Shit, Git!?!](https://ohshitgit.com/)：常见错误的恢复指南。
- [Learn Git Branching](https://learngitbranching.js.org/)：通过可视化练习理解分支与历史。
