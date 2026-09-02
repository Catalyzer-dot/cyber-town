import type { DialogueRequest } from '../contracts.ts';

export function createDialogueThreadId(
  input: Pick<DialogueRequest, 'playerId' | 'npcId' | 'conversationId'>,
): string {
  return [
    'npc-dialogue',
    encodeURIComponent(input.playerId),
    encodeURIComponent(input.npcId),
    encodeURIComponent(input.conversationId),
  ].join(':');
}
