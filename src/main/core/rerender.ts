import type { SimpElement } from './createElement.js';
import { getLifecycleEventBus, registerLifecyclePlugin } from './lifecycleEventBus.js';
import { patch } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';
import { findParentReferenceFromElement } from './utils.js';

interface RerenderSpecificData {
  syncQueue: Set<SimpElement>;
  asyncQueue: Set<SimpElement>;
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

registerLifecyclePlugin(bus => {
  bus.subscribe(event => {
    const data = getRerenderSpecificData(event.renderRuntime);

    if (event.type === 'afterRender' || event.type === 'errored' || event.type === 'unmounted') {
      data.asyncQueue.delete(event.element);
      data.syncQueue.delete(event.element);
    }
  });
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

export function rerender(element: SimpElement, renderRuntime: SimpRenderRuntime) {
  const data = getRerenderSpecificData(renderRuntime);

  if (element.unmounted) {
    console.warn('The component is unmounted.');
    return;
  }

  getLifecycleEventBus(renderRuntime).publish({ type: 'triedToRerender', element, renderRuntime });

  if (data.syncLockDepth > 0) {
    data.syncQueue.add(element);
    return;
  }

  data.asyncQueue.add(element);
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

function flushQueue(queue: Set<SimpElement>, renderRuntime: SimpRenderRuntime): void {
  for (const element of queue) {
    queue.delete(element);
    performRerender(element, renderRuntime);
  }
}

function performRerender(element: SimpElement, renderRuntime: SimpRenderRuntime) {
  patch(
    element,
    element,
    findParentReferenceFromElement(element),
    null,
    element.context || null,
    element.hostNamespace,
    renderRuntime
  );
}
