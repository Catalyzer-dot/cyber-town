import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';
import { dialogueRequestSchema } from '../../contracts.ts';

const npcProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  personality: z.string(),
  accentColor: z.string(),
});

export const npcDialogueStateSchema = new StateSchema({
  input: dialogueRequestSchema,
  requestId: z.string().min(1),
  npcFound: z.boolean().default(false),
  npc: npcProfileSchema.nullable().default(null),
  reply: z.string().nullable().default(null),
  graphSteps: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      inputSchema: z.string(),
      reducer: (current, next) => [...current, next],
    },
  ),
  emotion: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  modelRelationshipDelta: z.int().min(-2).max(2).default(0), // 模型对本轮交流给出的变化建议
  relationship: z
    .object({
      affinity: z.int().min(0).max(100).default(0),
      delta: z.int().default(0),
      level: z
        .enum(['stranger', 'familiar', 'friendly', 'intimate', 'best-friend'])
        .default('stranger'),
    })
    .default({
      affinity: 0,
      delta: 0,
      level: 'stranger',
    }),
  messages: MessagesValue,
});

export type NpcDialogueState = typeof npcDialogueStateSchema.State;

export type NpcDialogueUpdate = typeof npcDialogueStateSchema.Update;
