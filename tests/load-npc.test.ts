import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LOAD_NPC_NODE, loadNpc } from '../src/agents/npc/nodes/load-npc.ts';
import type { NpcDialogueState } from '../src/agents/npc/npc-dialogue-state.ts';

function createState(npcId: string): NpcDialogueState {
  return {
    input: {
      playerId: 'player-001',
      npcId,
      conversationId: 'conversation-001',
      message: '你好',
    },
    requestId: 'request-001',
    npcFound: false,
    npc: null,
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

test('loadNpc 加载已存在的 NPC 且不修改原 State', () => {
  const state = createState('zhang-san');
  const originalState = structuredClone(state);

  const update = loadNpc(state);

  assert.equal(update.npcFound, true);
  assert.equal(update.npc?.id, 'zhang-san');
  assert.equal(update.graphSteps, LOAD_NPC_NODE);
  assert.deepEqual(state, originalState);
});

test('loadNpc 对不存在的 NPC 返回明确的未找到状态', () => {
  const state = createState('missing-npc');
  const originalState = structuredClone(state);

  const update = loadNpc(state);

  assert.equal(update.npcFound, false);
  assert.equal(update.npc, null);
  assert.equal(update.graphSteps, LOAD_NPC_NODE);
  assert.deepEqual(state, originalState);
});
