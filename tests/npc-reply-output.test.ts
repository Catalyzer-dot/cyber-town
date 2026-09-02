import assert from 'node:assert/strict';
import { test } from 'node:test';

import { npcReplyOutputSchema } from '../src/agents/npc/npc-reply-output.ts';

test('npcReplyOutputSchema 接受并规范化合法的结构化回复', () => {
  const output = npcReplyOutputSchema.parse({
    reply: '  欢迎来到赛博小镇。  ',
    emotion: 'positive',
    modelRelationshipDelta: 2,
  });

  assert.deepEqual(output, {
    reply: '欢迎来到赛博小镇。',
    emotion: 'positive',
    modelRelationshipDelta: 2,
  });
});

test('npcReplyOutputSchema 拒绝空回复和超长回复', () => {
  assert.equal(
    npcReplyOutputSchema.safeParse({
      reply: '   ',
      emotion: 'neutral',
      modelRelationshipDelta: 0,
    }).success,
    false,
  );
  assert.equal(
    npcReplyOutputSchema.safeParse({
      reply: '文'.repeat(301),
      emotion: 'neutral',
      modelRelationshipDelta: 0,
    }).success,
    false,
  );
});

test('npcReplyOutputSchema 拒绝未知情绪', () => {
  const result = npcReplyOutputSchema.safeParse({
    reply: '你好。',
    emotion: 'excited',
    modelRelationshipDelta: 1,
  });

  assert.equal(result.success, false);
});

test('npcReplyOutputSchema 只接受 -2 到 2 之间的整数关系变化', () => {
  for (const modelRelationshipDelta of [-3, 1.5, 3]) {
    const result = npcReplyOutputSchema.safeParse({
      reply: '你好。',
      emotion: 'neutral',
      modelRelationshipDelta,
    });

    assert.equal(result.success, false);
  }
});
