# 第6章：消息系统 —— Agent 的记忆如何组织与传递

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

| role | 处理方式 |
|------|---------|
| user / assistant / toolResult | 直接透传 |
| bashExecution | excludeFromContext=true → 过滤掉；否则 → 转成 UserMessage |
| custom | 转成 UserMessage |
| branchSummary | 转成 UserMessage（XML 标签包裹） |
| compactionSummary | 转成 UserMessage（XML 标签包裹） |

**所有自定义消息都变成 user 角色**——因为 LLM API 要求 user/assistant 严格交替，自定义消息本质是"系统注入的信息"，放 user 角色最安全。

### 转换前后对比

Before（Agent 内部）：
```typescript
{ role: "bashExecution", command: "ls -la", output: "total 32\n...", exitCode: 0, cancelled: false, truncated: false }
```

After（LLM 看到的）：
```typescript
{ role: "user", content: [{ type: "text", text: "Ran `ls -la`\n```\ntotal 32\n...\n```" }] }
```

结构化字段被拍平成文本，cancelled/truncated 等标志融合进描述里。有损、单向、最后一刻发生。

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
