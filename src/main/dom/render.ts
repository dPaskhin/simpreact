import { GLOBAL, mount, patch, type SimpElement } from '../core/internal';

import type { Nullable } from '../shared';
import { domAdapter } from './domAdapter';

GLOBAL.hostAdapter = domAdapter as any;

export function render(element: SimpElement, parentReference: Nullable<HTMLElement>) {
  mount(element, parentReference as never, null);
}

interface SimpRoot {
  render(element: SimpElement): void;

  unmount(): void;
}

export function createRoot(container: HTMLElement): SimpRoot {
  let currentRoot: SimpElement | null = null;

  return {
    render(element: SimpElement) {
      if (currentRoot) {
        patch(currentRoot, element, container as never, null);
      } else {
        mount(element, container as never, null);
      }

      currentRoot = element;
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
