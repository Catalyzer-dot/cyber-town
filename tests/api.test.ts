import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FakeListChatModel } from '@langchain/core/utils/testing';
import { InMemoryStore, MemorySaver } from '@langchain/langgraph';

import { buildApp } from '../src/app.ts';
import {
  createStructuredNpcReply,
  RecordingStructuredChatModel,
} from './helpers/structured-chat-model.ts';

async function createTestApp(responses: string[] = [createStructuredNpcReply()]) {
  return buildApp({
    model: new FakeListChatModel({ responses }),
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
  });
}

test('健康检查返回 ok', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/health' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
});

test('可以与已存在的 NPC 对话', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
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
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.conversationId, 'conversation-001');
  assert.equal(body.npcId, 'zhang-san');
  assert.match(body.reply, /你好/);
  assert.equal(body.emotion, 'neutral');
  assert.deepEqual(body.relationship, {
    affinity: 0,
    delta: 0,
    level: 'stranger',
  });
  assert.equal(body.meta.mode, 'deepseek');
  assert.equal(typeof body.meta.requestId, 'string');
});

test('正向消息通过 Graph 更新 API 情绪和关系值', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  t.after(() => app.close());
  const firstResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-positive',
      message: '谢谢你',
    },
  });
  const secondResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-positive',
      message: '谢谢你',
    },
  });
  const firstBody = firstResponse.json();
  const secondBody = secondResponse.json();

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
  assert.equal(firstBody.emotion, 'positive');
  assert.deepEqual(firstBody.relationship, {
    affinity: 2,
    delta: 2,
    level: 'stranger',
  });
  assert.deepEqual(secondBody.relationship, {
    affinity: 4,
    delta: 2,
    level: 'stranger',
  });
});

test('不同 conversationId 隔离对话消息但共享玩家与 NPC 的长期关系', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  t.after(() => app.close());
  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-a',
      message: '谢谢你',
    },
  });
  const second = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-b',
      message: '再次谢谢你',
    },
  });
  const firstHistory = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/conversation-a?playerId=player-001&npcId=zhang-san',
  });
  const secondHistory = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/conversation-b?playerId=player-001&npcId=zhang-san',
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(first.json().relationship.affinity, 2);
  assert.equal(second.json().relationship.affinity, 4);
  assert.equal(firstHistory.json().messages.length, 2);
  assert.equal(secondHistory.json().messages.length, 2);
});

test('相同 conversationId 下不同玩家的关系状态相互隔离', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  t.after(() => app.close());

  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-a',
      npcId: 'zhang-san',
      conversationId: 'shared-conversation',
      message: '谢谢你',
    },
  });
  const second = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-b',
      npcId: 'zhang-san',
      conversationId: 'shared-conversation',
      message: '谢谢你',
    },
  });

  assert.equal(first.json().relationship.affinity, 2);
  assert.equal(second.json().relationship.affinity, 2);
});

test('相同 conversationId 下不同 NPC 的关系状态相互隔离', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  t.after(() => app.close());

  const first = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'shared-conversation',
      message: '谢谢你',
    },
  });
  const second = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'li-si',
      conversationId: 'shared-conversation',
      message: '谢谢你',
    },
  });

  assert.equal(first.json().relationship.affinity, 2);
  assert.equal(second.json().relationship.affinity, 2);
});

test('负向消息通过 Graph 更新 API 情绪且亲密度不低于 0', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'negative', modelRelationshipDelta: -2 }),
  ]);
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-negative',
      message: '我讨厌你',
    },
  });
  const body = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(body.emotion, 'negative');
  assert.deepEqual(body.relationship, {
    affinity: 0,
    delta: 0,
    level: 'stranger',
  });
});

test('对不存在的 NPC 返回 404', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'player-001',
      npcId: 'missing-npc',
      conversationId: 'conversation-001',
      message: '你好',
    },
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, 'NPC_NOT_FOUND');
});

test('拒绝空消息', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());
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

test('查询已存在的对话时返回消息、情绪和关系且不再次调用模型', async (t) => {
  const model = new RecordingStructuredChatModel({
    responses: [
      createStructuredNpcReply({
        reply: '不用客气。',
        emotion: 'positive',
        modelRelationshipDelta: 2,
      }),
    ],
  });
  const app = await buildApp({
    model,
    checkpointer: new MemorySaver(),
    store: new InMemoryStore(),
  });
  t.after(() => app.close());

  const dialogue = await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'history-player',
      npcId: 'zhang-san',
      conversationId: 'history-conversation',
      message: '谢谢你',
    },
  });
  const history = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/history-conversation?playerId=history-player&npcId=zhang-san',
  });

  assert.equal(dialogue.statusCode, 200);
  assert.equal(history.statusCode, 200);
  assert.equal(model.calls.length, 1);
  assert.deepEqual(history.json(), {
    conversationId: 'history-conversation',
    npcId: 'zhang-san',
    messages: [
      { role: 'player', content: '谢谢你' },
      { role: 'npc', content: '不用客气。' },
    ],
    emotion: 'positive',
    relationship: {
      affinity: 2,
      delta: 2,
      level: 'stranger',
    },
  });
});

test('查询不存在的对话时返回 404', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/missing-conversation?playerId=player-001&npcId=zhang-san',
  });

  assert.equal(response.statusCode, 404);
  assert.equal(response.json().error.code, 'DIALOGUE_NOT_FOUND');
});

test('查询对话时拒绝缺失的身份参数', async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/conversation-001?playerId=player-001',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, 'INVALID_DIALOGUE_HISTORY_REQUEST');
});

test('查询对话历史时按玩家和 NPC 隔离身份', async (t) => {
  const app = await createTestApp([
    createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 }),
  ]);
  t.after(() => app.close());

  await app.inject({
    method: 'POST',
    url: '/api/v1/dialogues',
    payload: {
      playerId: 'history-owner',
      npcId: 'zhang-san',
      conversationId: 'private-conversation',
      message: '谢谢你',
    },
  });
  const otherPlayer = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/private-conversation?playerId=other-player&npcId=zhang-san',
  });
  const otherNpc = await app.inject({
    method: 'GET',
    url: '/api/v1/dialogues/private-conversation?playerId=history-owner&npcId=li-si',
  });

  assert.equal(otherPlayer.statusCode, 404);
  assert.equal(otherNpc.statusCode, 404);
});
