import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AIMessage, HumanMessage, RemoveMessage } from '@langchain/core/messages';

import { MAX_HISTORY_MESSAGES } from '../src/agents/npc/npc-dialogue-config.ts';
import type { NpcDialogueState } from '../src/agents/npc/npc-dialogue-state.ts';
import { TRIM_MESSAGES_NODE, trimMessages } from '../src/agents/npc/nodes/trim-messages.ts';

function createState(messageCount: number, includeIds = true): NpcDialogueState {
  const messages = Array.from({ length: messageCount }, (_, index) => {
    const fields = {
      content: `消息 ${index}`,
      ...(includeIds ? { id: `message-${index}` } : {}),
    };

    return index % 2 === 0 ? new HumanMessage(fields) : new AIMessage(fields);
  });

  return {
    input: {
      playerId: 'player-001',
      npcId: 'zhang-san',
      conversationId: 'conversation-001',
      message: '你好',
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
    reply: '你好。',
    graphSteps: [],
    emotion: 'neutral',
    modelRelationshipDelta: 0,
    relationship: {
      affinity: 0,
      delta: 0,
      level: 'stranger',
    },
    messages,
  };
}

test('trimMessages 在历史未超限时不产生删除指令', () => {
  const state = createState(MAX_HISTORY_MESSAGES);
  const originalMessages = [...state.messages];

  const update = trimMessages(state);

  assert.equal(update.messages, undefined);
  assert.equal(update.graphSteps, TRIM_MESSAGES_NODE);
  assert.deepEqual(state.messages, originalMessages);
});

test('trimMessages 为超过上限的最旧消息生成 RemoveMessage', () => {
  const state = createState(MAX_HISTORY_MESSAGES + 2);

  const update = trimMessages(state);

  assert.ok(Array.isArray(update.messages));
  assert.equal(update.messages.length, 2);
  assert.ok(update.messages[0] instanceof RemoveMessage);
  assert.ok(update.messages[1] instanceof RemoveMessage);
  assert.equal(update.messages[0].id, 'message-0');
  assert.equal(update.messages[1].id, 'message-1');
  assert.equal(update.graphSteps, TRIM_MESSAGES_NODE);
});

test('trimMessages 拒绝删除没有 ID 的历史消息', () => {
  const state = createState(MAX_HISTORY_MESSAGES + 1, false);

  assert.throws(() => trimMessages(state), /待删除的历史消息缺少 ID/);
});
