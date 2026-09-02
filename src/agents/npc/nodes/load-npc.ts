import { findNpc } from '../../../domain/npc-service.ts';
import type { NpcDialogueState, NpcDialogueUpdate } from '../npc-dialogue-state.ts';

export const LOAD_NPC_NODE = 'load-npc' as const;

export const loadNpc = (state: NpcDialogueState): NpcDialogueUpdate => {
  const npc = findNpc(state.input.npcId);

  return {
    npcFound: !!npc,
    npc: npc ?? null,
    graphSteps: LOAD_NPC_NODE,
  };
};
