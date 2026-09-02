import assert from 'node:assert/strict';
import { test } from 'node:test';

import { InMemoryStore } from '@langchain/langgraph';
import {
  SAVE_RELATIONSHIP_MEMORY_NODE,
  saveRelationshipMemory,
} from '../src/agents/npc/nodes/save-relationship-memory.ts';
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
      message: '谢谢你',
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
    reply: '不客气。',
    graphSteps: [],
    emotion: 'positive',
    modelRelationshipDelta: 2,
    relationship: {
      affinity: 42,
      delta: 2,
      level: 'friendly',
    },
    messages: [],
  };
}

test('saveRelationshipMemory 将当前长期关系写入正确的 Store 位置', async () => {
  const state = createState();
  const originalState = structuredClone(state);
  const store = new InMemoryStore();

  const update = await saveRelationshipMemory(state, { store });

  const item = await store.get(
    createNpcRelationshipNamespace(state.input.playerId),
    createNpcRelationshipKey(state.input.npcId),
  );
  assert.deepEqual(item?.value, {
    affinity: 42,
    level: 'friendly',
  });
  assert.equal('delta' in (item?.value ?? {}), false);
  assert.equal(update.graphSteps, SAVE_RELATIONSHIP_MEMORY_NODE);
  assert.deepEqual(state, originalState);
});

test('saveRelationshipMemory 更新同一玩家与 NPC 的已有关系', async () => {
  const state = createState();
  const store = new InMemoryStore();
  const namespace = createNpcRelationshipNamespace(state.input.playerId);
  const key = createNpcRelationshipKey(state.input.npcId);
  await store.put(namespace, key, {
    affinity: 10,
    level: 'familiar',
  });

  await saveRelationshipMemory(state, { store });

  assert.deepEqual((await store.get(namespace, key))?.value, {
    affinity: 42,
    level: 'friendly',
  });
});

test('saveRelationshipMemory 在未注入 Store 时明确失败', async () => {
  await assert.rejects(() => saveRelationshipMemory(createState(), {}), /store/i);
});
