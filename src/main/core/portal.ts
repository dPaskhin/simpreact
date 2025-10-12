import type { SimpElement, SimpNode } from './createElement.js';
import { normalizeRoot, SimpElementFlag } from './createElement.js';

export function createPortal(children: SimpNode, container: any): SimpElement {
  const element: SimpElement = {
    flag: SimpElementFlag.PORTAL,
    parent: null,
    key: null,
    type: null,
    props: null,
    children: null,
    className: null,
    reference: null,
    store: null,
    context: null,
    ref: null,
    unmounted: null,
  };

  if ((children = normalizeRoot(children, false))) {
    element.children = children;
  }

  element.ref = container;

  return element;
}
