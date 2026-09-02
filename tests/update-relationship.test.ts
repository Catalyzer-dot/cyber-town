import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GENERATE_REPLY_NODE } from '../src/agents/npc/nodes/generate-reply.ts';
import { LOAD_NPC_NODE } from '../src/agents/npc/nodes/load-npc.ts';
import type { NpcDialogueState } from '../src/agents/npc/npc-dialogue-state.ts';
import {
  UPDATE_RELATIONSHIP_NODE,
  getLevel,
  updateRelationship,
} from '../src/agents/npc/nodes/update-relationship.ts';

function createState(
  modelRelationshipDelta: number,
  affinity: number,
  options: {
    withNpc?: boolean;
    withReply?: boolean;
    emotion?: NpcDialogueState['emotion'];
  } = {},
): NpcDialogueState {
  const { withNpc = true, withReply = true, emotion = 'neutral' } = options;

  return {
    input: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '任意消息',
    },
    requestId: 'request-001',
    npcFound: withNpc,
    npc: withNpc
      ? {
          id: 'zhang-san',
          name: '张三',
          role: 'TypeScript 工程师',
          personality: '严谨、专业，关注代码质量和系统边界。',
          accentColor: '#53b6ff',
        }
      : null,
    reply: withReply ? '这是 NPC 的模拟回复。' : null,
    graphSteps: [LOAD_NPC_NODE, GENERATE_REPLY_NODE],
    emotion,
    modelRelationshipDelta,
    relationship: {
      affinity,
      delta: 0,
      level: getLevel(affinity),
    },
    messages: [],
  };
}

test('getLevel 在所有等级边界上返回正确结果', () => {
  const cases = [
    [9, 'stranger'],
    [10, 'familiar'],
    [29, 'familiar'],
    [30, 'friendly'],
    [59, 'friendly'],
    [60, 'intimate'],
    [79, 'intimate'],
    [80, 'best-friend'],
    [100, 'best-friend'],
  ] as const;

  for (const [affinity, expected] of cases) {
    assert.equal(getLevel(affinity), expected);
  }
});

test('updateRelationship 应用模型给出的正向关系变化且不覆盖情绪', () => {
  const state = createState(2, 9, { emotion: 'positive' });
  const originalState = structuredClone(state);

  const update = updateRelationship(state);

  assert.equal(update.emotion, undefined);
  assert.deepEqual(update.relationship, {
    affinity: 11,
    delta: 2,
    level: 'familiar',
  });
  assert.equal(update.graphSteps, UPDATE_RELATIONSHIP_NODE);
  assert.deepEqual(state, originalState);
});

test('updateRelationship 在下界处记录实际应用的关系变化', () => {
  const state = createState(-2, 1, { emotion: 'negative' });

  const update = updateRelationship(state);

  assert.equal(update.emotion, undefined);
  assert.deepEqual(update.relationship, {
    affinity: 0,
    delta: -1,
    level: 'stranger',
  });
});

test('updateRelationship 将亲密度上限限制为 100', () => {
  const state = createState(2, 99);

  const update = updateRelationship(state);

  assert.deepEqual(update.relationship, {
    affinity: 100,
    delta: 1,
    level: 'best-friend',
  });
});

test('updateRelationship 对模型给出的零变化保留完整关系状态', () => {
  const state = createState(0, 30);

  const update = updateRelationship(state);

  assert.equal(update.emotion, undefined);
  assert.deepEqual(update.relationship, {
    affinity: 30,
    delta: 0,
    level: 'friendly',
  });
});

test('updateRelationship 在 NPC 或回复缺失时不改变亲密度', () => {
  const state = createState(2, 30, { withNpc: false, emotion: 'positive' });

  const update = updateRelationship(state);

  assert.equal(update.emotion, undefined);
  assert.deepEqual(update.relationship, {
    affinity: 30,
    delta: 0,
    level: 'friendly',
  });
  assert.equal(update.graphSteps, UPDATE_RELATIONSHIP_NODE);
});
