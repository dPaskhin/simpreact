import { GLOBAL, mount, patch, type SimpElement } from '../core/internal';

import type { Nullable } from '../shared';
import { domAdapter } from './domAdapter';

Object.defineProperty(GLOBAL, 'hostAdapter', { value: domAdapter });

export function render(element: SimpElement, parentReference: Nullable<HTMLElement>) {
  mount(element, parentReference as never, null, null);
}

interface SimpRoot {
  render(element: SimpElement): void;

  unmount(): void;
}

export function createRoot(container: Element | DocumentFragment): SimpRoot {
  let currentRoot: SimpElement | null = (container as any).__SIMP_ROOT__;

  return {
    render(element: SimpElement) {
      if (currentRoot) {
        patch(currentRoot, element, container as never, null, null);
      } else {
        GLOBAL.hostAdapter.clearNode(container as never);
        mount(element, container as never, null, null);
      }

      currentRoot = element;
      (container as any).__SIMP_ROOT__ = currentRoot;
    },
    unmount() {
      // if (currentRoot != null) {
      //   enqueueRender(currentRoot, null);
      //   currentRoot = null;
      // }
      currentRoot = null;
    },
  };
}
