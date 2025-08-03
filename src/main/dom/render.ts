import {
  hostAdapter,
  mount,
  patch,
  provideHostAdapter,
  remove,
  type SimpElement,
  syncRerenderLocker,
} from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

import { domAdapter } from './domAdapter';

provideHostAdapter(domAdapter);

export function render(element: Nullable<SimpElement>, container: Nullable<Element | DocumentFragment>) {
  let currentRoot: SimpElement | null = (container as any).__SIMP_ROOT__;

  syncRerenderLocker.lock();

  if (currentRoot == null) {
    if (element != null) {
      hostAdapter.clearNode(container);
      mount(element, container, null, null, hostAdapter.getHostNamespaces(element, undefined)?.self);
      (container as any).__SIMP_ROOT__ = element;
    }
  } else {
    if (element == null) {
      remove(currentRoot, container);
      (container as any).__SIMP_ROOT__ = null;
    } else {
      patch(currentRoot, element, container, null, null, hostAdapter.getHostNamespaces(element, undefined)?.self);
      (container as any).__SIMP_ROOT__ = element;
    }
  }

  // When "using" becomes more stable this will be removed.
  syncRerenderLocker[Symbol.dispose]();
}

interface SimpRoot {
  render(element: SimpElement): void;

  unmount(): void;
}

export function createRoot(container: Element | DocumentFragment): SimpRoot {
  return {
    render(element: SimpElement) {
      render(element, container);
    },
    unmount() {
      render(null, container);
    },
  };
}
