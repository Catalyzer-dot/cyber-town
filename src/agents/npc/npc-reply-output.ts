import { z } from 'zod';

export const npcReplyOutputSchema = z.object({
  reply: z.string().trim().min(1).max(300).describe('NPC 给玩家的简短中文回复'),
  emotion: z.enum(['positive', 'neutral', 'negative']).describe('NPC 对本轮交流表现出的情绪'),
  modelRelationshipDelta: z.int().min(-2).max(2).describe('本轮交流造成的亲密度变化'),
});

export type NpcReplyOutput = z.infer<typeof npcReplyOutputSchema>;
