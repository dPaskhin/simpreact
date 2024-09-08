import type { Maybe } from '../types';
import type { SimpElement } from '../element';

export const enum EFFECT_TAG {
  UPDATE = 'UPDATE',
  REMOVE = 'REMOVE',
  INSERT = 'INSERT',
}

export interface DiffTask {
  effectTag: EFFECT_TAG;
  prevElement: Maybe<SimpElement>;
  nextElement: Maybe<SimpElement>;
}

export function createDiffTask(
  effectTag: EFFECT_TAG,
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>
): DiffTask {
  return {
    effectTag,
    prevElement,
    nextElement,
  };
}
