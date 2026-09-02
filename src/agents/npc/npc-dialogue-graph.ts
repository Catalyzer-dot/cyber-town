import {
  END,
  START,
  StateGraph,
  type BaseCheckpointSaver,
  type BaseStore,
} from '@langchain/langgraph';
import { GENERATE_REPLY_RETRY_POLICY } from './npc-dialogue-config.ts';
import { GENERATE_REPLY_NODE, createGenerateReplyNode } from './nodes/generate-reply.ts';
import { LOAD_NPC_NODE, loadNpc } from './nodes/load-npc.ts';
import { npcDialogueStateSchema, type NpcDialogueState } from './npc-dialogue-state.ts';
import { UPDATE_RELATIONSHIP_NODE, updateRelationship } from './nodes/update-relationship.ts';
import { memorySaver } from './infrastructure/memory-saver.ts';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { TRIM_MESSAGES_NODE, trimMessages } from './nodes/trim-messages.ts';
import {
  LOAD_RELATIONSHIP_MEMORY_NODE,
  loadRelationshipMemory,
} from './nodes/load-relationship-memory.ts';
import {
  SAVE_RELATIONSHIP_MEMORY_NODE,
  saveRelationshipMemory,
} from './nodes/save-relationship-memory.ts';

export type CreateNpcDialogueGraphOptions = {
  checkpointer?: BaseCheckpointSaver;
  store: BaseStore;
};

const routeAfterLoadNpc = (
  state: NpcDialogueState,
): typeof LOAD_RELATIONSHIP_MEMORY_NODE | typeof END => {
  return state.npcFound ? LOAD_RELATIONSHIP_MEMORY_NODE : END;
};

export const createNpcDialogueGraph = (
  model: BaseChatModel,
  options: CreateNpcDialogueGraphOptions,
) => {
  const generateReplyNode = createGenerateReplyNode(model);
  const checkpointer = options.checkpointer ?? memorySaver;

  return new StateGraph(npcDialogueStateSchema)
    .addNode(LOAD_NPC_NODE, loadNpc)
    .addNode(GENERATE_REPLY_NODE, generateReplyNode, {
      retryPolicy: GENERATE_REPLY_RETRY_POLICY,
    })
    .addNode(UPDATE_RELATIONSHIP_NODE, updateRelationship)
    .addNode(TRIM_MESSAGES_NODE, trimMessages)
    .addNode(LOAD_RELATIONSHIP_MEMORY_NODE, loadRelationshipMemory)
    .addNode(SAVE_RELATIONSHIP_MEMORY_NODE, saveRelationshipMemory)
    .addEdge(START, LOAD_NPC_NODE)
    .addConditionalEdges(LOAD_NPC_NODE, routeAfterLoadNpc, [LOAD_RELATIONSHIP_MEMORY_NODE, END])
    .addEdge(LOAD_RELATIONSHIP_MEMORY_NODE, GENERATE_REPLY_NODE)
    .addEdge(GENERATE_REPLY_NODE, UPDATE_RELATIONSHIP_NODE)
    .addEdge(UPDATE_RELATIONSHIP_NODE, SAVE_RELATIONSHIP_MEMORY_NODE)
    .addEdge(SAVE_RELATIONSHIP_MEMORY_NODE, TRIM_MESSAGES_NODE)
    .addEdge(TRIM_MESSAGES_NODE, END)
    .compile({
      checkpointer,
      store: options.store,
    });
};

export type NpcDialogueGraph = ReturnType<typeof createNpcDialogueGraph>;
