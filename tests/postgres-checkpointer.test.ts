import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

import { createPostgresCheckpointer } from '../src/agents/npc/infrastructure/postgres-checkpointer.ts';

test('createPostgresCheckpointer 拒绝缺失的 DATABASE_URL', async () => {
  await assert.rejects(() => createPostgresCheckpointer(undefined), /DATABASE_URL is required/);
});

test('createPostgresCheckpointer 拒绝只有空白的 DATABASE_URL', async () => {
  await assert.rejects(() => createPostgresCheckpointer('   '), /DATABASE_URL is required/);
});

test('createPostgresCheckpointer 使用规范化后的连接地址初始化并返回 Checkpointer', async (t) => {
  let setupCalls = 0;
  let endCalls = 0;
  const checkpointer = {
    async setup() {
      setupCalls += 1;
    },
    async end() {
      endCalls += 1;
    },
  } as unknown as PostgresSaver;
  const fromConnString = t.mock.method(PostgresSaver, 'fromConnString', (databaseUrl: string) => {
    assert.equal(databaseUrl, 'postgresql://localhost/cyber_town');
    return checkpointer;
  });

  const result = await createPostgresCheckpointer('  postgresql://localhost/cyber_town  ');

  assert.equal(result, checkpointer);
  assert.equal(fromConnString.mock.callCount(), 1);
  assert.equal(setupCalls, 1);
  assert.equal(endCalls, 0);
});

test('createPostgresCheckpointer 在初始化失败时关闭连接并重新抛出错误', async (t) => {
  const setupError = new Error('setup failed');
  let endCalls = 0;
  const checkpointer = {
    async setup() {
      throw setupError;
    },
    async end() {
      endCalls += 1;
    },
  } as unknown as PostgresSaver;
  t.mock.method(PostgresSaver, 'fromConnString', () => checkpointer);

  await assert.rejects(() => createPostgresCheckpointer('postgresql://localhost/cyber_town'), {
    message: setupError.message,
  });
  assert.equal(endCalls, 1);
});
