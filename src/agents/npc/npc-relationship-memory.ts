import { z } from 'zod';
import { relationshipLevelSchema } from '../../contracts.ts';

export const npcRelationshipMemorySchema = z.object({
  affinity: z.int().min(0).max(100),
  level: relationshipLevelSchema,
});

export const DEFAULT_NPC_RELATIONSHIP_MEMORY = {
  affinity: 0,
  level: 'stranger',
} satisfies NpcRelationshipMemory;

export type NpcRelationshipMemory = z.infer<typeof npcRelationshipMemorySchema>;

export const createNpcRelationshipNamespace = (playerId: string): string[] => {
  return ['players', playerId, 'npc-relationships'];
};

export const createNpcRelationshipKey = (npcId: string): string => {
  return npcId;
};
