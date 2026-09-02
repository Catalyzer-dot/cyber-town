import type { FastifyInstance } from 'fastify';

import {
  dialogueHistoryParamsSchema,
  dialogueHistoryQuerySchema,
  dialogueRequestSchema,
} from '../contracts.ts';
import type { DialogueHistoryResponse, DialogueResponse } from '../contracts.ts';
import { listNpcs } from '../domain/npc-service.ts';
import type { NpcDialogueGraph } from '../agents/npc/npc-dialogue-graph.ts';
import { createDialogueThreadId } from '../domain/dialogue-thread-id.ts';
import { type NpcDialogueState } from '../agents/npc/npc-dialogue-state.ts';

export async function registerApiRoutes(
  app: FastifyInstance,
  npcDialogueGraph: NpcDialogueGraph,
): Promise<void> {
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

    const state = await npcDialogueGraph.invoke(
      {
        input: parsed.data,
        requestId: request.id,
      },
      {
        configurable: {
          thread_id: createDialogueThreadId(parsed.data),
        },
      },
    );

    if (!state.npcFound) {
      return reply.code(404).send({
        error: {
          code: 'NPC_NOT_FOUND',
          message: `找不到 NPC：${parsed.data.npcId}`,
        },
      });
    } else if (!state.npc || state.reply === null) {
      return reply.code(500).send({
        error: {
          code: 'INVALID_GRAPH_RESULT',
          message: 'Graph 产生了无效结果',
        },
      });
    }

    const output: DialogueResponse = {
      conversationId: state.input.conversationId,
      npcId: state.npc.id,
      reply: state.reply,
      emotion: state.emotion,
      relationship: state.relationship,
      meta: {
        mode: 'deepseek',
        requestId: state.requestId,
      },
    };

    return output;
  });

  app.get('/api/v1/dialogues/:conversationId', async (request, reply) => {
    const params = dialogueHistoryParamsSchema.safeParse(request.params);
    const query = dialogueHistoryQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_DIALOGUE_HISTORY_REQUEST',
          message: '对话历史查询参数不正确。',
          details: {
            params: params.success ? undefined : params.error.flatten(),
            query: query.success ? undefined : query.error.flatten(),
          },
        },
      });
    }

    const threadId = createDialogueThreadId({
      playerId: query.data.playerId,
      npcId: query.data.npcId,
      conversationId: params.data.conversationId,
    });

    const snapshot = await npcDialogueGraph.getState({
      configurable: {
        thread_id: threadId,
      },
    });

    if (Object.keys(snapshot.values).length === 0) {
      // 返回 404，错误码 DIALOGUE_NOT_FOUND
      return reply.code(404).send({
        error: {
          code: 'DIALOGUE_NOT_FOUND',
          message: 'DIALOGUE_NOT_FOUND',
        },
      });
    }

    const state = snapshot.values as NpcDialogueState;

    const messages = state.messages.flatMap((message): DialogueHistoryResponse['messages'] => {
      if (message.type === 'human') {
        return [
          {
            role: 'player',
            content: message.text,
          },
        ];
      } else if (message.type === 'ai') {
        return [
          {
            role: 'npc',
            content: message.text,
          },
        ];
      }

      return [];
    });

    const output: DialogueHistoryResponse = {
      conversationId: params.data.conversationId,
      npcId: query.data.npcId,
      messages,
      emotion: state.emotion,
      relationship: state.relationship,
    };

    return reply.code(200).send(output);
  });
}
