import {
  type FC,
  getLifecycleEventBus,
  hasElementChild,
  hasListChildren,
  isFC,
  isFragment,
  isHost,
  isText,
  type LifecycleEvent,
  normalizeRoot,
  type SimpElement,
  type SimpRenderRuntime,
} from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';
import { escapeHtml } from './escape.js';
import { renderHostElement } from './renderHostElement.js';

export interface RenderToStringOptions {
  /** A runtime from createSsrRenderRuntime() — the same instance any SSR-bound hooks use. */
  renderRuntime: SimpRenderRuntime;
}

export function renderToString(element: SimpElement, options: RenderToStringOptions): string {
  return renderElement(element, options.renderRuntime, null, undefined);
}

export function renderElement(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  context: unknown,
  hostNamespace: Maybe<string>
): string {
  if (isText(element)) {
    return escapeHtml(String(element.children));
  }

  if (isHost(element)) {
    return renderHostElement(element, renderRuntime, context, hostNamespace);
  }

  if (isFC(element)) {
    return renderFC(element, renderRuntime, context, hostNamespace);
  }

  if (isFragment(element)) {
    return renderChildren(element, renderRuntime, context, hostNamespace);
  }

  // PORTAL: skipped, matching React's renderToString — its target container doesn't exist here.
  return '';
}

function renderFC(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  context: unknown,
  hostNamespace: Maybe<string>
): string {
  if (context) {
    element.context = context;
  }
  if (element.unmounted) {
    element.unmounted = false;
  }
  if (hostNamespace) {
    element.hostNamespace = hostNamespace;
  }

  const bus = getLifecycleEventBus(renderRuntime);
  let children;

  try {
    let rerenderCounter = 0;
    renderRuntime.activeRenderElement = element;
    renderRuntime.pendingRerenderFlag = false;

    do {
      renderRuntime.pendingRerenderFlag = false;
      if (++rerenderCounter >= 25) {
        throw new Error('Too many re-renders.');
      }

      bus.publish({ type: 'beforeRender', element, renderRuntime });
      children = renderRuntime.renderer(element.type as FC, element, renderRuntime);
      bus.publish({ type: 'afterRender', element, renderRuntime });
    } while (renderRuntime.pendingRerenderFlag);

    normalizeRoot(element, children, false);
  } catch (error) {
    const event: LifecycleEvent = { type: 'errored', element, error, handled: false, renderRuntime };
    bus.publish(event);

    if (!event.handled) {
      throw new Error('Error occurred during rendering a component', { cause: error });
    }

    return '';
  } finally {
    renderRuntime.activeRenderElement = null;
  }

  // No 'mounted'/'updated' events published here, so effects never fire — intentional for SSR.
  return renderChildren(element, renderRuntime, element.context, hostNamespace);
}

export function renderChildren(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  context: unknown,
  hostNamespace: Maybe<string>
): string {
  if (hasElementChild(element)) {
    const child = element.children as SimpElement;
    child.parent = element;
    return renderElement(child, renderRuntime, context, hostNamespace);
  }

  if (hasListChildren(element)) {
    const children = element.children as SimpElement[];
    let html = '';
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      child.parent = element;
      html += renderElement(child, renderRuntime, context, hostNamespace);
    }
    return html;
  }

  return '';
}
