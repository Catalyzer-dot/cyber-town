import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDeepSeekModel } from '../src/agents/npc/infrastructure/deepseek-model.ts';

test('createDeepSeekModel 使用显式参数创建 DeepSeek 模型', () => {
  const model = createDeepSeekModel({
    apiKey: 'test-api-key',
    model: 'deepseek-v4-flash',
  });

  assert.equal(model.model, 'deepseek-v4-flash');
  assert.equal(model.temperature, 0.7);
  assert.equal(model.maxTokens, 200);
  assert.deepEqual(model.modelKwargs, {
    thinking: {
      type: 'disabled',
    },
  });
  assert.equal(model._llmType(), 'deepseek');
});

test('createDeepSeekModel 接受显式指定的模型名称', () => {
  const model = createDeepSeekModel({
    apiKey: 'test-api-key',
    model: 'custom-deepseek-model',
  });

  assert.equal(model.model, 'custom-deepseek-model');
});
