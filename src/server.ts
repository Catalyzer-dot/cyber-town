import { buildApp } from './app.ts';
import { createDeepSeekModel } from './agents/npc/infrastructure/deepseek-model.ts';
import { createPostgresCheckpointer } from './agents/npc/infrastructure/postgres-checkpointer.ts';
import { parseAppEnv } from './config/app-env.ts';
import { createPostgresStore } from './agents/npc/infrastructure/postgres-store.ts';

const config = parseAppEnv();

const model = createDeepSeekModel({
  apiKey: config.DEEPSEEK_API_KEY,
  model: config.DEEPSEEK_MODEL,
});
const checkpointer = await createPostgresCheckpointer(config.DATABASE_URL);
const store = await createPostgresStore(config.DATABASE_URL);
const app = await buildApp({
  model,
  checkpointer,
  store,
  logLevel: config.LOG_LEVEL,
});

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, '正在关闭服务');
  await app.close();
  process.exit(0);
}

app.addHook('onClose', async () => {
  await Promise.all([checkpointer.end(), store.stop()]);
});

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
