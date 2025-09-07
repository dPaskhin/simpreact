import type { SimpElement } from './createElement.js';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'afterRender') {
    syncBatchingRerenderLocker.untrack(event.element);
    renderingRerenderLocker.untrack(event.element);
  }
});

export function rerender(element: SimpElement) {
  if (element.flag !== 'FC') {
    throw new TypeError('Re-rendering is only supported for FC elements.');
  }
  if (element.unmounted) {
    console.warn('The component is unmounted.');
  }

  lifecycleEventBus.publish({ type: 'triedToRerender', element });

  if (syncBatchingRerenderLocker.isLocked) {
    syncBatchingRerenderLocker.track(element);
    return;
  }

  if (renderingRerenderLocker.isLocked) {
    renderingRerenderLocker.track(element);
    return;
  }

  renderingRerenderLocker.lock();
  updateFunctionalComponent(
    element,
    findParentReferenceFromElement(element),
    null,
    element.contextMap || null,
    element.store!.hostNamespace
  );
  renderingRerenderLocker.flush();
}

interface IRendererLocker {
  _isLocked: boolean;
  _elements: Set<SimpElement>;

  isLocked: boolean;

  lock(): void;

  track(element: SimpElement): void;

  flush(): void;

  hasElement(element: SimpElement): boolean;

  untrack(element: SimpElement): void;
}

export const syncBatchingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elements: new Set<SimpElement>(),
  get isLocked() {
    return this._isLocked;
  },
  lock() {
    this._isLocked = true;
  },
  track(element) {
    this._elements.add(element);
  },
  flush() {
    this._isLocked = false;

    if (this._elements.size === 0) {
      return;
    }

    for (const element of this._elements) {
      this.untrack(element);
      rerender(element.store!.latestElement!);
    }
  },
  hasElement(element) {
    return this._elements.has(element);
  },
  untrack(element) {
    this._elements.delete(element);
  },
};
export const renderingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elements: new Set<SimpElement>(),
  get isLocked() {
    return this._isLocked;
  },
  lock() {
    this._isLocked = true;
  },
  track(element) {
    this._elements.add(element);
  },
  flush() {
    this._isLocked = false;

    if (this._elements.size === 0) {
      return;
    }

    queueMicrotask(() => {
      for (const element of this._elements) {
        this.untrack(element);
        rerender(element.store!.latestElement!);
      }
    });
  },
  hasElement(element) {
    return this._elements.has(element);
  },
  untrack(element) {
    this._elements.delete(element);
  },
};
