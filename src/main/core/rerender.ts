import type { SimpElement, SimpElementStore } from './createElement.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { patch } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';
import { findParentReferenceFromElement } from './utils.js';

interface RerenderSpecificData {
  syncQueue: Set<SimpElementStore>;
  asyncQueue: Set<SimpElementStore>;
  syncLockDepth: number;
  isAsyncFlushScheduled: boolean;
}

const rerenderSpecificDataByRuntime = new WeakMap<SimpRenderRuntime, RerenderSpecificData>();

function getRerenderSpecificData(renderRuntime: SimpRenderRuntime): RerenderSpecificData {
  let data = rerenderSpecificDataByRuntime.get(renderRuntime);
  if (!data) {
    data = {
      asyncQueue: new Set(),
      syncQueue: new Set(),
      syncLockDepth: 0,
      isAsyncFlushScheduled: false,
    };
    rerenderSpecificDataByRuntime.set(renderRuntime, data);
  }
  return data;
}

lifecycleEventBus.subscribe(event => {
  const data = getRerenderSpecificData(event.renderRuntime);

  if (event.type === 'afterRender' || event.type === 'errored' || event.type === 'unmounted') {
    data.asyncQueue.delete(event.element.store!);
    data.syncQueue.delete(event.element.store!);
  }
});

function scheduleAsyncFlush(renderRuntime: SimpRenderRuntime) {
  const data = getRerenderSpecificData(renderRuntime);

  if (data.isAsyncFlushScheduled) {
    return;
  }

  data.isAsyncFlushScheduled = true;

  const process = () => {
    if (data.asyncQueue.size === 0) {
      data.isAsyncFlushScheduled = false;
      return;
    }

    flushQueue(data.asyncQueue, renderRuntime);

    queueMicrotask(process);
  };

  queueMicrotask(process);
}

export function rerender(store: SimpElementStore, renderRuntime: SimpRenderRuntime) {
  const data = getRerenderSpecificData(renderRuntime);
  const element = store.latestElement!;

  if (element.unmounted) {
    console.warn('The component is unmounted.');
    return;
  }

  lifecycleEventBus.publish({ type: 'triedToRerender', element, renderRuntime });

  if (data.syncLockDepth > 0) {
    data.syncQueue.add(store);
    return;
  }

  data.asyncQueue.add(store);
  scheduleAsyncFlush(renderRuntime);
}

export function withSyncRerender(renderRuntime: SimpRenderRuntime, callback: () => void): void {
  const data = getRerenderSpecificData(renderRuntime);

  data.syncLockDepth++;

  try {
    callback();
  } finally {
    data.syncLockDepth--;

    if (data.syncLockDepth === 0) {
      flushQueue(data.syncQueue, renderRuntime);
    }
  }
}

function flushQueue(queue: Set<SimpElementStore>, renderRuntime: SimpRenderRuntime): void {
  for (const store of queue) {
    queue.delete(store);
    performRerender(store.latestElement!, renderRuntime);
  }
}

function performRerender(element: SimpElement, renderRuntime: SimpRenderRuntime) {
  element.store!.forceRerender = true;

  try {
    patch(
      element,
      element,
      findParentReferenceFromElement(element),
      null,
      element.context || null,
      element.store!.hostNamespace,
      renderRuntime
    );
  } finally {
    element.store!.forceRerender = false;
  }
}
