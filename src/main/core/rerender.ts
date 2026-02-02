import type { SimpElement, SimpElementStore } from './createElement.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { findParentReferenceFromElement, patchFunctionalComponent } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'afterRender' || event.type === 'errored' || event.type === 'unmounted') {
    elementStoresAsyncRerender.delete(event.element.store!);
    elementStoresSyncRerender.delete(event.element.store!);
  }
});

let loopRunning = false;

const elementStoresAsyncRerender = new Set<SimpElementStore>();

function startScheduler(renderRuntime: SimpRenderRuntime) {
  if (loopRunning) {
    return;
  }

  loopRunning = true;

  const process = () => {
    if (elementStoresAsyncRerender.size === 0) {
      loopRunning = false;
      return;
    }

    for (const store of elementStoresAsyncRerender) {
      elementStoresAsyncRerender.delete(store);

      patchFunctionalComponent(
        store.latestElement!,
        store.latestElement!,
        store.latestElement!.context || null,
        findParentReferenceFromElement(store.latestElement!),
        store!.hostNamespace,
        null,
        renderRuntime
      );
    }

    queueMicrotask(process);
  };

  queueMicrotask(process);
}

export function rerender(element: SimpElement, renderRuntime: SimpRenderRuntime) {
  if (element.unmounted) {
    console.warn('The component is unmounted.');
  }

  lifecycleEventBus.publish({ type: 'triedToRerender', element, renderRuntime });

  if (isSyncRenderingLocked) {
    elementStoresSyncRerender.add(element.store!);
    return;
  }

  elementStoresAsyncRerender.add(element.store!);
  startScheduler(renderRuntime);
}

let isSyncRenderingLocked = false;

const elementStoresSyncRerender = new Set<SimpElementStore>();

export function lockSyncRendering() {
  isSyncRenderingLocked = true;
}

export function flushSyncRerender(renderRuntime: SimpRenderRuntime) {
  isSyncRenderingLocked = false;

  if (elementStoresSyncRerender.size === 0) {
    return;
  }

  for (const store of elementStoresSyncRerender) {
    elementStoresSyncRerender.delete(store);

    patchFunctionalComponent(
      store.latestElement!,
      store.latestElement!,
      store.latestElement!.context || null,
      findParentReferenceFromElement(store.latestElement!),
      store!.hostNamespace,
      null,
      renderRuntime
    );
  }
}
