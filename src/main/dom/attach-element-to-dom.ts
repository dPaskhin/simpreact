import type { Nullable } from '@simpreact/shared';
import type { SimpElement } from '@simpreact/internal';

const elementPropertyName = '__SIMP_ELEMENT__';

export function attachElementToDom(element: SimpElement, dom: Node): void {
  if (element.flag !== 'TEXT') {
    Object.defineProperty(dom, elementPropertyName, { value: element, writable: true });
  }
}

export function getElementFromDom(target: Nullable<EventTarget>): Nullable<SimpElement> {
  return (target as any)?.[elementPropertyName] ?? null;
}
