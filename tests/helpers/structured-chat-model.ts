import type { BaseMessage } from '@langchain/core/messages';
import { FakeListChatModel } from '@langchain/core/utils/testing';

import type { NpcReplyOutput } from '../../src/agents/npc/npc-reply-output.ts';

export class RecordingStructuredChatModel extends FakeListChatModel {
  readonly calls: BaseMessage[][] = [];

  override _generate(...args: Parameters<FakeListChatModel['_generate']>) {
    this.calls.push([...args[0]]);
    return super._generate(...args);
  }
}

export function createStructuredNpcReply(overrides: Partial<NpcReplyOutput> = {}): string {
  return JSON.stringify({
    reply: '你好，欢迎来到赛博小镇。',
    emotion: 'neutral',
    modelRelationshipDelta: 0,
    ...overrides,
  } satisfies NpcReplyOutput);
}
