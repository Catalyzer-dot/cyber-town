import assert from 'node:assert/strict';
import { test } from 'node:test';

import { InMemoryStore } from '@langchain/langgraph';
import {
  LOAD_RELATIONSHIP_MEMORY_NODE,
  loadRelationshipMemory,
} from '../src/agents/npc/nodes/load-relationship-memory.ts';
import type { NpcDialogueState } from '../src/agents/npc/npc-dialogue-state.ts';
import {
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
} from '../src/agents/npc/npc-relationship-memory.ts';

function createState(): NpcDialogueState {
  return {
    input: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '你好',
    },
    requestId: 'request-001',
    npcFound: true,
    npc: {
      id: 'zhang-san',
      name: '张三',
      role: 'TypeScript 工程师',
      personality: '严谨、专业，关注代码质量和系统边界。',
      accentColor: '#53b6ff',
    },
    reply: null,
    graphSteps: [],
    emotion: 'neutral',
    modelRelationshipDelta: 0,
    relationship: {
      affinity: 0,
      delta: 0,
      level: 'stranger',
    },
    messages: [],
  };
}

test('loadRelationshipMemory 从 Store 加载玩家与 NPC 的长期关系', async () => {
  const state = createState();
  const originalState = structuredClone(state);
  const store = new InMemoryStore();
  const namespace = createNpcRelationshipNamespace(state.input.playerId);
  const key = createNpcRelationshipKey(state.input.npcId);
  await store.put(namespace, key, {
    affinity: 42,
    level: 'friendly',
  });

  const update = await loadRelationshipMemory(state, { store });

  assert.deepEqual(update.relationship, {
    affinity: 42,
    delta: 0,
    level: 'friendly',
  });
  assert.equal(update.graphSteps, LOAD_RELATIONSHIP_MEMORY_NODE);
  assert.deepEqual(state, originalState);
});

test('loadRelationshipMemory 在没有长期记录时返回默认关系', async () => {
  const update = await loadRelationshipMemory(createState(), {
    store: new InMemoryStore(),
  });

  assert.deepEqual(update.relationship, {
    affinity: 0,
    delta: 0,
    level: 'stranger',
  });
  assert.equal(update.graphSteps, LOAD_RELATIONSHIP_MEMORY_NODE);
});

test('loadRelationshipMemory 在未注入 Store 时明确失败', async () => {
  await assert.rejects(() => loadRelationshipMemory(createState(), {}), /store/i);
});

test('loadRelationshipMemory 拒绝 Store 中损坏的关系记录', async () => {
  const state = createState();
  const store = new InMemoryStore();
  await store.put(
    createNpcRelationshipNamespace(state.input.playerId),
    createNpcRelationshipKey(state.input.npcId),
    {
      level: 'friendly',
    },
  );

  await assert.rejects(() => loadRelationshipMemory(state, { store }));
});
