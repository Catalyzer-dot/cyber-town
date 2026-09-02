import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseAppEnv, parseDeepSeekEnv } from '../src/config/app-env.ts';

const requiredEnv = {
  DATABASE_URL: 'postgresql://localhost:5432/cyber_town',
  DEEPSEEK_API_KEY: 'test-api-key',
};

test('parseAppEnv 解析并规范化完整的应用环境变量', () => {
  const config = parseAppEnv({
    DATABASE_URL: '  postgresql://localhost:5432/cyber_town  ',
    DEEPSEEK_API_KEY: ' test-api-key ',
    DEEPSEEK_MODEL: ' custom-model ',
    HOST: ' 127.0.0.1 ',
    PORT: '4000',
    LOG_LEVEL: 'debug',
  });

  assert.deepEqual(config, {
    DATABASE_URL: 'postgresql://localhost:5432/cyber_town',
    DEEPSEEK_API_KEY: 'test-api-key',
    DEEPSEEK_MODEL: 'custom-model',
    HOST: '127.0.0.1',
    PORT: 4000,
    LOG_LEVEL: 'debug',
  });
});

test('parseAppEnv 提供服务和模型默认值', () => {
  const config = parseAppEnv(requiredEnv);

  assert.equal(config.HOST, '0.0.0.0');
  assert.equal(config.PORT, 3000);
  assert.equal(config.LOG_LEVEL, 'info');
  assert.equal(config.DEEPSEEK_MODEL, 'deepseek-v4-flash');
});

test('parseAppEnv 拒绝缺失的必要配置', () => {
  assert.throws(() => parseAppEnv({ DEEPSEEK_API_KEY: 'test-api-key' }), /DATABASE_URL/);
  assert.throws(() => parseAppEnv({ DATABASE_URL: requiredEnv.DATABASE_URL }), /DEEPSEEK_API_KEY/);
});

test('parseAppEnv 拒绝空白的 HOST', () => {
  assert.throws(() => parseAppEnv({ ...requiredEnv, HOST: '   ' }), /HOST/);
});

test('parseAppEnv 拒绝无效端口', () => {
  for (const port of ['abc', '3000abc', '0', '-1', '1.5', '65536']) {
    assert.throws(
      () => parseAppEnv({ ...requiredEnv, PORT: port }),
      /PORT/,
      `PORT=${port} 应被拒绝`,
    );
  }
});

test('parseAppEnv 拒绝未知的日志等级', () => {
  assert.throws(() => parseAppEnv({ ...requiredEnv, LOG_LEVEL: 'verbose' }), /LOG_LEVEL/);
});

test('parseDeepSeekEnv 允许冒烟脚本只提供模型配置', () => {
  const config = parseDeepSeekEnv({
    DEEPSEEK_API_KEY: ' test-api-key ',
  });

  assert.deepEqual(config, {
    DEEPSEEK_API_KEY: 'test-api-key',
    DEEPSEEK_MODEL: 'deepseek-v4-flash',
  });
});

test('parseDeepSeekEnv 拒绝缺失或空白的 API Key', () => {
  assert.throws(() => parseDeepSeekEnv({}), /DEEPSEEK_API_KEY/);
  assert.throws(() => parseDeepSeekEnv({ DEEPSEEK_API_KEY: '   ' }), /DEEPSEEK_API_KEY/);
});
