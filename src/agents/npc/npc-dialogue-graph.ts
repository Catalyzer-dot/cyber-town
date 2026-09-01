import {
  END,
  ReducedValue,
  START,
  StateGraph,
  StateSchema,
} from '@langchain/langgraph';
import type {
  ConditionalEdgeRouter,
  GraphNode,
} from '@langchain/langgraph';
import * as z from 'zod';

import {
  dialogueRequestSchema,
  type DialogueRequest,
  type DialogueResponse,
} from '../../contracts.ts';
import {
  createMockReply,
  findNpc,
} from '../../domain/npc-service.ts';

const npcProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  personality: z.string(),
  accentColor: z.string(),
});

export const NpcDialogueState = new StateSchema({
  input: dialogueRequestSchema,
  requestId: z.string(),
  npcFound: z.boolean().default(false),
  npc: npcProfileSchema.optional(),
  reply: z.string().default(''),
  emotion: z.enum(['positive', 'neutral', 'negative']).default('neutral'),
  affinity: z.number().default(0),
  affinityDelta: z.number().default(0),
  relationshipLevel: z
    .enum(['stranger', 'familiar', 'friendly', 'intimate', 'best-friend'])
    .default('stranger'),
  graphSteps: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (current, update) => current.concat(update) },
  ),
});

const loadNpc: GraphNode<typeof NpcDialogueState> = (state) => {
  const npc = findNpc(state.input.npcId);

  if (!npc) {
    return {
      npcFound: false,
      graphSteps: ['load-npc:not-found'],
    };
  }

  return {
    npc,
    npcFound: true,
    graphSteps: ['load-npc'],
  };
};

const routeAfterNpcLoad: ConditionalEdgeRouter<
  typeof NpcDialogueState,
  Record<string, unknown>,
  'generateReply'
> = (state) => (state.npcFound ? 'generateReply' : END);

const generateReply: GraphNode<typeof NpcDialogueState> = (state) => {
  if (!state.npc) {
    throw new Error('generateReply 节点缺少 NPC 上下文。');
  }

  return {
    reply: createMockReply(state.input, state.npc),
    graphSteps: ['generate-reply'],
  };
};

const updateRelationship: GraphNode<typeof NpcDialogueState> = () => ({
  emotion: 'neutral',
  affinity: 0,
  affinityDelta: 0,
  relationshipLevel: 'stranger',
  graphSteps: ['update-relationship'],
});

export const npcDialogueGraph = new StateGraph(NpcDialogueState)
  .addNode('loadNpc', loadNpc)
  .addNode('generateReply', generateReply)
  .addNode('updateRelationship', updateRelationship)
  .addEdge(START, 'loadNpc')
  .addConditionalEdges('loadNpc', routeAfterNpcLoad, ['generateReply', END])
  .addEdge('generateReply', 'updateRelationship')
  .addEdge('updateRelationship', END)
  .compile();

export async function runNpcDialogueGraph(
  input: DialogueRequest,
  requestId: string,
): Promise<DialogueResponse | null> {
  const result = await npcDialogueGraph.invoke({ input, requestId });

  if (!result.npcFound || !result.npc) {
    return null;
  }

  return {
    conversationId: input.conversationId,
    npcId: result.npc.id,
    reply: result.reply,
    emotion: result.emotion,
    relationship: {
      affinity: result.affinity,
      delta: result.affinityDelta,
      level: result.relationshipLevel,
    },
    meta: {
      mode: 'langgraph-mock',
      requestId,
      graphSteps: result.graphSteps,
    },
  };
}
