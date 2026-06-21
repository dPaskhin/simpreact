import { isText, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

const domElementMaps = new WeakMap<SimpRenderRuntime, Map<unknown, SimpElement>>();

function getDomMap(renderRuntime: SimpRenderRuntime): Map<unknown, SimpElement> {
  let map = domElementMaps.get(renderRuntime);
  if (!map) {
    map = new Map();
    domElementMaps.set(renderRuntime, map);
  }
  return map;
}

export function attachElementToDom(element: SimpElement, dom: Node, renderRuntime: SimpRenderRuntime): void {
  if (!isText(element)) {
    getDomMap(renderRuntime).set(dom, element);
  }
}

export function getElementFromDom(
  target: Nullable<EventTarget>,
  renderRuntime: SimpRenderRuntime
): Nullable<SimpElement> {
  if (!target) {
    return null;
  }

  const map = getDomMap(renderRuntime);

  while (target && !map.has(target)) {
    target = (target as Element).parentElement;
  }

  if (!target) {
    return null;
  }

  return map.get(target) as SimpElement;
}

export function detachElementFromDom(dom: Node, renderRuntime: SimpRenderRuntime): void {
  getDomMap(renderRuntime).delete(dom);
}
