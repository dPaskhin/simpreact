import type { SimpElement } from './createElement.js';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'afterRender') {
    batchingRerenderLocker._untrack(event.element);
    renderingRerenderLocker._untrack(event.element);
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

  if (batchingRerenderLocker._isLocked) {
    batchingRerenderLocker._track(element);
    return;
  }

  if (renderingRerenderLocker._isLocked) {
    renderingRerenderLocker._track(element);
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

  _track(element: SimpElement): void;

  _untrack(element: SimpElement): void;

  lock(): void;

  flush(): void;
}

export const batchingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elements: new Set<SimpElement>(),
  _track(element) {
    this._elements.add(element);
  },
  _untrack(element) {
    this._elements.delete(element);
  },

  lock() {
    this._isLocked = true;
  },
  flush() {
    this._isLocked = false;

    if (this._elements.size === 0) {
      return;
    }

    for (const element of this._elements) {
      this._untrack(element);
      rerender(element.store!.latestElement!);
    }
  },
};
export const renderingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elements: new Set<SimpElement>(),
  _track(element) {
    this._elements.add(element);
  },
  _untrack(element) {
    this._elements.delete(element);
  },

  lock() {
    this._isLocked = true;
  },
  flush() {
    this._isLocked = false;

    if (this._elements.size === 0) {
      return;
    }

    queueMicrotask(() => {
      for (const element of this._elements) {
        this._untrack(element);
        rerender(element.store!.latestElement!);
      }
    });
  },
};
