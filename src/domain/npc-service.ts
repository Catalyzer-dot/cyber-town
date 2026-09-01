import type { DialogueRequest, DialogueResponse } from '../contracts.ts';

export interface NpcProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  accentColor: string;
}

const npcProfiles: NpcProfile[] = [
  {
    id: 'zhang-san',
    name: '张三',
    role: 'TypeScript 工程师',
    personality: '严谨、专业，关注代码质量和系统边界。',
    accentColor: '#53b6ff',
  },
  {
    id: 'li-si',
    name: '李四',
    role: '产品经理',
    personality: '外向、善于沟通，总会追问用户真正需要什么。',
    accentColor: '#f8bf5c',
  },
  {
    id: 'wang-wu',
    name: '王五',
    role: '交互设计师',
    personality: '温和、有创意，重视视觉层次和使用体验。',
    accentColor: '#c58cff',
  },
];

export function listNpcs(): NpcProfile[] {
  return npcProfiles;
}

export function findNpc(npcId: string): NpcProfile | undefined {
  return npcProfiles.find((npc) => npc.id === npcId);
}

export function createMockDialogue(
  input: DialogueRequest,
  requestId: string,
): DialogueResponse | null {
  const npc = findNpc(input.npcId);

  if (!npc) {
    return null;
  }

  const replies: Record<string, string> = {
    'zhang-san': `我收到了：“${input.message}”。目前是模拟模式；下一步会把这条消息送入 LangGraph，并为状态和工具调用补上测试。`,
    'li-si': `关于“${input.message}”，我们先确认目标和验收标准。现在 Web 到 API 的产品闭环已经连通。`,
    'wang-wu': `我看到你提到“${input.message}”。当前交互还是骨架版，下一步我们会增加流式回复和更清晰的状态反馈。`,
  };

  return {
    conversationId: input.conversationId,
    npcId: npc.id,
    reply: replies[npc.id],
    emotion: 'neutral',
    relationship: {
      affinity: 0,
      delta: 0,
      level: 'stranger',
    },
    meta: {
      mode: 'mock',
      requestId,
    },
  };
}
