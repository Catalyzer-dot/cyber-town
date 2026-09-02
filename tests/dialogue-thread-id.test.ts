import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDialogueThreadId } from '../src/domain/dialogue-thread-id.ts';

test('createDialogueThreadId 使用稳定命名空间组合线程身份', () => {
  const input = {
    playerId: 'player-001',
    npcId: 'zhang-san',
    conversationId: 'conversation-001',
  };

  assert.equal(createDialogueThreadId(input), 'npc-dialogue:player-001:zhang-san:conversation-001');
  assert.equal(createDialogueThreadId(input), createDialogueThreadId({ ...input }));
});

test('createDialogueThreadId 编码可能与分隔符冲突的特殊字符', () => {
  assert.equal(
    createDialogueThreadId({
      playerId: 'player:一',
      npcId: 'npc/二',
      conversationId: 'conversation?三',
    }),
    'npc-dialogue:player%3A%E4%B8%80:npc%2F%E4%BA%8C:conversation%3F%E4%B8%89',
  );
});

test('createDialogueThreadId 不会因字段内含分隔符而碰撞', () => {
  const first = createDialogueThreadId({
    playerId: 'a_b',
    npcId: 'c',
    conversationId: 'd',
  });
  const second = createDialogueThreadId({
    playerId: 'a',
    npcId: 'b_c',
    conversationId: 'd',
  });

  assert.notEqual(first, second);
});
