import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { MAX_HISTORY_MESSAGES } from '../src/agents/npc/npc-dialogue-config.ts';
import {
  buildNpcSystemPrompt,
  createGenerateReplyNode,
  GENERATE_REPLY_NODE,
  selectRecentMessages,
} from '../src/agents/npc/nodes/generate-reply.ts';
import { LOAD_NPC_NODE } from '../src/agents/npc/nodes/load-npc.ts';
import type { NpcDialogueState } from '../src/agents/npc/npc-dialogue-state.ts';
import {
  createStructuredNpcReply,
  RecordingStructuredChatModel,
} from './helpers/structured-chat-model.ts';

function createState(withNpc: boolean): NpcDialogueState {
  return {
    input: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '你好',
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
    reply: null,
    graphSteps: [LOAD_NPC_NODE],
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

test('buildNpcSystemPrompt 包含 NPC 人设和当前关系信息', () => {
  const prompt = buildNpcSystemPrompt(createState(true));

  assert.match(prompt, /张三/);
  assert.match(prompt, /TypeScript 工程师/);
  assert.match(prompt, /严谨、专业/);
  assert.match(prompt, /stranger/);
  assert.match(prompt, /亲密度：0/);
});

test('selectRecentMessages 在消息未超过上限时保留全部历史', () => {
  const messages = [new HumanMessage('第一条'), new AIMessage('第二条')];
  const originalMessages = [...messages];

  const selected = selectRecentMessages(messages);

  assert.deepEqual(selected, messages);
  assert.deepEqual(messages, originalMessages);
});

test('selectRecentMessages 只保留最后 MAX_HISTORY_MESSAGES 条且不修改原数组', () => {
  const messages = Array.from(
    { length: MAX_HISTORY_MESSAGES + 2 },
    (_, index) => new HumanMessage(`历史消息 ${index}`),
  );
  const originalMessages = [...messages];

  const selected = selectRecentMessages(messages);

  assert.equal(selected.length, MAX_HISTORY_MESSAGES);
  assert.equal(selected[0].content, '历史消息 2');
  assert.equal(selected.at(-1)?.content, `历史消息 ${MAX_HISTORY_MESSAGES + 1}`);
  assert.deepEqual(messages, originalMessages);
});

test('createGenerateReplyNode 使用 SystemMessage 和 HumanMessage 调用模型', async () => {
  const model = new RecordingStructuredChatModel({
    responses: [
      createStructuredNpcReply({
        reply: '  欢迎来到赛博小镇。  ',
        emotion: 'positive',
        modelRelationshipDelta: 2,
      }),
    ],
  });
  const node = createGenerateReplyNode(model);
  const state = createState(true);
  const originalState = structuredClone(state);

  const update = await node(state);

  assert.equal(update.reply, '欢迎来到赛博小镇。');
  assert.equal(update.graphSteps, GENERATE_REPLY_NODE);
  assert.ok(Array.isArray(update.messages));
  assert.equal(update.messages.length, 2);
  assert.ok(update.messages[0] instanceof HumanMessage);
  assert.ok(update.messages[1] instanceof AIMessage);
  assert.equal(update.emotion, 'positive');
  assert.equal(update.modelRelationshipDelta, 2);
  assert.equal(model.calls.length, 1);
  assert.ok(model.calls[0][0] instanceof SystemMessage);
  assert.ok(model.calls[0][1] instanceof HumanMessage);
  assert.equal(model.calls[0][1].content, state.input.message);
  assert.deepEqual(state, originalState);
});

test('createGenerateReplyNode 将历史消息放在本轮玩家消息之前', async () => {
  const previousPlayerMessage = new HumanMessage('你还记得我吗？');
  const previousNpcMessage = new AIMessage('当然记得。');
  const model = new RecordingStructuredChatModel({
    responses: [createStructuredNpcReply({ reply: '我们刚刚聊过。' })],
  });
  const node = createGenerateReplyNode(model);
  const state = createState(true);
  state.messages = [previousPlayerMessage, previousNpcMessage];

  await node(state);

  const invokedMessages = model.calls[0];
  assert.equal(invokedMessages.length, 4);
  assert.ok(invokedMessages[0] instanceof SystemMessage);
  assert.equal(invokedMessages[1], previousPlayerMessage);
  assert.equal(invokedMessages[2], previousNpcMessage);
  assert.ok(invokedMessages[3] instanceof HumanMessage);
  assert.equal(invokedMessages[3].content, state.input.message);
});

test('createGenerateReplyNode 只向模型发送最近的历史消息', async () => {
  const model = new RecordingStructuredChatModel({
    responses: [createStructuredNpcReply({ reply: '已收到。' })],
  });
  const node = createGenerateReplyNode(model);
  const state = createState(true);
  state.messages = Array.from(
    { length: MAX_HISTORY_MESSAGES + 2 },
    (_, index) => new HumanMessage(`历史消息 ${index}`),
  );

  await node(state);

  const invokedMessages = model.calls[0];
  assert.equal(invokedMessages.length, MAX_HISTORY_MESSAGES + 2);
  assert.ok(invokedMessages[0] instanceof SystemMessage);
  assert.equal(invokedMessages[1].content, '历史消息 2');
  assert.equal(invokedMessages.at(-1)?.content, state.input.message);
});

test('createGenerateReplyNode 在 NPC 不存在时不调用模型', async () => {
  const model = new RecordingStructuredChatModel({
    responses: [createStructuredNpcReply()],
  });
  const node = createGenerateReplyNode(model);

  const update = await node(createState(false));

  assert.equal(update.reply, null);
  assert.equal(update.graphSteps, GENERATE_REPLY_NODE);
  assert.equal(model.calls.length, 0);
});
