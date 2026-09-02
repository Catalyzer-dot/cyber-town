import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_NPC_RELATIONSHIP_MEMORY,
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
  npcRelationshipMemorySchema,
} from '../src/agents/npc/npc-relationship-memory.ts';

test('npcRelationshipMemorySchema 接受合法的长期关系数据', () => {
  assert.deepEqual(
    npcRelationshipMemorySchema.parse({
      affinity: 30,
      level: 'friendly',
    }),
    {
      affinity: 30,
      level: 'friendly',
    },
  );
});

test('npcRelationshipMemorySchema 接受亲密度上下边界', () => {
  assert.equal(npcRelationshipMemorySchema.parse({ affinity: 0, level: 'stranger' }).affinity, 0);
  assert.equal(
    npcRelationshipMemorySchema.parse({ affinity: 100, level: 'best-friend' }).affinity,
    100,
  );
});

test('默认长期关系满足持久化 Schema', () => {
  assert.deepEqual(
    npcRelationshipMemorySchema.parse(DEFAULT_NPC_RELATIONSHIP_MEMORY),
    DEFAULT_NPC_RELATIONSHIP_MEMORY,
  );
});

test('npcRelationshipMemorySchema 拒绝缺失或非法的长期关系数据', () => {
  assert.throws(() => npcRelationshipMemorySchema.parse({ level: 'stranger' }));
  assert.throws(() => npcRelationshipMemorySchema.parse({ affinity: -1, level: 'stranger' }));
  assert.throws(() => npcRelationshipMemorySchema.parse({ affinity: 101, level: 'best-friend' }));
  assert.throws(() => npcRelationshipMemorySchema.parse({ affinity: 1.5, level: 'stranger' }));
  assert.throws(() => npcRelationshipMemorySchema.parse({ affinity: 30, level: 'unknown' }));
});

test('玩家 ID 决定长期关系的 Store namespace', () => {
  assert.deepEqual(createNpcRelationshipNamespace('player-001'), [
    'players',
    'player-001',
    'npc-relationships',
  ]);
  assert.notDeepEqual(
    createNpcRelationshipNamespace('player-001'),
    createNpcRelationshipNamespace('player-002'),
  );
});

test('NPC ID 决定长期关系在 namespace 中的 key', () => {
  assert.equal(createNpcRelationshipKey('zhang-san'), 'zhang-san');
  assert.notEqual(createNpcRelationshipKey('zhang-san'), createNpcRelationshipKey('li-si'));
});
