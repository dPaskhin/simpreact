import type { SimpElement, SimpElementStore } from './createElement.js';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'afterRender' || event.type === 'errored' || event.type === 'unmounted') {
    batchingRerenderLocker._untrack(event.element.store!);
    renderingRerenderLocker._untrack(event.element.store!);
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
    batchingRerenderLocker._track(element.store!);
    return;
  }

  if (renderingRerenderLocker._isLocked) {
    renderingRerenderLocker._track(element.store!);
    return;
  }

  renderingRerenderLocker.lock();
  updateFunctionalComponent(
    element,
    findParentReferenceFromElement(element),
    null,
    element.context || null,
    element.store!.hostNamespace
  );
  renderingRerenderLocker.flush();
}

interface IRendererLocker {
  _isLocked: boolean;
  _elementStores: Set<SimpElementStore>;
  _last: SimpElementStore | undefined;

  _track(element: SimpElementStore): void;

  _untrack(element: SimpElementStore): void;

  lock(): void;

  flush(): void;
}

export const batchingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elementStores: new Set<SimpElementStore>(),
  _last: undefined,
  _track(store) {
    if (this._elementStores.has(store)) {
      return;
    }

    if (this._elementStores.size === 0 || store.forceRender) {
      this._elementStores.add(store);
      this._last = store;
      return;
    }

    if (isParentOf(store.latestElement!, this._last!.latestElement!)) {
      return;
    }

    if (isParentOf(this._last!.latestElement!, store.latestElement!)) {
      this._elementStores.clear();
      this._elementStores.add(store);
      this._last = store;
    }
  },
  _untrack(store) {
    if (this._elementStores.delete(store) && store === this._last) {
      this._last = undefined;
      for (const val of this._elementStores) {
        this._last = val;
      }
    }
  },

  lock() {
    this._isLocked = true;
  },
  flush() {
    this._isLocked = false;

    if (this._elementStores.size === 0) {
      return;
    }

    for (const store of this._elementStores) {
      this._untrack(store);
      rerender(store.latestElement!);
    }
  },
};
export const renderingRerenderLocker: IRendererLocker = {
  _isLocked: false,
  _elementStores: new Set<SimpElementStore>(),
  _last: undefined,
  _track(store) {
    if (this._elementStores.has(store)) {
      return;
    }

    if (this._elementStores.size === 0 || store.forceRender) {
      this._elementStores.add(store);
      this._last = store;
      return;
    }

    if (isParentOf(store.latestElement!, this._last!.latestElement!)) {
      return;
    }

    if (isParentOf(this._last!.latestElement!, store.latestElement!)) {
      this._elementStores.clear();
      this._elementStores.add(store);
      this._last = store;
    }
  },
  _untrack(store) {
    if (this._elementStores.delete(store) && store === this._last) {
      this._last = undefined;
      for (const val of this._elementStores) {
        this._last = val;
      }
    }
  },

  lock() {
    this._isLocked = true;
  },
  flush() {
    this._isLocked = false;

    if (this._elementStores.size === 0) {
      return;
    }

    queueMicrotask(() => {
      for (const store of this._elementStores) {
        this._untrack(store);
        rerender(store!.latestElement!);
      }
    });
  },
};

function isParentOf(element: SimpElement, parent: SimpElement): boolean {
  let current: SimpElement | null = element.parent;
  while (current) {
    if (current.store === parent.store) {
      return true;
    }
    current = current.parent;
  }
  return false;
}
