import { z } from 'zod';

export const dialogueRequestSchema = z.object({
  playerId: z.string().trim().min(1).max(64),
  npcId: z.string().trim().min(1).max(64),
  conversationId: z.string().trim().min(1).max(128),
  message: z.string().trim().min(1).max(2_000),
});

export type DialogueRequest = z.infer<typeof dialogueRequestSchema>;

export type RelationshipLevel =
  | 'stranger'
  | 'familiar'
  | 'friendly'
  | 'intimate'
  | 'best-friend';

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
    mode: 'langgraph-mock';
    requestId: string;
    graphSteps: string[];
  };
}
