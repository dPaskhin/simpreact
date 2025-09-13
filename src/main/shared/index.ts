import { EventBus } from './EventBus.js';
import { emptyArray, emptyMap, emptyObject } from './lang.js';
import { callOrGet, isSimpText, noop, shallowEqual } from './utils.js';

export { emptyObject, emptyMap, emptyArray, isSimpText, EventBus, noop, callOrGet, shallowEqual };

export default {
  isSimpText,
  EMPTY_MAP: emptyMap,
  EMPTY_ARRAY: emptyArray,
  EMPTY_OBJECT: emptyObject,
  EventBus,
  noop,
  callOrGet,
  emptyObject,
};

export type * from './public.js';
