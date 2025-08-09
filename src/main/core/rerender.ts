import type { SimpElement } from './createElement';
import { findParentReferenceFromElement, updateFunctionalComponent } from './patching';

export function rerender(element: SimpElement) {
  if (element.flag !== 'FC') {
    throw new TypeError('Re-rendering is only supported for FC elements.');
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

class RerenderLocker {
  #isLocked = false;

  #elements = new Set<SimpElement>();

  get isLocked() {
    return this.#isLocked;
  }

  track(element: SimpElement) {
    if (element.flag !== 'FC') {
      throw new TypeError('Re-rendering is only supported for FC elements.');
    }

    this.#elements.add(element);
  }

  lock() {
    this.#isLocked = true;
  }

  flush() {
    this.#isLocked = false;

    for (const element of this.#elements) {
      this.#elements.delete(element);
      rerender(element.store!.latestElement!);
    }
  }
}

class AsyncRerenderLocker {
  #isLocked = false;

  #elements = new Set<SimpElement>();

  get isLocked() {
    return this.#isLocked;
  }

  track(element: SimpElement) {
    if (element.flag !== 'FC') {
      throw new TypeError('Re-rendering is only supported for FC elements.');
    }

    this.#elements.add(element);
  }

  lock() {
    this.#isLocked = true;
  }

  flush() {
    this.#isLocked = false;

    queueMicrotask(() => {
      for (const element of this.#elements) {
        this.#elements.delete(element);
        rerender(element.store!.latestElement!);
      }
    });
  }
}

export const syncRerenderLocker = new RerenderLocker();
export const asyncRerenderLocker = new AsyncRerenderLocker();
