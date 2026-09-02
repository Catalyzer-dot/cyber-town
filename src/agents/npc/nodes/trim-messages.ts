import { RemoveMessage } from '@langchain/core/messages';

import { MAX_HISTORY_MESSAGES } from '../npc-dialogue-config.ts';
import type { NpcDialogueState, NpcDialogueUpdate } from '../npc-dialogue-state.ts';

export const TRIM_MESSAGES_NODE = 'trim-messages' as const;

export const trimMessages = (state: NpcDialogueState): NpcDialogueUpdate => {
  const deleteCount = state.messages.length - MAX_HISTORY_MESSAGES;
  if (deleteCount <= 0) {
    return {
      graphSteps: TRIM_MESSAGES_NODE,
    };
  }

  const messagesToDelete = state.messages.slice(0, deleteCount);
  const removals = messagesToDelete.map((message) => {
    if (!message.id) {
      throw new Error('待删除的历史消息缺少 ID');
    }
    return new RemoveMessage({ id: message.id });
  });

  return {
    messages: removals,
    graphSteps: TRIM_MESSAGES_NODE,
  };
};
