import { diff } from './diff';
import { lifecycleManager } from './lifecycleManager';
import { replaceByIndex, type SimpElement } from './element';
import type { Maybe } from './types';

export function enqueueRender(prevElement: Maybe<SimpElement>, nextElement: Maybe<SimpElement>): void {
  const result = diff(prevElement, nextElement, lifecycleManager);

  replaceByIndex(prevElement?._parent, nextElement);

  lifecycleManager.requireMount(result.tasks);

  lifecycleManager.afterMount(result);
}
