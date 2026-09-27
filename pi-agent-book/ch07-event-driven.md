# 第7章：事件驱动 —— Agent 的神经系统

## Glossary

| 术语 | 含义 |
|------|------|
| **AgentEvent** | 内核层定义的 10 种事件类型，构成 4 层嵌套生命周期（Agent → Turn → Message → Tool Execution） |
| **管道 A（session.subscribe）** | 外部订阅管道，只能观察不能干预，Agent 不等待 listener 执行完毕 |
| **管道 B（pi.on / 扩展系统）** | 扩展插件管道，能拦截或改写 Agent 行为，Agent 必须等待 handler 返回 |
| **发布-订阅** | Agent 向事件总线广播，消费者各自订阅，新需求只需新增订阅者，不用改 Agent |
| **tool_call** | 管道 B 独占的决策点事件，工具执行前的"安检门"，可返回 block 拦截 |
| **tool_execution_start** | 两条管道都能收到的通知事件，工具已开跑的广播，不可拦截 |
| **fail-closed** | 管道 B 的 tool_call 派发策略——handler 出错即拦截，安全优先 |
| **emit()** | 通知型派发，串行 await 每个 handler，忽略返回值，有 try-catch 隔离 |
| **emitToolCall()** | 决策型派发，读取返回值，遇 block 短路返回，唯一没有 try-catch 的路径 |
| **链式 transform** | 上一个 handler 的输出作为下一个的输入，用于 context、tool_result、input 等事件 |
| **ExtensionContext（ctx）** | 扩展 handler 的第二个参数，提供 UI 交互、运行模式、工作目录、模型注册表等能力 |
| **agent_settled** | 管道 A 的产品级事件，单次 prompt 彻底跑完的可靠结束信号 |

---

## 设计原则与核心问题

### 核心问题：怎么让外部代码观察和干预 Agent 行为，又不耦合

如果要在工具调用时加日志，直接改 Agent 源码 → 每次上游更新都产生合并冲突。Agent 需要知道所有消费者 → 每增一个功能就改一次 Agent。

### 设计原则：发布-订阅，两条管道分管"观察"和"干预"

Agent 向事件总线广播，消费者各自订阅。但"只看不改"和"要改行为"是两种根本不同的需求，所以分成两条管道：

| | 管道 A（subscribe） | 管道 B（扩展 pi.on） |
|---|---|---|
| 注册方式 | 外部脚本调 session.subscribe | 写在扩展插件里，框架加载 |
| 能力 | 只能观察，返回值被丢弃 | 能拦截、改写 Agent 行为 |
| Agent 等不等 | 不等（同步调用，不 await） | 等（带 await，必须拿到结果） |
| 事件范围 | 10 种内核事件 + 产品级事件 | 10 种内核事件 + 5 个独占决策点 |
| 错误处理 | 异步错误不冒泡，必须自己 try-catch | tool_call 路径 fail-closed（出错即拦截） |

**一句话判断标准**：你的代码要不要改变 Agent 的行为？要 → 管道 B，不要 → 管道 A。

---

## 一、为什么需要事件系统

### 不用事件的代价

直接改源码加功能 → 耦合 → 上游更新就冲突。

### 发布-订阅 vs 直接调用

- **直接调用**：Agent 需知晓所有消费者，每增功能必改 Agent
- **发布-订阅**：Agent 向事件总线广播，消费者各自订阅，新需求只需新增订阅者

核心价值：**把"发生了什么"和"谁关心什么"彻底分离。**

---

## 二、事件源：10 种 AgentEvent

4 层嵌套生命周期，每层都有"开始 → 更新 → 结束"模式：

```
第1层：Agent 生命周期
  agent_start / agent_end

第2层：Turn 生命周期（一次 LLM 调用 + 工具执行 = 一个 turn）
  turn_start / turn_end

第3层：Message 生命周期（一条消息的产生过程）
  message_start / message_update / message_end

第4层：Tool Execution 生命周期（一次工具调用）
  tool_execution_start / tool_execution_update / tool_execution_end
```

这 10 种事件是两条管道共享的水源。管道 A 直接接收，管道 B 接收翻译版。

---

## 三、管道 A：session.subscribe

### 用法

```typescript
const unsubscribe = session.subscribe((event, signal) => {
    if (event.type === "message_update") {
        process.stdout.write(event.assistantMessageEvent.delta);
    }
});
unsubscribe();  // 取消订阅
```

### "不等"的后果

- 可以在 listener 内执行异步重活而不拖慢 Agent
- 异步结果无法传回给 Agent
- **隐藏陷阱**：异步错误不会冒泡到 Agent，必须在 listener 内部自行 try-catch

### 管道 A 的事件范围

10 种内核事件 + 产品级事件：

| 产品级事件 | 含义 |
|-----------|------|
| agent_settled | 单次 prompt 彻底跑完（比 message_end 更适合做收尾） |
| compaction_start / compaction_end | 上下文压缩提示 |
| auto_retry_start / auto_retry_end | LLM 重试提示 |
| queue_update | 消息队列变化 |
| session_info_changed | 元信息变更 |
| thinking_level_changed | 思考深度切换 |

收不到管道 B 独占的 5 个决策点事件。

### 适用场景

纯观察、不改行为、不需 Agent 等待：流式渲染、日志记录、SSE 转发、Token 统计、落库审计。

---

## 四、管道 B：扩展系统 pi.on

### 用法

```typescript
function myGuardExtension(pi) {
    pi.on("tool_call", async (event, ctx) => {
        if (event.toolName === "delete_table") {
            return { block: true, reason: "生产环境禁止删除操作" };
        }
        return undefined;  // 放行
    });
}
```

### 三种派发路径

| 路径 | 代表方法 | 行为 | try-catch |
|------|---------|------|-----------|
| 通知型 | emit() | 串行 await 每个 handler，忽略返回值 | 有，隔离错误 |
| 决策型 | emitToolCall() | await 且读取返回值，遇 block 短路返回 | **没有**，fail-closed |
| 链式 transform | emitContext() 等 | 上一个 handler 的输出作为下一个的输入 | 有，保护链式传递 |

### 管道 B 独占的 5 个决策点事件

| 事件 | 触发位置 | 能力 |
|------|---------|------|
| tool_call | agent.beforeToolCall | 拦截危险工具调用 |
| tool_result | agent.afterToolCall | 修改工具返回值 |
| input | sendUserMessage 流程 | 改写用户输入 |
| before_agent_start | agent.run 前 | 替换系统提示词 |
| context | agent.transformContext | 修改发给 LLM 的消息列表 |

### ExtensionContext（ctx）提供的能力

UI 交互（select/confirm）、运行模式、工作目录、模型注册表、当前模型、中断信号等。

**陷阱**：sessionManager 是只读的，写会话需通过 pi.sendMessage() 等方法。

### 适用场景

需改变 Agent 行为：拦截危险工具、改写 LLM 上下文、替换系统提示词、修改工具返回值。

---

## 五、实战场景判断

| 场景 | 走哪条管道 | 原因 |
|------|-----------|------|
| 打印工具启停日志 | A | 纯观察，不干预 |
| SSE 流式转发 Web 前端 | A | 纯转发，不改 Agent |
| 拦截 delete_table 工具调用 | B | 需要返回 block，管道 A 返回值被丢弃且收不到 tool_call |
| 往消息列表注入时间戳 | B | 需要改写 context 让 Agent 采用 |

---

## 六、完整数据流

```
Agent 内部产生事件（如 tool_execution_start）
        │
        ├──→ 管道 A：_emit(event)
        │       同步调用所有 subscribe listener
        │       不等待、不读返回值
        │       listener 自行处理（渲染/日志/转发）
        │
        └──→ 管道 B：_emitExtensionEvent(event)
                翻译成扩展事件格式
                await 每个 handler
                读取返回值（决策型事件）
                handler 可拦截/改写 Agent 行为
```

---

## 关键源码索引

| 文件路径与行号 | 描述 |
|:---|:---|
| `packages/agent/src/types.ts:422-437` | 10 种 AgentEvent 定义 |
| `packages/agent/src/agent.ts:529-576` | processEvents（内核同步屏障） |
| `packages/agent/src/agent.ts:173,243` | listeners Set 和 subscribe |
| `packages/coding-agent/src/core/agent-session.ts:548-552` | _emit（管道 A，同步不等） |
| `packages/coding-agent/src/core/agent-session.ts:595-666` | _handleAgentEvent（两管道分叉点） |
| `packages/coding-agent/src/core/agent-session.ts:712-793` | _emitExtensionEvent（翻译给管道 B） |
| `packages/coding-agent/src/core/agent-session.ts:800-807` | AgentSession.subscribe |
| `packages/coding-agent/src/core/extensions/types.ts:1190-1231` | pi.on 的 30 个重载 |
| `packages/coding-agent/src/core/extensions/loader.ts:238-243` | pi.on 实现（Map push） |
| `packages/coding-agent/src/core/extensions/runner.ts:796-828` | emit()（通知型派发） |
| `packages/coding-agent/src/core/extensions/runner.ts:927-948` | emitToolCall()（决策型，无 try-catch） |
| `packages/coding-agent/src/core/extensions/runner.ts:979-1010` | emitContext()（链式 transform） |
| `packages/coding-agent/src/core/agent-session.ts:468-517` | tool_call / tool_result 触发 |
