import type { Many, Maybe } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_FC,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { unmountRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';

export function unmount(element: Many<SimpElement>, renderRuntime: SimpRenderRuntime): void {
  if (Array.isArray(element)) {
    for (const child of element) {
      unmount(child, renderRuntime);
    }
    return;
  }

  if ((element.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
    // Skip — the element is already unmounted.
    if (element.unmounted) {
      return;
    }

    // FC element always has Maybe<SimpElement> due to normalization.
    if (element.children) {
      unmount(element.children as SimpElement, renderRuntime);
    }
    element.unmounted = true;
    lifecycleEventBus.publish({ type: 'unmounted', element, renderRuntime });
    return;
  }

  if ((element.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0) {
    return;
  }

  if ((element.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0) {
    remove(element.children as SimpElement, element.ref, renderRuntime);
    return;
  }

  // Only FRAGMENT and HOST elements remain,
  // with Maybe<Many<SimpElement>> children due to normalization.
  if (element.children) {
    unmount(element.children as Many<SimpElement>, renderRuntime);
  }

  if ((element.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    unmountRef(element);
    renderRuntime.hostAdapter.unmountProps(element.reference, element);
  }
}

export function clearElementHostReference(
  element: Maybe<SimpElement>,
  parentHostReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  while (element != null) {
    if (
      (element.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (element.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (element.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      renderRuntime.hostAdapter.removeChild(parentHostReference, element.reference!);
      return;
    }
    const children = element.children;
    const childFlag = element.childFlag;

    if ((element.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
      element = children as SimpElement;
      continue;
    }
    if ((element.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0) {
      switch (childFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST:
          for (let i = 0, len = (children as SimpElement[]).length; i < len; ++i) {
            clearElementHostReference((children as SimpElement[])[i], parentHostReference, renderRuntime);
          }
          return;
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
          element = children as SimpElement;
      }
    }
  }
}

export function remove(element: SimpElement, parentReference: HostReference, renderRuntime: SimpRenderRuntime): void {
  unmount(element, renderRuntime);
  clearElementHostReference(element, parentReference, renderRuntime);
}
