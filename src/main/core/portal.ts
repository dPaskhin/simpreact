import type { SimpElement, SimpNode } from './createElement';
import { normalizeRoot } from './createElement';

export function createPortal(children: SimpNode, container: any): SimpElement {
  const element: SimpElement = { flag: 'PORTAL', parent: null };

  if ((children = normalizeRoot(children))) {
    element.children = children;
  }

  element.ref = container;

  return element;
}
