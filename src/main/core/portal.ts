import type { SimpElement, SimpNode } from '../core';
import { normalizeRoot } from './createElement';

export function createPortal<HostRef = any>(children: SimpNode, container: HostRef): SimpElement {
  const element: SimpElement = { flag: 'PORTAL' };

  if ((children = normalizeRoot(children))) {
    element.children = children;
  }

  element.ref = container;

  return element;
}
