import assert from 'node:assert/strict';
import test from 'node:test';

import { runNpcDialogueGraph } from '../src/agents/npc/npc-dialogue-graph.ts';

test('NPC 对话图按顺序执行三个节点', async () => {
  const result = await runNpcDialogueGraph(
    {
      playerId: 'player-001',
      npcId: 'li-si',
      conversationId: 'conversation-001',
      message: '我们下一步做什么？',
    },
    'request-001',
  );

  assert.ok(result);
  assert.equal(result.npcId, 'li-si');
  assert.deepEqual(result.meta.graphSteps, [
    'load-npc',
    'generate-reply',
    'update-relationship',
  ]);
});

test('NPC 不存在时从条件边提前结束', async () => {
  const result = await runNpcDialogueGraph(
    {
      playerId: 'player-001',
      npcId: 'missing-npc',
      conversationId: 'conversation-001',
      message: '有人吗？',
    },
    'request-002',
  );

  assert.equal(result, null);
});
