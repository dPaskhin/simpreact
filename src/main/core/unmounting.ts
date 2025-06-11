import type { SimpElement } from './createElement';
import type { Maybe } from '../shared';
import type { HostReference } from './hostAdapter';
import { GLOBAL } from './global';
import { unmountRef } from './ref';

export function unmount(element: SimpElement): void {
  if (element.flag === 'FC') {
    // FC element always has only one root element due to normalization.
    unmount(element.children as SimpElement);
    GLOBAL.eventBus.publish({ type: 'unmounted', element });
    return;
  }

  if (element.flag === 'TEXT') {
    return;
  }

  // Only FRAGMENT, PROVIDER, CONSUMER, and HOST elements remain,
  // with Maybe<Many<SimpElement>> children due to normalization.
  if (Array.isArray(element.children)) {
    unmountAllChildren(element.children as SimpElement[]);
  } else if (element.children != null) {
    unmount(element.children as SimpElement);
  }

  unmountRef(element);
}

export function unmountAllChildren(children: SimpElement[]) {
  for (const child of children) {
    unmount(child);
  }
}

export function clearElementHostReference(element: Maybe<SimpElement>, parentHostReference: HostReference): void {
  while (element != null) {
    if (element.flag === 'HOST' || element.flag === 'TEXT') {
      GLOBAL.hostAdapter.removeChild(parentHostReference, element.reference!);
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
      } else if (children != null) {
        element = children as SimpElement;
      }
    }
  }
}

export function removeAllChildren(hostReference: HostReference, element: SimpElement, children: SimpElement[]): void {
  unmountAllChildren(children);

  if (
    element.flag === 'FRAGMENT' ||
    element.flag === 'FC' ||
    element.flag === 'PROVIDER' ||
    element.flag === 'CONSUMER'
  ) {
    clearElementHostReference(element, hostReference);
  } else {
    GLOBAL.hostAdapter.clearNode(hostReference);
  }
}

export function remove(element: SimpElement, parentReference: HostReference): void {
  unmount(element);
  clearElementHostReference(element, parentReference);
}
