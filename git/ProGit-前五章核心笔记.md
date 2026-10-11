来源：[《Pro Git》第二版中文版](https://git-scm.com/book/zh/v2)，Scott Chacon、Ben Straub 著，社区翻译与维护。范围：第 1–5 章，共 37 节。阅读日期：2026-10-11。

本笔记按原书顺序概括，重点解释概念、操作之间的关系和常见误区。书中示例多使用 `master`，这里统一以 `main` 为例，实际操作应使用自己仓库的分支名。`switch`、`restore` 等较新的写法单独标明为补充，不视为原书所有示例都已更新。

文中的 `<URL>`、`<提交ID>` 和示例文件名需要替换为实际值。小节按主题重新归纳，正文中的“§”链接对应原书章节编号。

# Pro Git 前五章核心笔记

## 先把五章连成一条线

| 章节 | 核心问题 | 学完应掌握的能力 |
|---|---|---|
| 1. 起步 | Git 如何记录版本？ | 理解快照、工作区、暂存区和本地仓库，完成基本配置。 |
| 2. Git 基础 | 怎样把一次修改保存和分享出去？ | 查看状态、选择修改、提交、查历史、撤销、操作远程和标签。 |
| 3. Git 分支 | 怎样同时做几件事，再把成果整合起来？ | 创建分支，理解合并与变基，处理冲突和远程分支。 |
| 4. 服务器上的 Git | 多个人通过什么地方交换提交？ | 理解裸仓库、传输协议、认证和托管平台。 |
| 5. 分布式 Git | 团队怎样组织贡献、审核与发布？ | 使用主题分支和协作流程，审查差异，选择整合方式。 |

最重要的关系是：**文件保存在磁盘上、修改进入下一次提交、提交已经生成、提交已经发布到远程，是四件不同的事。**

```text
编辑文件
   ↓
工作区 ── git add ──→ 暂存区 ── git commit ──→ 本地提交
                                                │
                                             git push
                                                ↓
                                            远程仓库

远程仓库 ── git fetch ──→ 本地对象与远程跟踪引用
                              │
                         merge / rebase
                              ↓
                         当前本地分支
```

图中概括的是常规操作。`git add` 会把所选内容记录到索引及对象库中，但还没有生成一次提交；`git fetch` 获取远程数据，也不会自动把当前分支改成远程版本。

## 第 1 章：起步

原文：[版本控制][s1-1] · [Git 是什么][s1-3] · [初次配置][s1-6]

### 1.1 Git 的用途和基本设计

版本控制记录文件如何随时间变化，让你能够比较版本、查找修改来源、恢复历史，并与他人协作。Git 于 2005 年因 Linux 内核开发的需要而诞生，设计重点包括速度、分布式协作和高效分支。[§1.2][s1-2]

Git 从概念上记录项目的**快照**：一次提交描述某个时刻被跟踪内容的状态，未变化的内容可以复用已有对象。理解为快照，不代表每次都在磁盘上完整复制一个项目目录。

Git 是分布式版本控制系统。通常的完整克隆包含项目历史，因此查看历史、比较差异、创建提交等操作可以离线完成。远程仓库主要用于交换提交，不承担每一次本地操作。浅克隆、部分克隆等是有意减少下载内容的特殊情况。

提交由对象 ID 标识。书中主要讲 SHA-1；学习时先记住“用 ID 精确定位提交”即可。哈希校验有助于发现内容变化，提交作者的真实性则是另一个问题，不能只凭作者字段判断。

### 1.2 三个区域与文件状态

| 概念 | 具体含义 | 典型操作 |
|---|---|---|
| 工作区 working tree | 磁盘上正在编辑的文件 | 编辑器保存、文件新增和修改 |
| 暂存区 staging area / index | 准备写入下一次提交的内容状态 | `git add`、取消暂存 |
| 本地仓库 repository | Git 对象、提交历史、分支等数据；普通仓库通常保存在 `.git` 中 | `git commit`、`git log` |

文件还要区分**已跟踪**和**未跟踪**。一个新文件即使已经保存到磁盘，也不一定会进入下一次提交。已跟踪文件的修改可以处于未暂存或已暂存状态；同一个文件也可能同时包含两种修改。

### 1.3 初始化与身份配置

```bash
# 查看版本，不会安装或升级 Git
git --version

# 示例：配置提交作者信息；运行前换成自己的姓名与邮箱
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 查看当前生效的配置及其来源
git config --list --show-origin
```

配置优先级一般是：**当前仓库配置 > 当前用户配置 > 系统配置**。对应 `--local`、`--global`、`--system`；可以为某个仓库单独设置身份。

`user.name` 和 `user.email` 是提交记录中的身份信息，不是 GitHub 登录凭证。远程访问权限由 SSH 密钥、Token 或其他认证机制决定。

安装方法因操作系统而异，书中覆盖了软件包、安装程序和源码编译。已经能运行 `git --version` 时，可以先继续学习，不必重装。遇到选项不清楚时，用 `git help commit` 查看完整手册，或用 `git commit -h` 查看简要说明。[§1.5 安装][s1-5] [§1.7 帮助][s1-7]

## 第 2 章：Git 基础

### 2.1 创建本地仓库与克隆已有仓库

| 命令 | 作用 | 容易混淆的地方 |
|---|---|---|
| `git init` | 为当前目录建立 Git 仓库结构 | 不会自动跟踪现有文件、创建提交或创建 GitHub 仓库。 |
| `git clone <URL>` | 从已有仓库获取本地副本，通常设置名为 `origin` 的远程 | 得到的是本地仓库，不是给自己创建一个 GitHub fork。 |

如果看到 `Reinitialized existing Git repository`，表示这个目录已经是仓库，又执行了一次初始化。普通的再次 `git init` 不会清空文件、提交历史或远程配置，也不需要在每次修改前执行。[§2.1][s2-1] [当前 init 手册][git-init]

### 2.2 最常用的保存流程

假设你修改了 `README.md`：

```bash
git status                 # 先看哪些文件发生变化
git diff                   # 看已跟踪文件尚未暂存的具体改动
git add -- README.md       # 选择这份文件的当前内容
git diff --staged          # 检查下一次提交相对 HEAD 的变化
git diff --staged --check  # 检查待提交差异中的空白错误等
git commit -m "补充项目说明"
```

**暂存的是执行 `add` 那一刻的内容。** 如果先编辑成 B 版、执行 `git add`，之后又改成 C 版，直接提交会记录 B 版；C 版的后续修改仍留在工作区。想一起提交，需再次暂存。[§2.2][s2-2]

| 命令 | 比较或显示的内容 |
|---|---|
| `git status` | 哪些文件已修改、已暂存、未跟踪或有冲突 |
| `git diff` | 工作区与暂存区之间的差异 |
| `git diff --staged` | 暂存区与当前提交 `HEAD` 之间的差异；也可用 `--cached` |
| `git diff HEAD` | 工作区与当前提交之间的差异，合看已暂存和未暂存的修改 |

这些普通 `diff` 用法不会自动展示未跟踪新文件的完整内容；发现新文件要先看 `status`。

短状态 `git status --short` 使用两列：第一列看暂存区，第二列看工作区。`??` 表示未跟踪，`M ` 表示修改已暂存，` M` 表示修改未暂存，`MM` 表示暂存后又有修改。

`git add -A` 会暂存整个工作区中的新增、修改和删除，适合确认全部都要提交时使用。`git commit -am "说明"` 会自动暂存已跟踪文件的修改和删除，但不会自动纳入未跟踪文件。

### 2.3 忽略、删除与改名

`.gitignore` 描述哪些未跟踪文件不应加入版本管理。例如 Python 项目可以忽略：

```gitignore
__pycache__/
.venv/
*.log
.env
```

`*.log` 匹配日志文件，`build/` 匹配目录，`/TODO` 限定当前 `.gitignore` 所在目录，`!pattern` 表示例外。忽略规则对已经跟踪的文件不追溯生效，也不会清除历史中保存过的内容。

| 目标 | 命令 | 结果 |
|---|---|---|
| 删除文件并记录删除 | `git rm -- old.md` | 删除工作区文件，暂存这次删除 |
| 本地保留文件，停止跟踪 | `git rm --cached -- debug.log` | 从暂存区移除；提交后新版本不再跟踪它，可配合 `.gitignore` |
| 改名并暂存变化 | `git mv old.md new.md` | 方便地完成改名与暂存；Git 根据内容等信息识别重命名 |

### 2.4 查看历史

```bash
git log --oneline --graph --decorate --all  # 看分支和合并关系
git log -p -2                              # 最近两次提交及其改动
git log --stat                             # 每次提交修改了哪些文件
git log -- README.md                       # 限定文件的历史
git log --author="姓名" --since="2026-10-01"
git log --grep="缓存"                       # 搜提交说明
git log -S "function_name"                  # 找该字符串出现次数发生变化的提交
```

`log` 的选项可以按作者、时间、提交说明、文件路径等过滤。`--grep` 搜提交信息，`-S` 追踪内容中某个字符串的增减，二者用途不同。进入分页显示后通常按 `q` 退出。[§2.3][s2-3]

### 2.5 撤销之前，先明确要撤销哪一层

下面用已有提交的仓库举例。`restore` 是较新的专用写法；书中相应操作主要使用 `reset HEAD` 或 `checkout --`。[§2.4][s2-4] [当前 restore 手册][git-restore]

| 目的 | 命令 | 工作区内容会怎样？ |
|---|---|---|
| 取消某文件的暂存 | `git restore --staged -- README.md` | 保留当前文件内容，只把索引中的该路径恢复到 `HEAD` |
| 丢弃尚未暂存的修改 | `git restore -- README.md` | 用**暂存区**内容覆盖该工作区文件 |
| 明确恢复工作区文件到当前提交 | `git restore --source=HEAD --worktree -- README.md` | 用 `HEAD` 覆盖工作区文件，不同时更改暂存区 |
| 补进最近一次提交或改其说明 | 先暂存所需修改，再执行 `git commit --amend` | 用新的提交替换分支末端的旧提交 |

关键区别：**取消暂存不会删掉修改；恢复工作区可能丢掉修改。** `git restore 文件` 的默认来源是暂存区，不能一概说成“恢复到上次提交”。

`--amend` 会改写最近一次提交。适合整理尚未共享的提交；已被别人使用的历史通常应通过新提交修正，避免让协作者重新对齐历史。

### 2.6 连接远程与交换提交

```bash
git remote -v                       # 看本地记录的远程地址
git remote add origin <URL>          # 添加远程；已有 origin 时不要重复添加
git fetch origin                    # 获取远程更新
git push -u origin main              # 推送 main，并设置其上游关系
```

`origin` 是一个可更改的名字，用来代替远程地址。远程也可以是本机另一目录。`remote add` 只保存连接信息，既不创建服务器仓库，也不上传内容。[§2.5][s2-5]

- **fetch：** 获取提交、对象和引用信息，通常更新 `origin/main` 等远程跟踪引用，不自动合并到当前分支。
- **pull：** 先抓取，再把选定的远程分支整合到**当前本地分支**。整合方式由选项和配置决定。
- **push：** 发送远程缺少的对象，并请求更新指定的远程引用；没有提交的修改不会被发布。

若只接受快进更新，可明确使用 `git pull --ff-only`；若历史已分叉，它会拒绝整合。`git pull --rebase` 选择变基，`git pull --no-rebase` 选择合并。学习阶段用 `fetch` 后再显式 `merge` 或 `rebase`，更容易看清发生了什么。[当前 pull 手册][git-pull]

`git remote rename old new` 修改本地远程别名；`git remote remove name` 删除本地连接配置及相关远程跟踪引用，不删除服务器上的仓库。

### 2.7 标签和别名

**标签用来标记重要版本，分支用来持续开发。** 标签通常保持在某个提交上，分支会随着新提交移动。轻量标签只是引用；附注标签还记录打标签者、说明等信息，适合正式版本。[§2.6][s2-6]

```bash
git tag -a v1.0.0 -m "首个版本"
git show v1.0.0
git push origin v1.0.0       # 显式发布这个标签
```

普通的分支推送默认不等于发布所有标签。检出标签可能进入 detached HEAD 状态；想基于旧版本继续改，可以用 `git switch -c fix-v1 v1.0.0` 创建分支承接新提交。

别名只是缩短命令，例如 `git config --global alias.st status` 设置后，可以用 `git st` 代替 `git status`。[§2.7][s2-7]

## 第 3 章：Git 分支

### 3.1 分支和 HEAD 到底是什么？

一个提交对象记录项目快照、作者、说明和父提交。分支是指向提交的可移动引用；正常处在某个分支上时，`HEAD` 指向当前分支。[§3.1][s3-1]

```text
A──B──C       main
    ╲
     D──E     feature  ← HEAD
```

在 `feature` 上继续提交，会让 `feature` 向前移动，`main` 不会自动跟着移动。创建分支主要是创建一个引用，不必复制整份项目，因此成本很低。

| 目的 | 常用写法 | 书中常见写法 |
|---|---|---|
| 创建分支但不切换 | `git branch feature` | 相同 |
| 切换到已有分支 | `git switch feature` | `git checkout feature` |
| 创建并切换 | `git switch -c feature` | `git checkout -b feature` |
| 查看分支与上游 | `git branch -vv` | 相同 |
| 查看已合并分支 | `git branch --merged main` | 相同 |
| 删除已整合的本地分支 | `git branch -d feature` | 相同 |

`switch` 是较新的专用命令。切换分支会按目标版本更新工作区和索引。未提交修改并不自动归属于某个分支，可能随切换保留，也可能因会被覆盖而阻止切换；开始另一项工作前，先处理好这些修改。[§3.3][s3-3] [当前 switch 手册][git-switch]

### 3.2 merge：把指定分支合入当前分支

```bash
git switch main
git merge feature
```

方向由**当前分支**决定。上述命令把 `feature` 的历史整合进 `main`；在 `feature` 上执行 `git merge main`，方向就反过来了。[§3.2][s3-2]

| 情况 | Git 如何处理 | 是否新增合并提交？ |
|---|---|---|
| 当前提交是目标提交的祖先 | 默认可以直接把当前分支向前移动，即 fast-forward | 通常不新增；`--no-ff` 可以要求保留合并提交 |
| 两边都产生了新提交 | 利用两端快照和共同祖先进行三方合并 | 合并完成后新增，通常有两个父提交 |
| 已经包含目标分支的历史 | 无须引入新内容 | 不新增 |

发生冲突，表示 Git 无法自动决定如何组合内容，不意味着某一方代码一定错误。需要理解双方意图，编辑最终结果，移除冲突标记，再暂存并完成合并：

```bash
git status
# 编辑冲突文件，检查最终内容，并运行项目需要的验证
git add -- conflicted-file.md
git diff --staged
git commit
```

解决冲突不是简单删除标记，也不是一律保留当前版本。自动合并成功同样不保证程序逻辑正确，整合后仍应验证结果。

### 3.3 本地分支、远程跟踪分支和服务器分支

这是理解远程协作的关键。[§3.5][s3-5]

| 名称 | 在哪里？ | 谁来更新？ |
|---|---|---|
| 本地 `main` | 你的仓库 | 在该分支上提交、合并、变基等操作 |
| `origin/main` | **也在你的本地仓库** | 通常由 fetch 等与远程同步的操作更新，记录最近获知的远程位置 |
| 服务器上的 `main` | 远程仓库 | 服务器接受推送或其他远程操作后更新 |

`origin/main` 不是实时在线视图。`git status` 或 `git branch -vv` 显示的领先、落后数量基于本地掌握的数据；想先更新这些信息，可以执行 `git fetch origin`。

下载远程分支不等于自动创建一个同名本地开发分支。需要开始开发时，可以这样做：

```bash
git fetch origin
git switch --track origin/feature
```

上游关系让 Git 知道这个本地分支通常对应哪个远程分支。常见的 `git push -u origin feature` 会在推送成功时建立该关系；它不表示此后每次保存文件都会自动推送。

删除本地分支和删除远程分支也是两件事：`git branch -d feature` 处理本地引用，`git push origin --delete feature` 请求删除服务器分支。分支删除主要移除名称；如果提交仍被其他分支包含，历史内容仍在。

### 3.4 rebase：把自己的提交接到新的基础上

假设 `main` 和 `feature` 已经分叉，在 `feature` 上执行：

```bash
git switch feature
git rebase main
```

Git 会把需要重放的修改依次应用到新的基础上。原来从 B 分出的 D、E，可能变成接在 C 后面的 D′、E′。这些重建的提交有新的 ID，`main` 本身不会因为这条命令自动移动。[§3.6][s3-6]

| 对比 | merge | rebase |
|---|---|---|
| 整合方式 | 连接已有历史，必要时增加合并提交 | 将选中的修改重放到新基础上 |
| 原提交身份 | 保留原提交 | 重放的提交通常具有新 ID |
| 历史呈现 | 保留开发分叉和整合关系 | 通常更线性 |
| 适用场景 | 整合共享分支、保留协作过程 | 在分享前整理自己的主题分支 |

**不要随意变基别人已经基于其开发的共享历史。** 问题在于提交身份改变，会让协作者的历史与新历史分离。对未共享的个人提交做整理通常更容易控制；团队有明确约定时再按约定操作。

变基也会冲突。解决并暂存后使用 `git rebase --continue` 继续；决定取消本次变基时使用 `git rebase --abort`。它的结束方式与普通合并不同。

原书还介绍 `git rebase --onto newbase oldbase topic`：把 `topic` 中选定的一段提交搬到另一个基础上，适合拆分相互叠加的主题分支。先掌握普通变基，再学习这种历史整理操作。

### 3.5 分支策略是团队约定

长期分支如 `main`、`develop` 可以代表不同稳定程度；主题分支如 `fix-login`、`add-search` 用于一个具体任务，完成后整合并删除。[§3.4][s3-4]

Git 不要求所有项目都采用固定的多分支模型。个人笔记或小项目可以先保持一个稳定主分支，需要较大改动时再创建主题分支；复杂项目再按发布和协作需求增加层次。

## 第 4 章：服务器上的 Git

### 4.1 服务器最基本的职责

服务器提供一个稳定、可访问的地方，让不同开发者交换提交。常用的服务器仓库是**裸仓库 bare repository**：包含对象和引用等仓库数据，不提供用于日常编辑的工作区。[§4.1][s4-1] [§4.2][s4-2]

```bash
# 示例：在目标位置创建一个新的裸仓库，不是在普通工作仓库里执行
git init --bare project.git
```

使用现有项目建立裸副本可以用 `git clone --bare project project.git`。这里的 `.git` 后缀是命名惯例，是否为裸仓库由仓库配置决定。

### 4.2 四种传输方式

| 方式 | 典型地址 | 特点与用途 |
|---|---|---|
| 本地路径 | `/srv/git/project.git` | 依赖文件系统权限；可用于本机或共享文件系统中的仓库 |
| SSH | `git@example.com:/srv/git/project.git` | 提供认证和加密，常用于有权限的读写操作 |
| Smart HTTP 经 HTTPS | `https://example.com/project.git` | 可支持匿名读取和认证写入，通常容易穿过常见网络环境 |
| Git 协议 | `git://example.com/project.git` | 通常用于匿名读取；协议本身不提供身份认证和加密 |

Smart HTTP 能协商和高效传输 Git 数据；旧式 Dumb HTTP 主要把仓库当作静态文件提供读取。Git 命令与网络协议不是同一个概念：同一个 `git clone` 可以使用不同协议。

### 4.3 SSH 认证和提交作者是两套信息

客户端保管私钥，把对应的 `.pub` 公钥提供给服务器或托管平台。服务器可以通过 `authorized_keys` 等机制识别允许访问的密钥。不要把私钥当成要上传的公钥。[§4.3][s4-3]

小团队可以共用服务器上的一个 `git` 系统账号，通过不同公钥接入同一个裸仓库；`git-shell` 可以限制普通交互式 shell 的使用。因为这些连接使用同一个系统账号，单靠该账号的文件权限不能区分成员；按成员限制仓库访问，还需要额外的授权机制。提交记录中的作者仍来自各自的 Git 身份配置，不会因为共用服务器账号就变成同一作者。[§4.4][s4-4]

### 4.4 自建服务各组件做什么？

| 组件或方案 | 作用 |
|---|---|
| SSH + 裸仓库 | 小型团队最基本的远程读写组合 |
| Git daemon | 提供 `git://` 服务，常见端口为 9418 |
| `git-http-backend` | 处理 Smart HTTP 的 Git 数据交换；认证通常由 Web 服务等外层负责 |
| GitWeb | 通过网页浏览仓库、历史和差异 |
| GitLab | 在 Git 仓库之上提供用户、权限、项目、讨论与合并请求等协作功能 |
| 第三方托管平台 | 将服务器维护交给服务提供方，用户负责项目和访问配置 |

相关章节：[Git daemon][s4-5] · [Smart HTTP][s4-6] · [GitWeb][s4-7] · [GitLab][s4-8] · [第三方托管][s4-9]

使用 GitHub 等托管平台时，通常不需要先搭建自己的 Git 服务器。第 4 章最值得记住的是：**仓库数据、网络传输、身份认证、权限控制和网页协作界面，是不同的层次。**

书中的软件安装方式、管理界面、密钥示例和默认凭证带有年代背景。实际部署应查询当前产品文档；本笔记保留架构原理，不把旧版安装步骤当作当前部署指南。

## 第 5 章：分布式 Git

### 5.1 分布式系统可以采用不同协作模式

Git 的每个完整仓库都能独立记录历史，但团队仍可约定一个权威主仓库。技术上的分布式，不排斥管理上的集中决策。[§5.1][s5-1]

| 工作流 | 谁能更新主仓库？ | 典型过程 |
|---|---|---|
| 集中式 | 获得权限的团队成员 | 从共享仓库抓取更新，本地整合后推送 |
| 集成管理者 | 由维护者审核并整合 | 贡献者推到自己的仓库或主题分支，维护者接收修改 |
| 主管与副主管 | 分层的维护者 | 各模块负责人先整合，再由总维护者汇总 |

随着参与人数、权限限制和审核需求增加，流程会更复杂。先看项目的贡献指南和团队约定，再决定分支和提交方式。

### 5.2 为什么修改了不同文件，push 也可能被拒绝？

两个人从同一提交开始工作。甲先推送了 A，乙在本地提交了 B；此时服务器上的 A 不在乙的历史中，即使修改了不同文件，乙的推送也可能是 non-fast-forward。[§5.2][s5-2]

Git 检查的是**提交历史能否安全向前推进**，不是只检查有没有编辑同一文件。通常先获取并整合远程历史，再推送：

```bash
# 假设当前在 main，已有修改已经提交
git fetch origin
git merge origin/main
# 处理可能的冲突，并检查整合结果
git push origin main
```

如果团队采用线性历史，可以对尚未共享的本地提交选择变基。普通推送被拒绝时，先判断是历史分叉、权限还是分支保护问题，不把强制推送当作默认解决方法。

### 5.3 如何提交一份容易审核的贡献？

一个主题分支处理一个相对独立的问题；每次提交形成一个容易理解的逻辑变更。修错别字、增加功能、调整格式等无关工作，尽量分开记录。需要拆分同一文件的改动时，可以用 `git add -p` 按块暂存。[§5.2][s5-2]

提交前检查待提交差异。提交说明先写简短标题，必要时空一行，再解释为什么改、行为如何变化。书中建议标题尽量短，属于协作惯例，不是 Git 强制的格式限制。

下面是适合笔记仓库的自拟例子：

```text
补充 DSec 的实验背景

先说明沙箱在等待期间仍需保留状态的原因，再解释内存回收实验。
保留原文数字和引用，帮助读者理解优化针对的具体成本。
```

### 5.4 没有主仓库写权限，也可以贡献

常见流程是：**fork 主项目 → clone 到本地 → 创建主题分支 → 提交 → push 到自己的 fork → 发起拉取请求 → 维护者审核整合**。

| 术语 | 含义 |
|---|---|
| fork | 托管平台在你的账号下建立一份项目副本 |
| clone | 把一个 Git 仓库复制到本地 |
| branch | 同一仓库内指向提交的一条开发线 |
| Pull Request / Merge Request | 请求维护者审核并整合修改的协作机制 |
| `git pull` | 在本地获取并整合远程分支的命令 |

拉取请求不是执行一次 `git pull`，也不会自动让贡献者获得主仓库的写权限。原书的 `git request-pull` 用于生成请求拉取的文字摘要，不会自动在 GitHub 网页创建 PR。[§5.2][s5-2]

常见命名是 `origin` 指向自己的 fork，`upstream` 指向原项目；这只是约定。名为 `upstream` 的远程仓库，与“某个本地分支的上游跟踪关系”，也不是同一个概念。

### 5.5 维护者先审查差异，再决定如何整合

收到贡献后，可以先放到独立主题分支中检查和测试。[§5.3][s5-3]

```bash
git log main..feature       # feature 有、main 没有的提交
git diff main...feature     # 从共同祖先到 feature 的内容变化
git diff main feature       # main 与 feature 两个末端快照的直接差异
```

`git diff main...feature` 有利于看清这个主题分支自分叉以来做了什么。直接比较两个末端，可能把主分支后来新增的内容也显示为差异。`log` 的提交集合与 `diff` 的快照比较，要分别理解；也不要把三点 diff 当作未来合并结果的精确预览。

| 整合方法 | 用途 | 对历史的影响 |
|---|---|---|
| merge | 接纳一条分支的工作 | 保留已有提交关系，必要时增加合并提交 |
| rebase 后快进 | 按项目约定整理提交，再接入主线 | 重建被重放的提交 |
| `git cherry-pick <提交ID>` | 只取某一次提交的修改，例如向旧版本移植修复 | 通常在当前分支生成一个新提交 |
| `git merge --squash feature`，再提交 | 将主题分支的最终改动整理成一次提交 | 不记录原分支为合并父节点 |

压缩合并保留内容，但不保留原分支已被合并的祖先关系。因此，单纯按提交历史判断的“已合并分支”列表，可能不把它列为已合并。

### 5.6 邮件补丁与重复冲突处理

有些项目通过邮件接收补丁，不依赖托管平台的拉取请求。

| 命令 | 作用 |
|---|---|
| `git format-patch main..HEAD` | 把这段提交导出为带作者和提交说明的邮件补丁文件 |
| `git apply --check change.patch` | 检查普通补丁能否应用，不实际修改 |
| `git apply change.patch` | 默认修改工作区，不自动提交 |
| `git am change.patch` | 应用邮件格式补丁，并根据补丁信息创建提交 |

`apply` 和 `am` 的区别不只是名字：后者处理邮件补丁中的作者、日期和提交说明等信息。新提交的提交者可以是维护者，而作者仍是原贡献者。补丁发送工具的具体认证配置需按当前环境处理。

原书还介绍 **rerere**：记录已解决冲突的方式，在遇到相似冲突时尝试复用。它能减少重复操作，但复用后的结果仍要检查。

### 5.7 发布：固定版本、打包、说明变化

```bash
git tag -a v1.0.0 -m "发布 v1.0.0"
git push origin v1.0.0
git describe --tags
git archive --format=zip --prefix=project/ -o project-v1.0.0.zip v1.0.0
```

标签固定发布版本；`git describe` 为提交生成可读描述；`git archive` 导出指定版本的文件快照，不包含完整 Git 历史。需要按作者整理发布以来的提交说明时，可以使用 `git shortlog v1.0.0..main`。

原书还讨论签名标签，用来验证标签的签署者，以及多层长期分支和维护分支。个人项目先掌握“清晰提交、审查整合、标签发布”，以后按团队规模扩展即可。

## 用在 AI-wiki 笔记仓库中

假设已经克隆了 `AI-wiki`，日常更新这份笔记可以按以下流程操作。执行前先确认分支和工作区状态；下面是示例命令，不表示这些操作会自动发生。

```bash
cd AI-wiki

git status
git branch --show-current
git remote -v

# 确认当前在 main，且工作区和暂存区干净后，同步远程
git pull --ff-only origin main

# 用编辑器修改笔记，保存后再检查
git diff
git add -- "git/ProGit-前五章核心笔记.md"
git diff --staged
git diff --staged --check
git commit -m "完善 Pro Git 前五章核心笔记"
git push origin main
git status
```

以上路径对应本仓库中的这份笔记；更新其他文件时，替换为实际路径。如果 `pull --ff-only` 报告历史分叉，先查看提交图，再决定合并方式。如果修改来自新文件，先通过 `status` 发现它，暂存后再用 `diff --staged` 检查内容。

## 最后记住这十件事

1. `init` 建立仓库结构，`clone` 获取已有仓库；它们不是每天保存文件的步骤。
2. `add` 选择下一次提交的内容，`commit` 生成本地版本，`push` 才向远程发布。
3. 暂存后再次编辑，需要再次暂存，才能把后续修改也放进本次提交。
4. `diff`、`diff --staged`、`diff HEAD` 比较的是不同状态。
5. 分支是可移动引用；正常情况下，`HEAD` 指明当前分支。
6. `merge feature` 把指定分支整合进当前分支，方向不能看反。
7. `origin/main` 在本地，记录最近获知的远程位置，不是实时服务器查询。
8. `fetch` 不自动整合当前分支；`pull` 的整合方式要看选项和配置。
9. 变基和 `commit --amend` 会改写提交身份，处理共享历史前应遵循协作约定。
10. Git 提供版本和整合机制；分支策略、审核流程及发布方式由团队选择。

[返回 Git 学习笔记目录](README.md)

## 来源与核对

本笔记依据前五章共 37 节整理，概念与操作处的链接可跳转到对应原文。`init`、`switch`、`restore`、`pull` 的补充说明同时参考了当前官方命令手册。

已在临时仓库中验证：提交记录暂存版本；`restore` 默认从暂存区恢复工作区；`restore --staged` 保留工作区修改；`fetch` 更新远程跟踪引用而不移动当前分支。验证使用 Git 2.39.5，临时仓库已清理。

原书作者：Scott Chacon、Ben Straub。中文版由社区翻译与维护。原书采用 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) 许可。本文为中文学习笔记，示例和归纳不代表原书逐字表述。

[s1-1]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e5%85%b3%e4%ba%8e%e7%89%88%e6%9c%ac%e6%8e%a7%e5%88%b6
[s1-2]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-Git-%e7%ae%80%e5%8f%b2
[s1-3]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-Git-%e6%98%af%e4%bb%80%e4%b9%88%ef%bc%9f
[s1-4]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e5%91%bd%e4%bb%a4%e8%a1%8c
[s1-5]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e5%ae%89%e8%a3%85-Git
[s1-6]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e5%88%9d%e6%ac%a1%e8%bf%90%e8%a1%8c-Git-%e5%89%8d%e7%9a%84%e9%85%8d%e7%bd%ae
[s1-7]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e8%8e%b7%e5%8f%96%e5%b8%ae%e5%8a%a9
[s1-8]: https://git-scm.com/book/zh/v2/%e8%b5%b7%e6%ad%a5-%e6%80%bb%e7%bb%93
[s2-1]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e8%8e%b7%e5%8f%96-Git-%e4%bb%93%e5%ba%93
[s2-2]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e8%ae%b0%e5%bd%95%e6%af%8f%e6%ac%a1%e6%9b%b4%e6%96%b0%e5%88%b0%e4%bb%93%e5%ba%93
[s2-3]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e6%9f%a5%e7%9c%8b%e6%8f%90%e4%ba%a4%e5%8e%86%e5%8f%b2
[s2-4]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e6%92%a4%e6%b6%88%e6%93%8d%e4%bd%9c
[s2-5]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e8%bf%9c%e7%a8%8b%e4%bb%93%e5%ba%93%e7%9a%84%e4%bd%bf%e7%94%a8
[s2-6]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e6%89%93%e6%a0%87%e7%ad%be
[s2-7]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-Git-%e5%88%ab%e5%90%8d
[s2-8]: https://git-scm.com/book/zh/v2/Git-%e5%9f%ba%e7%a1%80-%e6%80%bb%e7%bb%93
[s3-1]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e5%88%86%e6%94%af%e7%ae%80%e4%bb%8b
[s3-2]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e5%88%86%e6%94%af%e7%9a%84%e6%96%b0%e5%bb%ba%e4%b8%8e%e5%90%88%e5%b9%b6
[s3-3]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e5%88%86%e6%94%af%e7%ae%a1%e7%90%86
[s3-4]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e5%88%86%e6%94%af%e5%bc%80%e5%8f%91%e5%b7%a5%e4%bd%9c%e6%b5%81
[s3-5]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e8%bf%9c%e7%a8%8b%e5%88%86%e6%94%af
[s3-6]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e5%8f%98%e5%9f%ba
[s3-7]: https://git-scm.com/book/zh/v2/Git-%e5%88%86%e6%94%af-%e6%80%bb%e7%bb%93
[s4-1]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e5%8d%8f%e8%ae%ae
[s4-2]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e5%9c%a8%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e6%90%ad%e5%bb%ba-Git
[s4-3]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e7%94%9f%e6%88%90-SSH-%e5%85%ac%e9%92%a5
[s4-4]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e9%85%8d%e7%bd%ae%e6%9c%8d%e5%8a%a1%e5%99%a8
[s4-5]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-Git-%e5%ae%88%e6%8a%a4%e8%bf%9b%e7%a8%8b
[s4-6]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-Smart-HTTP
[s4-7]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-GitWeb
[s4-8]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-GitLab
[s4-9]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e7%ac%ac%e4%b8%89%e6%96%b9%e6%89%98%e7%ae%a1%e7%9a%84%e9%80%89%e6%8b%a9
[s4-10]: https://git-scm.com/book/zh/v2/%e6%9c%8d%e5%8a%a1%e5%99%a8%e4%b8%8a%e7%9a%84-Git-%e6%80%bb%e7%bb%93
[s5-1]: https://git-scm.com/book/zh/v2/%e5%88%86%e5%b8%83%e5%bc%8f-Git-%e5%88%86%e5%b8%83%e5%bc%8f%e5%b7%a5%e4%bd%9c%e6%b5%81%e7%a8%8b
[s5-2]: https://git-scm.com/book/zh/v2/%e5%88%86%e5%b8%83%e5%bc%8f-Git-%e5%90%91%e4%b8%80%e4%b8%aa%e9%a1%b9%e7%9b%ae%e8%b4%a1%e7%8c%ae
[s5-3]: https://git-scm.com/book/zh/v2/%e5%88%86%e5%b8%83%e5%bc%8f-Git-%e7%bb%b4%e6%8a%a4%e9%a1%b9%e7%9b%ae
[s5-4]: https://git-scm.com/book/zh/v2/%e5%88%86%e5%b8%83%e5%bc%8f-Git-%e6%80%bb%e7%bb%93
[git-init]: https://git-scm.com/docs/git-init
[git-switch]: https://git-scm.com/docs/git-switch
[git-restore]: https://git-scm.com/docs/git-restore
[git-pull]: https://git-scm.com/docs/git-pull
