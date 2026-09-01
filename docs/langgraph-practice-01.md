# LangGraph 实践一：把 NPC 对话改造成状态图

本次实践暂不接入真实 LLM，目标是先掌握 LangGraph 的四个基础概念：

1. `StateSchema`：定义图运行期间共享的数据。
2. `Node`：读取状态并返回部分状态更新。
3. `Edge`：确定节点的执行顺序。
4. `ConditionalEdge`：根据当前状态选择下一条路径。

## 执行流程

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 260" width="100%" role="img" aria-labelledby="title desc">
  <title id="title">NPC 对话 LangGraph 流程</title>
  <desc id="desc">开始后加载 NPC。NPC 不存在则提前结束；存在则生成回复、更新关系并结束。</desc>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#56749a" />
    </marker>
  </defs>
  <style>
    .node { fill: #f2f7ff; stroke: #40668d; stroke-width: 2; }
    .decision { fill: #fdf3ff; stroke: #7e65ae; stroke-width: 2; }
    .terminal { fill: #f6ffdb; stroke: #6e8900; stroke-width: 2; }
    .edge { fill: none; stroke: #56749a; stroke-width: 2; marker-end: url(#arrow); }
    .label { fill: #1d2b3a; font: 600 15px system-ui, sans-serif; text-anchor: middle; dominant-baseline: middle; }
    .edge-label { fill: #526174; font: 13px system-ui, sans-serif; text-anchor: middle; }
  </style>

  <rect class="terminal" x="24" y="91" width="94" height="54" rx="27" />
  <text class="label" x="71" y="118">START</text>

  <rect class="node" x="160" y="78" width="150" height="80" rx="14" />
  <text class="label" x="235" y="108">loadNpc</text>
  <text class="edge-label" x="235" y="132">读取 NPC 配置</text>

  <path class="decision" d="M402 68 L482 118 L402 168 L322 118 Z" />
  <text class="label" x="402" y="108">NPC</text>
  <text class="edge-label" x="402" y="132">是否存在？</text>

  <rect class="node" x="516" y="78" width="154" height="80" rx="14" />
  <text class="label" x="593" y="108">generateReply</text>
  <text class="edge-label" x="593" y="132">生成模拟回复</text>

  <rect class="node" x="716" y="78" width="174" height="80" rx="14" />
  <text class="label" x="803" y="106">updateRelationship</text>
  <text class="edge-label" x="803" y="132">计算关系状态</text>

  <rect class="terminal" x="355" y="202" width="94" height="44" rx="22" />
  <text class="label" x="402" y="224">END</text>

  <path class="edge" d="M118 118 H160" />
  <path class="edge" d="M310 118 H322" />
  <path class="edge" d="M482 118 H516" />
  <path class="edge" d="M670 118 H716" />
  <path class="edge" d="M803 158 V180 H449 V215" />
  <path class="edge" d="M402 168 V202" />

  <text class="edge-label" x="497" y="104">是</text>
  <text class="edge-label" x="420" y="188">否</text>
</svg>

## 状态设计

图状态定义在 `src/agents/npc/npc-dialogue-graph.ts`，主要字段包括：

```text
input                 玩家、NPC、会话和消息
requestId             HTTP 请求标识
npcFound              是否找到 NPC
npc                   当前 NPC 配置
reply                 回复文本
emotion               情绪分类
affinity              当前好感度
affinityDelta         本轮好感度变化
relationshipLevel     关系等级
graphSteps            实际执行过的节点
```

`graphSteps` 使用 `ReducedValue`，每个节点只追加自己的名称。最终 Web 页面会显示：

```text
load-npc → generate-reply → update-relationship
```

## 条件边

`loadNpc` 执行后，条件边检查 `npcFound`：

```text
true  → generateReply
false → END
```

因此不存在的 NPC 不会进入回复生成节点，也不会浪费未来的 LLM 调用。

## 运行验证

```bash
npm run check
npm test
docker compose --profile path-proxy up --build --detach
```

打开 <http://localhost:3080/town/> 发送消息，可以在输入框下方看到实际节点路径。

## 下一步

将 `generateReply` 从确定性模拟函数替换为真实聊天模型，同时保持其他节点和 API 契约不变。真实模型接入后，再依次增加结构化输出、短期记忆和 PostgreSQL Checkpointer。
