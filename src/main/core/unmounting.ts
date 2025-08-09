import type { Many, Maybe } from '@simpreact/shared';

import type { SimpElement } from './createElement';
import type { HostReference } from './hostAdapter';
import { hostAdapter } from './hostAdapter';
import { unmountRef } from './ref';
import { lifecycleEventBus } from './lifecycleEventBus';

export function unmount(element: Many<SimpElement>): void {
  if (Array.isArray(element)) {
    for (const child of element) {
      unmount(child);
    }
    return;
  }

  if (element.flag === 'FC') {
    // FC element always has Maybe<SimpElement> due to normalization.
    if (element.children) {
      unmount(element.children as SimpElement);
    }
    element.unmounted = true;
    lifecycleEventBus.publish({ type: 'unmounted', element });
    return;
  }

  if (element.flag === 'TEXT') {
    return;
  }

  if (element.flag === 'PORTAL') {
    remove(element.children as SimpElement, element.ref as HostReference);
    return;
  }

  // Only FRAGMENT, PROVIDER, CONSUMER, and HOST elements remain,
  // with Maybe<Many<SimpElement>> children due to normalization.
  if (element.children) {
    unmount(element.children as Many<SimpElement>);
  }

  if (element.flag === 'HOST') {
    unmountRef(element);
    hostAdapter.unmountProps(element.reference, element);
  }
}

export function clearElementHostReference(element: Maybe<SimpElement>, parentHostReference: HostReference): void {
  while (element != null) {
    if (element.flag === 'HOST' || element.flag === 'TEXT' || element.flag === 'PORTAL') {
      hostAdapter.removeChild(parentHostReference, element.reference!);
      return;
    }
    const children = element.children;

    if (element.flag === 'FC' || element.flag === 'CONSUMER') {
      element = children as SimpElement;
      continue;
    }
    if (element.flag === 'FRAGMENT' || element.flag === 'PROVIDER') {
      if (Array.isArray(children)) {
        for (let i = 0, len = children.length; i < len; ++i) {
          clearElementHostReference(children[i] as SimpElement, parentHostReference);
        }
        return;
      } else if (children) {
        element = children as SimpElement;
      }
    }
  }
}

export function remove(element: SimpElement, parentReference: HostReference): void {
  unmount(element);
  clearElementHostReference(element, parentReference);
}
