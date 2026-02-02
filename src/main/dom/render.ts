import { createElement, mount, patch, remove, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';
import { attachElementToDom, getElementFromDom } from './attach-element-to-dom.js';

export function createRenderer(
  renderRuntime: SimpRenderRuntime
): (element: Nullable<SimpElement>, container: Nullable<Element | DocumentFragment>) => void {
  return (element, container) => {
    if (!container) {
      return;
    }

    const currentRootElement = getElementFromDom(container as Element);

    if (!currentRootElement) {
      if (element) {
        renderRuntime.hostAdapter.clearNode(container as any);

        element.parent = createElement('', null, element);
        element.parent.type = null;
        element.parent.reference = container;

        attachElementToDom(element.parent, container as Element);
        mount(
          element,
          container,
          null,
          null,
          renderRuntime.hostAdapter.getHostNamespaces(element, undefined)?.self,
          renderRuntime
        );
      }
    } else {
      if (!element) {
        remove(currentRootElement.children as SimpElement, container, renderRuntime);
        currentRootElement.children = null;
      } else {
        const prevChildren = currentRootElement.children as SimpElement;
        currentRootElement.children = element;
        element.parent = currentRootElement;
        patch(
          prevChildren,
          element,
          container,
          null,
          null,
          renderRuntime.hostAdapter.getHostNamespaces(element, undefined)?.self,
          renderRuntime
        );
      }
    }
  };
}

export interface SimpRoot {
  render(element: SimpElement): void;

  unmount(): void;
}

export function createCreateRoot(
  renderRuntime: SimpRenderRuntime
): (container: Element | DocumentFragment) => SimpRoot {
  const render = createRenderer(renderRuntime);

  return (container: Element | DocumentFragment): SimpRoot => {
    return {
      render(element: SimpElement) {
        render(element, container);
      },
      unmount() {
        render(null, container);
      },
    };
  };
}
