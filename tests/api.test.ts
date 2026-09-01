import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.ts';

let app: FastifyInstance;

before(async () => {
  app = await buildApp();
});

after(async () => {
  await app.close();
});

test('健康检查返回 ok', async () => {
  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
});

test('可以与已存在的 NPC 对话', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '你好',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().meta.mode, 'langgraph-mock');
  assert.equal(response.json().npcId, 'zhang-san');
  assert.deepEqual(response.json().meta.graphSteps, [
    'load-npc',
    'generate-reply',
    'update-relationship',
  ]);
});

test('拒绝空消息', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'INVALID_DIALOGUE_REQUEST');
});
