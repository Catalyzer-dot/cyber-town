import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { NpcDialogueState, NpcDialogueUpdate } from '../npc-dialogue-state.ts';
import {
  createNpcRelationshipKey,
  createNpcRelationshipNamespace,
  npcRelationshipMemorySchema,
} from '../npc-relationship-memory.ts';

const SAVE_RELATIONSHIP_MEMORY_NODE = 'save-relationship-memory' as const;

const saveRelationshipMemory = async (
  state: NpcDialogueState,
  config: LangGraphRunnableConfig,
): Promise<NpcDialogueUpdate> => {
  const memory = npcRelationshipMemorySchema.parse({
    affinity: state.relationship.affinity,
    level: state.relationship.level,
  });

  const store = config.store;
  if (!store) {
    throw new Error('store 不存在');
  }
  const namespace = createNpcRelationshipNamespace(state.input.playerId);
  const key = createNpcRelationshipKey(state.input.npcId);

  await store.put(namespace, key, memory, false);

  return {
    graphSteps: SAVE_RELATIONSHIP_MEMORY_NODE,
  };
};

export { SAVE_RELATIONSHIP_MEMORY_NODE, saveRelationshipMemory };
