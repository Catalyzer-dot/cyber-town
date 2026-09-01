import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerApiRoutes } from './routes/api.ts';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(currentDirectory, '../web');

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  await app.register(fastifyStatic, {
    root: webRoot,
    prefix: '/',
  });
  await registerApiRoutes(app);

  return app;
}
