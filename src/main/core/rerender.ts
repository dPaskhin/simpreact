import { SIMP_ELEMENT_FLAG_FC, type SimpElement, type SimpElementStore } from './createElement.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { isMemo } from './memo.js';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching.js';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'afterRender' || event.type === 'errored' || event.type === 'unmounted') {
    elementStoresToRerender.delete(event.element.store!);
    syncRerenderLocker._untrack(event.element.store!);
  }
});

let loopRunning = false;

const elementStoresToRerender = new Set<SimpElementStore>();

function startScheduler() {
  if (loopRunning) {
    return;
  }

  loopRunning = true;

  const process = () => {
    if (elementStoresToRerender.size === 0) {
      loopRunning = false;
      return;
    }

    for (const store of elementStoresToRerender) {
      elementStoresToRerender.delete(store);
      _rerender(store.latestElement!);
    }

    queueMicrotask(process);
  };

  queueMicrotask(process);
}

export function rerender(element: SimpElement) {
  if ((element.flag & SIMP_ELEMENT_FLAG_FC) === 0) {
    throw new TypeError('Re-rendering is only supported for FC elements.');
  }
  if (element.unmounted) {
    console.warn('The component is unmounted.');
  }

  lifecycleEventBus.publish({ type: 'triedToRerender', element });

  if (syncRerenderLocker._isLocked) {
    syncRerenderLocker._track(element.store!);
    return;
  }

  elementStoresToRerender.add(element.store!);
  startScheduler();
}

export const syncRerenderLocker = {
  _elementStores: new Set<SimpElementStore>(),
  _isLocked: false,
  _track(store: SimpElementStore): void {
    this._elementStores.add(store);
  },
  _untrack(store: SimpElementStore): void {
    this._elementStores.delete(store);
  },
  flush(): void {
    this._isLocked = false;

    if (this._elementStores.size === 0) {
      return;
    }

    for (const store of this._elementStores) {
      this._untrack(store);
      _rerender(store.latestElement!);
    }
  },
  lock(): void {
    this._isLocked = true;
  },
};

function _rerender(element: SimpElement) {
  if (isMemo(element.type)) {
    element.type._forceRender = true;
  }

  updateFunctionalComponent(
    element,
    findParentReferenceFromElement(element),
    null,
    element.context || null,
    element.store!.hostNamespace
  );
}
