import type { SimpElement } from './createElement';
import type { Maybe } from '../shared';
import { isArray } from '../shared';
import type { HostReference } from './hostAdapter';
import { GLOBAL } from './global';

export function unmount(element: SimpElement): void {
  if (element.flag === 'HOST') {
    if (isArray(element.children)) {
      for (const child of element.children) {
        unmount(child as SimpElement);
      }
    } else if (element.children != null) {
      unmount(element.children as SimpElement);
    }
  } else if (element.flag === 'FC') {
    unmount(element.children as SimpElement);
    GLOBAL.eventBus.publish({ type: 'unmounted', element });
  } else if (element.flag === 'FRAGMENT') {
    if (isArray(element.children)) {
      for (const child of element.children) {
        unmount(child as SimpElement);
      }
    } else if (element.children != null) {
      unmount(element.children as SimpElement);
    }
  }
}

export function unmountAllChildren(children: SimpElement[]) {
  for (const child of children) {
    unmount(child);
  }
}

export function clearElementHostReference<HostRef = HostReference>(
  element: Maybe<SimpElement>,
  parentHostReference: HostRef
): void {
  while (element != null) {
    if (element.flag === 'HOST' || element.flag === 'TEXT') {
      GLOBAL.hostAdapter.removeChild(parentHostReference as HostReference, element.reference!);
      return;
    }
    const children = element.children;

    if (element.flag === 'FC') {
      element = children as SimpElement;
      continue;
    }
    if (element.flag === 'FRAGMENT') {
      if (isArray(children)) {
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

export function removeAllChildren<HostRef = HostReference>(
  hostReference: HostRef,
  element: SimpElement,
  children: SimpElement[]
): void {
  unmountAllChildren(children);

  if (element.flag === 'FRAGMENT') {
    clearElementHostReference(element, hostReference);
  } else {
    GLOBAL.hostAdapter.clearNode(hostReference as HostReference);
  }
}

export function remove<HostRef = HostReference>(element: SimpElement, parentReference: HostRef): void {
  unmount(element);
  clearElementHostReference(element, parentReference);
}
