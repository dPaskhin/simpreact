import { SIMP_ELEMENT_FLAG_TEXT, type SimpElement } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

const elementPropertyName = '__SIMP_ELEMENT__';

export function attachElementToDom(element: SimpElement, dom: Node): void {
  if ((element.flag & SIMP_ELEMENT_FLAG_TEXT) === 0) {
    Object.defineProperty(dom, elementPropertyName, {
      value: element,
      writable: true,
    });
  }
}

export function getElementFromDom(target: Nullable<EventTarget>): Nullable<SimpElement> {
  if (!target) {
    return null;
  }

  while (target && !(elementPropertyName in target)) {
    target = (target as Element).parentElement;
  }

  if (!target) {
    return null;
  }

  return target[elementPropertyName] as SimpElement;
}
