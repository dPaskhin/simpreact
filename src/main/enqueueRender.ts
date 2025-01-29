import { diff } from './diff';
import { lifecycleManager } from './lifecycleManager';
import { replaceByIndex, type SimpElement } from './element';
import type { Maybe } from './types';
import { applyRef, cleanupRef } from './ref';

lifecycleManager.subscribe(event => {
  if (event.type === 'afterMount') {
    for (const element of event.payload.renderedRefElements) {
      applyRef(element);
    }
    for (const element of event.payload.deletedRefElements) {
      cleanupRef(element);
    }
  }
});

export function enqueueRender(prevElement: Maybe<SimpElement>, nextElement: Maybe<SimpElement>): void {
  const result = diff(prevElement, nextElement, lifecycleManager, prevElement?._globalContext);

  replaceByIndex(prevElement?._parent, nextElement);

  lifecycleManager.requireMount(result.tasks);

  lifecycleManager.afterMount(result);
}
