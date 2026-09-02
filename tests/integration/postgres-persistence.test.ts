import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import type { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

import { createPostgresCheckpointer } from '../../src/agents/npc/infrastructure/postgres-checkpointer.ts';
import { createPostgresStore } from '../../src/agents/npc/infrastructure/postgres-store.ts';
import { createNpcDialogueGraph } from '../../src/agents/npc/npc-dialogue-graph.ts';
import {
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
} from '../../src/agents/npc/npc-relationship-memory.ts';
import {
  createStructuredNpcReply,
  RecordingStructuredChatModel,
} from '../helpers/structured-chat-model.ts';

const createGraphInput = (playerId: string, conversationId: string) => ({
  input: {
    playerId,
    npcId: 'zhang-san',
    conversationId,
    message: '谢谢你',
  },
  requestId: `request-${conversationId}`,
});

const createGraphConfig = (threadId: string) => ({
  configurable: {
    thread_id: threadId,
  },
});

test('PostgreSQL Checkpointer 在重新建立连接后恢复对话状态', async () => {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  const threadId = `postgres-persistence-${process.pid}-${Date.now()}`;
  const playerId = `integration-player-${process.pid}-${Date.now()}`;
  const config = createGraphConfig(threadId);
  let firstCheckpointer: PostgresSaver | undefined;
  let secondCheckpointer: PostgresSaver | undefined;
  let firstStore: PostgresStore | undefined;
  let secondStore: PostgresStore | undefined;

  try {
    firstCheckpointer = await createPostgresCheckpointer(databaseUrl);
    firstStore = await createPostgresStore(databaseUrl);
    const firstGraph = createNpcDialogueGraph(
      new RecordingStructuredChatModel({
        responses: [createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 })],
      }),
      { checkpointer: firstCheckpointer, store: firstStore },
    );

    const firstResult = await firstGraph.invoke(createGraphInput(playerId, threadId), config);

    assert.equal(firstResult.relationship.affinity, 2);
    assert.equal(firstResult.messages.length, 2);

    await firstCheckpointer.end();
    firstCheckpointer = undefined;
    await firstStore.stop();
    firstStore = undefined;

    secondCheckpointer = await createPostgresCheckpointer(databaseUrl);
    secondStore = await createPostgresStore(databaseUrl);
    const secondGraph = createNpcDialogueGraph(
      new RecordingStructuredChatModel({
        responses: [createStructuredNpcReply({ emotion: 'positive', modelRelationshipDelta: 2 })],
      }),
      { checkpointer: secondCheckpointer, store: secondStore },
    );

    const secondResult = await secondGraph.invoke(createGraphInput(playerId, threadId), config);

    assert.equal(secondResult.relationship.affinity, 4);
    assert.equal(secondResult.messages.length, 4);
  } finally {
    if (secondStore) {
      await secondStore.delete(
        createNpcRelationshipNamespace(playerId),
        createNpcRelationshipKey('zhang-san'),
      );
      await secondStore.stop();
    }
    if (firstStore) {
      await firstStore.delete(
        createNpcRelationshipNamespace(playerId),
        createNpcRelationshipKey('zhang-san'),
      );
      await firstStore.stop();
    }
    if (secondCheckpointer) {
      await secondCheckpointer.deleteThread(threadId);
      await secondCheckpointer.end();
    }
    if (firstCheckpointer) {
      await firstCheckpointer.deleteThread(threadId);
      await firstCheckpointer.end();
    }
  }
});
