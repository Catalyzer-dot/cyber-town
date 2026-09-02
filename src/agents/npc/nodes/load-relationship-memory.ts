import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { NpcDialogueState, NpcDialogueUpdate } from '../npc-dialogue-state.ts';
import {
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
  DEFAULT_NPC_RELATIONSHIP_MEMORY,
  npcRelationshipMemorySchema,
} from '../npc-relationship-memory.ts';

export const LOAD_RELATIONSHIP_MEMORY_NODE = 'load-relationship-memory' as const;

export const loadRelationshipMemory = async (
  state: NpcDialogueState,
  config: LangGraphRunnableConfig,
): Promise<NpcDialogueUpdate> => {
  const store = config.store;
  if (!store) {
    throw new Error('store不存在');
  }
  const namespace = createNpcRelationshipNamespace(state.input.playerId);
  const key = createNpcRelationshipKey(state.input.npcId);
  const item = await store.get(namespace, key);

  const memory = item
    ? npcRelationshipMemorySchema.parse(item.value)
    : DEFAULT_NPC_RELATIONSHIP_MEMORY;

  return {
    relationship: {
      ...memory,
      delta: 0,
    },
    graphSteps: LOAD_RELATIONSHIP_MEMORY_NODE,
  };
};
