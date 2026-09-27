# 第6章：消息系统 —— Agent 的记忆如何组织与传递

## Glossary

| 术语 | 含义 |
|------|------|
| **Message** | LLM 能理解的标准消息格式，只有三种：UserMessage、AssistantMessage、ToolResultMessage |
| **AgentMessage** | Agent 内部使用的消息格式，= Message（3 种标准）+ CustomAgentMessages（自定义扩展） |
| **CustomAgentMessages** | 核心包预留的空接口，应用层通过声明合并注入自己的消息类型 |
| **声明合并（Declaration Merging）** | TypeScript 特性，允许在不同文件里往同一个接口追加字段，核心包不需要知道扩展的存在 |
| **UserMessage** | role 为 "user" 的消息，代表用户输入，content 可以是文本或图片 |
| **AssistantMessage** | role 为 "assistant" 的消息，代表 LLM 回复，content 可包含文本、思考过程、工具调用 |
| **ToolResultMessage** | role 为 "toolResult" 的消息，代表工具执行结果，通过 toolCallId 关联到对应的 ToolCall |
| **BashExecutionMessage** | 自定义消息，记录用户通过 `!` 前缀执行的 bash 命令（command、output、exitCode 等结构化字段） |
| **CompactionSummaryMessage** | 自定义消息，上下文被压缩后生成的摘要 |
| **BranchSummaryMessage** | 自定义消息，Git 分支切换时生成的摘要 |
| **CustomMessage** | 自定义消息，扩展注入的通用消息类型 |
| **convertToLlm** | 翻译函数，把 AgentMessage[] 转成 Message[]，所有自定义消息拍平成 UserMessage |
| **transformContext** | 同层变换函数，在 AgentMessage 层面做裁剪、压缩、注入，输入输出类型不变 |
| **excludeFromContext** | BashExecutionMessage 的布尔字段，为 true 时该消息对 LLM 隐身但 UI 仍可见 |
| **content 块** | AssistantMessage 的 content 数组中的元素，有三种：TextContent（文本）、ThinkingContent（思考）、ToolCall（工具调用） |
| **toolCallId** | ToolResultMessage 中的字段，用于关联回 AssistantMessage 里对应的 ToolCall |
| **stopReason** | AssistantMessage 中的字段，表示 LLM 为什么停止回复（如 "stop" 表示说完了，"toolUse" 表示要调工具） |
| **内富外严** | Pi 消息系统的核心设计原则——内部用丰富格式自由表达，到 LLM 边界翻译回严格标准格式 |

---

## 设计原则与核心问题

### 核心问题：两个消费者的需求冲突

消息系统要同时服务两个读者，它们的需求是对立的：

- **UI 端**需要结构化字段——Bash 执行要分别拿到 command、output、exitCode、cancelled、truncated，才能做专用渲染（命令高亮、输出等宽字体、退出码颜色标识）
- **LLM 端**只需要一段扁平文本——"用户执行了 ls -la，输出是 file1.txt\nfile2.txt\n..."，塞进 UserMessage.content 就够用

如果为了 LLM 提前把字段拍扁，UI 就再也拿不回结构化数据；如果只存结构化格式不进 LLM 上下文，LLM 就会失忆。

### 设计原则：内富外严，边界翻译

Pi 的解法是**两边都不妥协**：内部以结构化形式存储（满足 UI + 持久化），在调用 LLM 的边界上做一次有损翻译（满足 LLM）。翻译是最后一刻发生的、单向的、不可逆的。

### 五个关键架构决策

**1. 声明合并做扩展点**
核心包定义空接口 CustomAgentMessages，应用层通过 TypeScript 声明合并注入自己的消息类型。不用继承（改不了基类）、不用泛型（参数污染），核心包零依赖，应用层全栈类型安全。

**2. 两阶段管道分离职责**
transformContext（同层裁剪/压缩）和 convertToLlm（跨层翻译）分开。换上下文管理策略不用动翻译逻辑，换应用类型不用动裁剪逻辑，换 LLM 供应商两个都不用动。

**3. 自定义消息统一转成 user 角色**
LLM API 要求 user/assistant 严格交替。自定义消息本质是"系统注入的信息"，放 user 角色最安全，不会破坏交替规则。

**4. excludeFromContext 做可见性控制**
一个布尔字段，在翻译边界过滤。消息仍在内部数组中（UI 可见），但 LLM 看不到。实现"对 UI 可见、对 LLM 隐身"。

**5. 消息类型翻译与 Provider 协议翻译解耦**
convertToLlm 只负责"自定义消息 → 标准三种消息"。标准消息再翻译成各家 Provider 的私有格式（anthropic-messages、openai-completions 等）是 pi-ai 层的工作，两层完全独立。

---

## 核心问题

Agent 内部的消息和发给 LLM 的消息需求是冲突的：

- **LLM** 只认三种标准角色（user / assistant / toolResult），内容必须是扁平文本
- **UI** 需要结构化字段（命令、输出、退出码分开存），才能做专用渲染
- **持久化** 需要完整数据，重启后能原样恢复

如果提前按 LLM 格式拍扁存储，UI 和持久化就丢了结构；如果只存自定义格式不进 LLM 上下文，LLM 就会失忆。

## Pi 的解法：两层消息，内富外严

内部存结构化版本（满足 UI + 持久化），调 LLM 时在边界做一次有损翻译（满足 LLM）。两边都不妥协。

---

## 第一层：LLM 标准消息（Message）

定义在 `packages/ai/src/types.ts`，只有三种：

### UserMessage

```typescript
{
    role: "user",
    content: string | (TextContent | ImageContent)[],  // 文本或图片
    timestamp: number
}
```

### AssistantMessage

字段最多，content 是内容块数组，可以同时包含多种类型：

```typescript
{
    role: "assistant",
    content: (TextContent | ThinkingContent | ToolCall)[],
    api: Api,              // API 类型
    provider: ProviderId,  // 提供商
    model: string,         // 模型名
    usage: Usage,          // token 用量
    stopReason: StopReason,// 停止原因
    timestamp: number
}
```

content 里的三种块：
- **TextContent**：普通文本
- **ThinkingContent**：思考过程（模型"在想"但不直接告诉用户的部分）
- **ToolCall**：工具调用（触发工具管道的入口）

一条 AssistantMessage 可以同时包含文本和工具调用（比如一边说"让我看看这个文件"，一边发出 read 工具调用）。

### ToolResultMessage

```typescript
{
    role: "toolResult",
    toolCallId: string,           // 对应哪个 ToolCall
    toolName: string,
    content: (TextContent | ImageContent)[],
    details?: TDetails,           // 结构化详情，给 UI 看
    isError: boolean,             // 是否执行失败
    timestamp: number
}
```

通过 `toolCallId` 和 AssistantMessage 里的 ToolCall 对应起来。

### 对话示例

```
[0] UserMessage       → "帮我看看 auth.ts"
[1] AssistantMessage  → "让我帮你看看" + ToolCall(read, auth.ts)  stopReason: "toolUse"
[2] ToolResultMessage → toolCallId 对应 [1]，content 是文件内容     isError: false
[3] AssistantMessage  → "auth.ts 是一个认证模块..."               stopReason: "stop"
```

---

## 第二层：自定义 Agent 消息（CustomAgentMessages）

### AgentMessage 联合类型

```typescript
// packages/agent/src/types.ts:314
export type AgentMessage = Message | CustomAgentMessages[keyof CustomAgentMessages];
```

AgentMessage = 标准消息 + 自定义消息。内部 `context.messages` 数组里混合存放，通过 `role` 字段区分。

### 扩展点：声明合并

核心包的 `CustomAgentMessages` 接口**默认为空**：

```typescript
export interface CustomAgentMessages {
    // Empty by default
}
```

应用层通过 TypeScript 声明合并注入自己的类型：

```typescript
// coding-agent 里
declare module "@earendil-works/pi-agent-core" {
    interface CustomAgentMessages {
        bashExecution: BashExecutionMessage;
        custom: CustomMessage;
        branchSummary: BranchSummaryMessage;
        compactionSummary: CompactionSummaryMessage;
    }
}
```

效果：编译器自动把这 4 种类型加入 AgentMessage 联合类型，核心包零依赖，应用层全栈类型安全。

### BashExecutionMessage 示例

```typescript
{
    role: "bashExecution",
    command: string,               // "ls -la"
    output: string,                // 输出内容
    exitCode: number | undefined,  // 退出码
    cancelled: boolean,            // 是否被取消
    truncated: boolean,            // 输出是否被截断
    fullOutputPath?: string,       // 截断时的完整输出路径
    timestamp: number,
    excludeFromContext?: boolean   // 是否排除在 LLM 上下文之外
}
```

### 自定义消息带来的三个能力

1. **UI 专用渲染**：根据 role 分派渲染器，命令高亮、输出等宽字体、退出码颜色标识
2. **持久化恢复**：session 文件存完整结构化数据，重启后精确还原渲染状态
3. **精细化可见性控制**：通过 excludeFromContext 让某些消息对 LLM 隐身，UI 照常渲染

---

## 翻译边界：convertToLlm

### 两阶段管道

```
context.messages: AgentMessage[]
        │
        ▼
[1] transformContext（可选）     AgentMessage[] → AgentMessage[]
        │                        裁剪旧消息、注入上下文、触发压缩
        ▼
[2] convertToLlm（必须）        AgentMessage[] → Message[]
        │                        自定义消息翻译成标准格式
        ▼
llmContext.messages: Message[]  → 发给 LLM
```

### 为什么分两步

职责分离：
- **transformContext**：同层操作，处理"如何裁剪上下文"的策略。换压缩算法只改这里
- **convertToLlm**：跨层翻译，处理"自定义消息怎么变成标准消息"。换应用类型只改这里

换 LLM 供应商两个都不用改——Provider 特定的格式化在 pi-ai 层（更下面的抽象），跟 convertToLlm 完全独立。

### 转换规则

convertToLlm 内部是一个 switch 语句，按 `role` 字段分派：

| role | 处理方式 | 转换结果 |
|------|---------|---------|
| `"user"` | 直接透传，不做任何修改 | 原样 UserMessage |
| `"assistant"` | 直接透传 | 原样 AssistantMessage |
| `"toolResult"` | 直接透传 | 原样 ToolResultMessage |
| `"bashExecution"` | 先检查 excludeFromContext | true → 返回 undefined（被过滤掉）；false → 转成 UserMessage |
| `"custom"` | 转成 UserMessage | content 是扩展自定义的文本 |
| `"branchSummary"` | 转成 UserMessage | 摘要文本用 `<summary>` XML 标签包裹 |
| `"compactionSummary"` | 转成 UserMessage | 摘要文本用 `<summary>` XML 标签包裹 |

**所有自定义消息都变成 user 角色**——因为 LLM API 要求 user/assistant 严格交替出现，不能连续两个 assistant。自定义消息本质是"系统注入的信息"（Bash 执行结果、压缩摘要、分支摘要），放在 user 角色中最安全，不会破坏交替规则。

### 每种转换的具体产物

**BashExecutionMessage → UserMessage**

```
转换前：
{
    role: "bashExecution",
    command: "ls -la",
    output: "total 32\ndrwxr-xr-x  5 user  staff  160 May 30 10:00 .\n...",
    exitCode: 0,
    cancelled: false,
    truncated: false
}

转换后：
{
    role: "user",
    content: [{
        type: "text",
        text: "Ran `ls -la`\n```\ntotal 32\ndrwxr-xr-x  5 user  staff  160 May 30 10:00 .\n...\n```"
    }]
}
```

command、output、exitCode 被格式化成一段文本。cancelled、truncated 等布尔标志融合进文本描述里，不再是独立字段。

**CompactionSummaryMessage → UserMessage**

```
转换前：
{
    role: "compactionSummary",
    summary: "之前的对话讨论了项目架构、数据库选型和 API 设计..."
}

转换后：
{
    role: "user",
    content: [{
        type: "text",
        text: "<summary>之前的对话讨论了项目架构、数据库选型和 API 设计...</summary>"
    }]
}
```

用 XML 标签包裹，让 LLM 能识别这是一段压缩摘要而不是用户真的说的话。

**BranchSummaryMessage → UserMessage**

模式跟 CompactionSummary 一样——摘要文本用 `<summary>` 标签包裹，变成 UserMessage。

### 转换的本质

- **有损**：结构化字段（exitCode、cancelled、truncated）被拍平成文本，独立字段信息丢失
- **单向**：翻译后不能反向还原回结构化数据
- **最后一刻发生**：只在调 LLM 的那一刻翻译，内部 context.messages 始终保留完整的结构化版本

---

## 过滤机制：excludeFromContext

用 `!!` 前缀执行的命令（如 `!!secret_cmd`），BashExecutionMessage 的 `excludeFromContext` 设为 true：

```typescript
case "bashExecution":
    if (m.excludeFromContext) return undefined;  // 被 filter 掉
    // ...否则正常转换
```

消息仍然存在于 `context.messages` 中（UI 能看到），只是调 LLM 时被隐身。

### 三种可见性级别

| 级别 | LLM | UI | 实现方式 | 典型场景 |
|------|-----|-----|---------|---------|
| 全可见 | 看到 | 看到 | convertToLlm 正常转换 | 普通 Bash 执行、User、Assistant |
| LLM 不可见 | 看不到 | 看到 | excludeFromContext = true | `!!` 前缀的 Bash 执行 |
| 仅持久化 | 看不到 | 看不到 | UI 渲染跳过 + convertToLlm 过滤 | Web UI 的 ArtifactMessage |

---

## 完整数据流

```
用户输入 !ls -la
    │
    ▼
[1] 创建 BashExecutionMessage（结构化）
    │
    ▼
[2] 存入 context.messages: AgentMessage[]
    │
    ▼
[3] Agent Loop 准备调 LLM
    │
    ▼
[4] transformContext（裁剪/压缩，类型不变）
    │
    ▼
[5] convertToLlm（自定义 → UserMessage，excludeFromContext → 过滤）
    │
    ▼
[6] LLM 收到 Message[]，回复 AssistantMessage
    │
    ▼
[7] 可能触发工具调用 → ToolResultMessage → 回到 [2] 继续循环
```

---

## 设计主线

**两个读者，两层架构。**

| 层 | 服务谁 | 数据形式 | 实现方式 |
|----|--------|---------|---------|
| AgentMessage（内层） | UI + 持久化 | 7 种消息，字段丰富 | 联合类型 + 声明合并 |
| Message（外层） | LLM | 3 种标准消息，字段精简 | convertToLlm 边界翻译 |

内层是源（结构化、不丢信息），外层是流（有损翻译、只在边界发生）。不要为了协议方便提前拍扁数据——一旦拍扁，UI 和持久化就再也拿不回结构。

---

## 关键源码索引

- `packages/ai/src/types.ts:322-408` — Message 联合类型 + 三种消息接口
- `packages/agent/src/types.ts:305-314` — CustomAgentMessages + AgentMessage
- `packages/coding-agent/src/core/messages.ts:70-77` — 声明合并
- `packages/agent/src/agent-loop.ts:275-308` — 转换管道
- `packages/coding-agent/src/core/messages.ts:82-195` — 自定义转换规则
- `packages/coding-agent/src/core/messages.ts:38-39` — excludeFromContext 字段
