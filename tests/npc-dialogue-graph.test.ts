import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';
import { GENERATE_REPLY_NODE } from '../src/agents/npc/nodes/generate-reply.ts';
import { LOAD_NPC_NODE } from '../src/agents/npc/nodes/load-npc.ts';
import { LOAD_RELATIONSHIP_MEMORY_NODE } from '../src/agents/npc/nodes/load-relationship-memory.ts';
import { SAVE_RELATIONSHIP_MEMORY_NODE } from '../src/agents/npc/nodes/save-relationship-memory.ts';
import { createNpcDialogueGraph } from '../src/agents/npc/npc-dialogue-graph.ts';
import {
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
} from '../src/agents/npc/npc-relationship-memory.ts';
import { TRIM_MESSAGES_NODE } from '../src/agents/npc/nodes/trim-messages.ts';
import { UPDATE_RELATIONSHIP_NODE } from '../src/agents/npc/nodes/update-relationship.ts';
import {
  createStructuredNpcReply,
  RecordingStructuredChatModel,
} from './helpers/structured-chat-model.ts';

function createTestGraph(responses: string[]) {
  return createNpcDialogueGraph(new RecordingStructuredChatModel({ responses }), {
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
  });
}

function createGraphInput(npcId: string, message = '你好', conversationId = 'conversation-001') {
  return {
    input: {
      playerId: 'player-001',
      npcId,
      conversationId,
      message,
    },
    requestId: 'request-001',
  };
}

function createGraphConfig(threadId: string) {
  return {
    configurable: {
      thread_id: threadId,
    },
  };
}

test('NPC 存在时对话图依次执行完整的长期记忆流程', async () => {
  const npcDialogueGraph = createTestGraph([createStructuredNpcReply()]);
  const result = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '你好', 'graph-neutral'),
    createGraphConfig('graph-neutral'),
  );

  assert.equal(result.npcFound, true);
  assert.equal(result.npc?.id, 'zhang-san');
  assert.match(result.reply ?? '', /你好/);
  assert.deepEqual(result.graphSteps, [
    LOAD_NPC_NODE,
    LOAD_RELATIONSHIP_MEMORY_NODE,
    GENERATE_REPLY_NODE,
    UPDATE_RELATIONSHIP_NODE,
    SAVE_RELATIONSHIP_MEMORY_NODE,
    TRIM_MESSAGES_NODE,
  ]);
  assert.equal(result.emotion, 'neutral');
  assert.deepEqual(result.relationship, {
    affinity: 0,
    delta: 0,
    level: 'stranger',
  });
  assert.equal(result.messages.length, 2);
  assert.ok(result.messages[0] instanceof HumanMessage);
  assert.ok(result.messages[1] instanceof AIMessage);
});

test('createNpcDialogueGraph 将长期记忆 Store 注入编译图', () => {
  const store = new InMemoryStore();
  const graph = createNpcDialogueGraph(
    new RecordingStructuredChatModel({ responses: [createStructuredNpcReply()] }),
    {
      checkpointer: new MemorySaver(),
      store,
    },
  );

  assert.equal(graph.store, store);
});

test('NPC 对话图在正向消息后更新并保存长期关系', async () => {
  const store = new InMemoryStore();
  const npcDialogueGraph = createNpcDialogueGraph(
    new RecordingStructuredChatModel({
      responses: [createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 })],
    }),
    {
      checkpointer: new MemorySaver(),
      store,
    },
  );
  const result = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '谢谢你', 'graph-positive'),
    createGraphConfig('graph-positive'),
  );

  assert.equal(result.emotion, 'positive');
  assert.equal(result.modelRelationshipDelta, 2);
  assert.deepEqual(result.relationship, {
    affinity: 2,
    delta: 2,
    level: 'stranger',
  });
  assert.deepEqual(result.graphSteps, [
    LOAD_NPC_NODE,
    LOAD_RELATIONSHIP_MEMORY_NODE,
    GENERATE_REPLY_NODE,
    UPDATE_RELATIONSHIP_NODE,
    SAVE_RELATIONSHIP_MEMORY_NODE,
    TRIM_MESSAGES_NODE,
  ]);
  assert.deepEqual(
    (
      await store.get(
        createNpcRelationshipNamespace('player-001'),
        createNpcRelationshipKey('zhang-san'),
      )
    )?.value,
    {
      affinity: 2,
      level: 'stranger',
    },
  );
});

test('NPC 对话图在 NPC 不存在时仍能正常到达 END', async () => {
  const npcDialogueGraph = createTestGraph([createStructuredNpcReply()]);
  const result = await npcDialogueGraph.invoke(
    createGraphInput('missing-npc', '你好', 'graph-missing-npc'),
    createGraphConfig('graph-missing-npc'),
  );

  assert.equal(result.npcFound, false);
  assert.equal(result.npc, null);
  assert.equal(result.reply, null);
  assert.deepEqual(result.graphSteps, [LOAD_NPC_NODE]);
  assert.deepEqual(result.messages, []);
  assert.equal(result.emotion, 'neutral');
  assert.deepEqual(result.relationship, {
    affinity: 0,
    delta: 0,
    level: 'stranger',
  });
});

test('Checkpointer 在同一 thread_id 中累积关系值', async () => {
  const npcDialogueGraph = createTestGraph([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  const threadId = 'graph-persistent';
  const config = createGraphConfig(threadId);

  const first = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '谢谢你', threadId),
    config,
  );
  const second = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '谢谢你', threadId),
    config,
  );

  assert.equal(first.relationship.affinity, 2);
  assert.equal(second.relationship.affinity, 4);
  assert.equal(first.messages.length, 2);
  assert.equal(second.messages.length, 4);
  assert.ok(second.messages[0] instanceof HumanMessage);
  assert.ok(second.messages[1] instanceof AIMessage);
  assert.ok(second.messages[2] instanceof HumanMessage);
  assert.ok(second.messages[3] instanceof AIMessage);
});

test('不同 thread_id 隔离消息状态但通过 Store 共享长期关系', async () => {
  const npcDialogueGraph = createTestGraph([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  const first = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '谢谢你', 'graph-isolated-a'),
    createGraphConfig('graph-isolated-a'),
  );
  const second = await npcDialogueGraph.invoke(
    createGraphInput('zhang-san', '谢谢你', 'graph-isolated-b'),
    createGraphConfig('graph-isolated-b'),
  );

  assert.equal(first.relationship.affinity, 2);
  assert.equal(second.relationship.affinity, 4);
  assert.equal(first.messages.length, 2);
  assert.equal(second.messages.length, 2);
});

test('trim-messages 节点使 Checkpointer 只保留最近十条消息', async () => {
  const npcDialogueGraph = createTestGraph(
    Array.from({ length: 7 }, () => createStructuredNpcReply()),
  );
  const threadId = 'graph-trim-history';
  const config = createGraphConfig(threadId);
  let result;

  for (let round = 1; round <= 7; round += 1) {
    result = await npcDialogueGraph.invoke(
      createGraphInput('zhang-san', `第 ${round} 轮`, threadId),
      config,
    );
    assert.ok(result.messages.length <= 10);
  }

  assert.ok(result);
  assert.equal(result.messages.length, 10);
  assert.equal(result.messages[0].content, '第 3 轮');
  assert.ok(result.messages[0] instanceof HumanMessage);
  assert.ok(result.messages[1] instanceof AIMessage);
  assert.equal(result.messages.at(-2)?.content, '第 7 轮');
  assert.ok(result.messages.at(-2) instanceof HumanMessage);
  assert.ok(result.messages.at(-1) instanceof AIMessage);
});

test('generate-reply 节点在结构化解析失败后重试并成功完成图', async () => {
  const model = new RecordingStructuredChatModel({
    responses: ['这不是 JSON', createStructuredNpcReply({ reply: '重试后成功。' })],
  });
  const graph = createNpcDialogueGraph(model, {
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
  });
  const threadId = 'graph-retry-success';

  const result = await graph.invoke(
    createGraphInput('zhang-san', '你好', threadId),
    createGraphConfig(threadId),
  );

  assert.equal(model.calls.length, 2);
  assert.equal(result.reply, '重试后成功。');
  assert.deepEqual(result.graphSteps, [
    LOAD_NPC_NODE,
    LOAD_RELATIONSHIP_MEMORY_NODE,
    GENERATE_REPLY_NODE,
    UPDATE_RELATIONSHIP_NODE,
    SAVE_RELATIONSHIP_MEMORY_NODE,
    TRIM_MESSAGES_NODE,
  ]);
});

test('generate-reply 节点连续三次结构化解析失败后结束重试', async () => {
  const model = new RecordingStructuredChatModel({
    responses: ['始终不是 JSON'],
  });
  const graph = createNpcDialogueGraph(model, {
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
  });
  const threadId = 'graph-retry-exhausted';

  await assert.rejects(
    () =>
      graph.invoke(createGraphInput('zhang-san', '你好', threadId), createGraphConfig(threadId)),
    /JSON/,
  );
  assert.equal(model.calls.length, 3);
});

test('启用 Checkpointer 后调用图必须提供 thread_id', async () => {
  const npcDialogueGraph = createTestGraph([createStructuredNpcReply()]);
  await assert.rejects(
    () =>
      npcDialogueGraph.invoke(createGraphInput('zhang-san'), {
        durability: 'sync',
      }),
    /thread_id/i,
  );
});
