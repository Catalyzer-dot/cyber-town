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
