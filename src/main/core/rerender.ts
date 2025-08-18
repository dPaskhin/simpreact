import type { SimpElement } from './createElement.js';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching.js';

export function rerender(element: SimpElement) {
  if (element.flag !== 'FC') {
    throw new TypeError('Re-rendering is only supported for FC elements.');
  }
  if (element.unmounted) {
    console.warn('The component unmounted.');
  }

  if (syncRerenderLocker.isLocked) {
    syncRerenderLocker.track(element);
    return;
  } else if (asyncRerenderLocker.isLocked) {
    asyncRerenderLocker.track(element);
  } else {
    asyncRerenderLocker.lock();

    updateFunctionalComponent(
      element,
      findParentReferenceFromElement(element),
      null,
      element.contextMap || null,
      element.store!.hostNamespace
    );

    asyncRerenderLocker.flush();
  }
}

interface IRendererLocker {
  _isLocked: boolean;
  _elements: Set<SimpElement>;

  isLocked: boolean;

  lock(): void;

  track(element: SimpElement): void;

  flush(): void;
}

export const syncRerenderLocker: IRendererLocker = {
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
      this._elements.delete(element);
      rerender(element.store!.latestElement!);
    }
  },
};
export const asyncRerenderLocker: IRendererLocker = {
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
        this._elements.delete(element);
        rerender(element.store!.latestElement!);
      }
    });
  },
};
