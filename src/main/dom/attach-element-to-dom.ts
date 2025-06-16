import type { Nullable } from '../shared';
import type { SimpElement } from '../core';

const elementPropertyName = '__SIMP_ELEMENT__';

export function attachElementToDom(element: SimpElement, dom: HTMLElement | Text) {
  if (dom.nodeType !== Node.TEXT_NODE) {
    Object.defineProperty(dom, elementPropertyName, { value: element, writable: true });
  }
}

export function getElementFromEventTarget(target: Nullable<EventTarget>): Nullable<SimpElement> {
  return (target as any)?.[elementPropertyName] ?? null;
}
