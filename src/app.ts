import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerApiRoutes } from './routes/api.ts';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createNpcDialogueGraph } from './agents/npc/npc-dialogue-graph.ts';
import type { BaseCheckpointSaver, BaseStore } from '@langchain/langgraph';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(currentDirectory, '../web');

export type BuildAppOptions = {
  model: BaseChatModel;
  checkpointer: BaseCheckpointSaver;
  store: BaseStore;
  logLevel?: string;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: options.logLevel ?? 'info',
    },
  });

  await app.register(fastifyStatic, {
    root: webRoot,
    prefix: '/',
  });
  const npcDialogueGraph = createNpcDialogueGraph(options.model, {
    checkpointer: options.checkpointer,
    store: options.store,
  });
  await registerApiRoutes(app, npcDialogueGraph);

  return app;
}
