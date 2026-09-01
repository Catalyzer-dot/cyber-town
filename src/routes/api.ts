import type { FastifyInstance } from 'fastify';

import { runNpcDialogueGraph } from '../agents/npc/npc-dialogue-graph.ts';
import { dialogueRequestSchema } from '../contracts.ts';
import { listNpcs } from '../domain/npc-service.ts';

export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'cyber-town-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/v1/npcs', async () => ({ items: listNpcs() }));

  app.post('/api/v1/dialogues', async (request, reply) => {
    const parsed = dialogueRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_DIALOGUE_REQUEST',
          message: '对话请求格式不正确。',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await runNpcDialogueGraph(parsed.data, request.id);

    if (!result) {
      return reply.code(404).send({
        error: {
          code: 'NPC_NOT_FOUND',
          message: `找不到 NPC：${parsed.data.npcId}`,
        },
      });
    }

    return result;
  });
}
