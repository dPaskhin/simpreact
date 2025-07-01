import { EventBus } from './EventBus';
import { emptyArray, emptyMap, emptyObject } from './lang';
import { isSimpText } from './utils';

export { emptyObject, emptyMap, emptyArray, isSimpText, EventBus };

export default { isSimpText, EMPTY_MAP: emptyMap, EMPTY_ARRAY: emptyArray, EMPTY_OBJECT: emptyObject, EventBus };

export type * from './public';
