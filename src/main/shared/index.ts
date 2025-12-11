import { emptyArray, emptyMap, emptyObject } from './lang.js';
import { callOrGet, isSimpText, noop, shallowEqual } from './utils.js';

export { emptyObject, emptyMap, emptyArray, isSimpText, noop, callOrGet, shallowEqual };

export default {
  isSimpText,
  emptyMap,
  emptyArray,
  emptyObject,
  noop,
  callOrGet,
};

export type * from './public.js';
