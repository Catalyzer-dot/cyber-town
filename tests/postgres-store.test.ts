import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store';

import { createPostgresStore } from '../src/agents/npc/infrastructure/postgres-store.ts';

test('createPostgresStore 拒绝缺失的 DATABASE_URL', async () => {
  await assert.rejects(() => createPostgresStore(undefined), /DATABASE_URL is required/);
});

test('createPostgresStore 拒绝只有空白的 DATABASE_URL', async () => {
  await assert.rejects(() => createPostgresStore('   '), /DATABASE_URL is required/);
});

test('createPostgresStore 使用规范化后的连接地址初始化并返回 Store', async (t) => {
  let setupCalls = 0;
  let stopCalls = 0;
  const store = {
    async setup() {
      setupCalls += 1;
    },
    async stop() {
      stopCalls += 1;
    },
  } as unknown as PostgresStore;
  const fromConnString = t.mock.method(PostgresStore, 'fromConnString', (databaseUrl: string) => {
    assert.equal(databaseUrl, 'postgresql://localhost/cyber_town');
    return store;
  });

  const result = await createPostgresStore('  postgresql://localhost/cyber_town  ');

  assert.equal(result, store);
  assert.equal(fromConnString.mock.callCount(), 1);
  assert.equal(setupCalls, 1);
  assert.equal(stopCalls, 0);
});

test('createPostgresStore 在初始化失败时关闭连接并重新抛出错误', async (t) => {
  const setupError = new Error('setup failed');
  let stopCalls = 0;
  const store = {
    async setup() {
      throw setupError;
    },
    async stop() {
      stopCalls += 1;
    },
  } as unknown as PostgresStore;
  t.mock.method(PostgresStore, 'fromConnString', () => store);

  await assert.rejects(() => createPostgresStore('postgresql://localhost/cyber_town'), {
    message: setupError.message,
  });
  assert.equal(stopCalls, 1);
});
