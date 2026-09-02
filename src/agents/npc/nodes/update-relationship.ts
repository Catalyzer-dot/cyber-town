import type { RelationshipLevel } from '../../../contracts.ts';
import type { NpcDialogueState, NpcDialogueUpdate } from '../npc-dialogue-state.ts';

const UPDATE_RELATIONSHIP_NODE = 'update-relationship' as const;

const getLevel = (affinity: number): RelationshipLevel => {
  if (affinity >= 80) {
    return 'best-friend';
  }
  if (affinity >= 60) {
    return 'intimate';
  }
  if (affinity >= 30) {
    return 'friendly';
  }
  if (affinity >= 10) {
    return 'familiar';
  }
  return 'stranger';
};

const updateRelationship = (state: NpcDialogueState): NpcDialogueUpdate => {
  if (!state.npc || state.reply === null) {
    return {
      relationship: {
        ...state.relationship,
        delta: 0,
      },
      graphSteps: UPDATE_RELATIONSHIP_NODE,
    };
  }
  const newAffinity = Math.min(
    100,
    Math.max(0, state.relationship.affinity + state.modelRelationshipDelta),
  );
  const appliedDelta = newAffinity - state.relationship.affinity;
  return {
    relationship: {
      ...state.relationship,
      delta: appliedDelta,
      affinity: newAffinity,
      level: getLevel(newAffinity),
    },
    graphSteps: UPDATE_RELATIONSHIP_NODE,
  };
};

export { UPDATE_RELATIONSHIP_NODE, getLevel, updateRelationship };
