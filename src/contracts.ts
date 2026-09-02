import { z } from 'zod';

export const dialogueRequestSchema = z.object({
  playerId: z.string().trim().min(1).max(64),
  npcId: z.string().trim().min(1).max(64),
  conversationId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(2_000),
});

export const dialogueHistoryParamsSchema = dialogueRequestSchema.pick({
  conversationId: true,
});

export const dialogueHistoryQuerySchema = dialogueRequestSchema.pick({
  playerId: true,
  npcId: true,
});

export const relationshipLevelSchema = z.enum([
  'stranger',
  'familiar',
  'friendly',
  'intimate',
  'best-friend',
]);

export type RelationshipLevel = z.infer<typeof relationshipLevelSchema>;

export interface DialogueHistoryResponse {
  conversationId: string;
  npcId: string;
  messages: Array<{
    role: 'player' | 'npc';
    content: string;
  }>;
  emotion: 'positive' | 'neutral' | 'negative';
  relationship: {
    affinity: number;
    delta: number;
    level: RelationshipLevel;
  };
}

export type DialogueRequest = z.infer<typeof dialogueRequestSchema>;

export interface DialogueResponse {
  conversationId: string;
  npcId: string;
  reply: string;
  emotion: 'positive' | 'neutral' | 'negative';
  relationship: {
    affinity: number;
    delta: number;
    level: RelationshipLevel;
  };
  meta: {
    mode: 'deepseek';
    requestId: string;
  };
}
