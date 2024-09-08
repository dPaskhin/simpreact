import * as core from './index';
import type { DiffTask as _DiffTask } from './diff';
import type { Maybe } from './types';

export { core };

export { EFFECT_TAG } from './diff';
export * from './element/utils';

export interface SimpElement<P = any, S = unknown, R = unknown> extends core.SimpElement<P> {
  _reference: R;
  _store: S;
}

export interface DiffTask<Prev extends Maybe<SimpElement>, Next extends Maybe<SimpElement>> extends _DiffTask {
  prevElement: Prev;
  nextElement: Next;
}
