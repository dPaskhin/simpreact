import { createElement, mount, patch, type SimpElement, type SimpRenderRuntime, unmount } from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

export function createRenderer(
  renderRuntime: SimpRenderRuntime
): (element: Nullable<SimpElement>, container: Nullable<Element | DocumentFragment>) => void {
  return (element, container) => {
    if (!container) {
      return;
    }

    const currentRootElement = renderRuntime.hostAdapter.getElementFromReference(container, renderRuntime);

    if (!currentRootElement) {
      if (element) {
        renderRuntime.hostAdapter.clearNode(container as any);

        element.parent = createElement('', null, element);
        element.parent.type = null;
        element.parent.reference = container;

        renderRuntime.hostAdapter.attachElementToReference(element.parent, container, renderRuntime);
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
        // TODO: detach element from host reference.
        unmount(currentRootElement.children as SimpElement, renderRuntime);
        renderRuntime.hostAdapter.clearNode(container);
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
