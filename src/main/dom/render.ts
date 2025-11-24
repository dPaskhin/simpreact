import {
  createElement,
  hostAdapter,
  mount,
  patch,
  provideHostAdapter,
  remove,
  type SimpElement,
} from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';
import { attachElementToDom, getElementFromDom } from './attach-element-to-dom.js';
import { domAdapter } from './domAdapter.js';

provideHostAdapter(domAdapter);

export function render(element: Nullable<SimpElement>, container: Nullable<Element | DocumentFragment>): void {
  if (!container) {
    return;
  }

  const currentRootElement = getElementFromDom(container as Element);

  if (!currentRootElement) {
    if (element) {
      hostAdapter.clearNode(container as any);

      element.parent = createElement('', null, element);
      element.parent.type = null;
      element.parent.reference = container;

      attachElementToDom(element.parent, container as Element);
      mount(element, container, null, null, hostAdapter.getHostNamespaces(element, undefined)?.self);
    }
  } else {
    if (!element) {
      remove(currentRootElement.children as SimpElement, container);
      currentRootElement.children = null;
    } else {
      const prevChildren = currentRootElement.children as SimpElement;
      currentRootElement.children = element;
      element.parent = currentRootElement;
      patch(prevChildren, element, container, null, null, hostAdapter.getHostNamespaces(element, undefined)?.self);
    }
  }
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
