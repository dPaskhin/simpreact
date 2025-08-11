import { EventBus } from './EventBus.js';
import { emptyArray, emptyMap, emptyObject } from './lang.js';
import { isSimpText, noop } from './utils.js';

export { emptyObject, emptyMap, emptyArray, isSimpText, EventBus, noop };

export default { isSimpText, EMPTY_MAP: emptyMap, EMPTY_ARRAY: emptyArray, EMPTY_OBJECT: emptyObject, EventBus, noop };

export type * from './public.js';
