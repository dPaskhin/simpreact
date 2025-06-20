import type { HostReference } from '@simpreact/internal';
import { mount, patch, provideHostAdapter, type SimpElement } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

import { domAdapter } from './domAdapter';

provideHostAdapter(domAdapter);

export function render(element: SimpElement, parentReference: Nullable<HTMLElement>) {
  mount(element, parentReference as HostReference, null, null);
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
        patch(currentRoot, element, container as HostReference, null, null);
      } else {
        domAdapter.clearNode(container as HTMLElement);
        mount(element, container as HostReference, null, null);
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
