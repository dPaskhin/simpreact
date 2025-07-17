import { EventBus } from './EventBus';
import { emptyArray, emptyMap, emptyObject } from './lang';
import { isSimpText, noop } from './utils';

export { emptyObject, emptyMap, emptyArray, isSimpText, EventBus, noop };

export default { isSimpText, EMPTY_MAP: emptyMap, EMPTY_ARRAY: emptyArray, EMPTY_OBJECT: emptyObject, EventBus, noop };

export type * from './public';
