import { SIMP_ELEMENT_FLAG_TEXT, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

export function attachElementToDom(element: SimpElement, dom: Node, renderRuntime: SimpRenderRuntime): void {
  if ((element.flag & SIMP_ELEMENT_FLAG_TEXT) === 0) {
    renderRuntime.elementToHostMap.set(dom, element);
  }
}

export function getElementFromDom(
  target: Nullable<EventTarget>,
  renderRuntime: SimpRenderRuntime
): Nullable<SimpElement> {
  if (!target) {
    return null;
  }

  while (target && !renderRuntime.elementToHostMap.has(target)) {
    target = (target as Element).parentElement;
  }

  if (!target) {
    return null;
  }

  return renderRuntime.elementToHostMap.get(target) as SimpElement;
}

export function detachElementFromDom(dom: Node, renderRuntime: SimpRenderRuntime): void {
  if (renderRuntime.elementToHostMap.has(dom)) {
    renderRuntime.elementToHostMap.delete(dom);
  }
}
