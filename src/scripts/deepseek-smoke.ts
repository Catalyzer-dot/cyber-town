import { createDeepSeekModel } from '../agents/npc/infrastructure/deepseek-model.ts';
import { parseDeepSeekEnv } from '../config/app-env.ts';

const config = parseDeepSeekEnv();
const model = createDeepSeekModel({
  apiKey: config.DEEPSEEK_API_KEY,
  model: config.DEEPSEEK_MODEL,
});

const response = await model.invoke([
  {
    role: 'user',
    content: '只回复四个字：连接成功',
  },
]);

console.log(response.content);
