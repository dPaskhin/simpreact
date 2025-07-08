import type { SimpElement } from './createElement';
import { findHostReferenceFromElement, updateFunctionalComponent } from './patching';
import type { HostReference } from './hostAdapter';
import { hostAdapter } from './hostAdapter';

export function rerender(element: SimpElement) {
  if (element.flag !== 'FC') {
    throw new TypeError('Re-rendering is only supported for FC elements.');
  }

  if (syncRerenderLocker.isLocked) {
    syncRerenderLocker.track(element);
  } else {
    updateFunctionalComponent(
      element,
      hostAdapter.findParentReference(findHostReferenceFromElement(element)) as HostReference,
      null,
      element.contextMap || null
    );
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

  [Symbol.dispose]() {
    this.#isLocked = false;

    for (const element of this.#elements) {
      this.#elements.delete(element);
      rerender(element.store!.latestElement!);
    }
  }
}

export const syncRerenderLocker = new RerenderLocker();
