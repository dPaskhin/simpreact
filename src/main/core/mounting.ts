import type { Maybe } from '@simpreact/shared';
import {
  createElementStore,
  createTextElement,
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';

const mountHandlers = [mountHostElement, mountFunctionalElement, mountTextElement, mountPortal, mountFragment];

export function mount(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  const index = Math.log2(element.flag & -element.flag);

  mountHandlers[index]!(element, parentReference, nextReference, context, hostNamespace, renderRuntime);
}

export function mountTextElement(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  _context: unknown,
  _hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  renderRuntime.hostAdapter.insertOrAppend(
    parentReference,
    (element.reference = renderRuntime.hostAdapter.createTextReference(element.children as string)),
    nextReference
  );
}

export function mountHostElement(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  const hostNamespaces = renderRuntime.hostAdapter.getHostNamespaces(element, hostNamespace);
  hostNamespace = hostNamespaces?.self;

  const hostReference = (element.reference = renderRuntime.hostAdapter.createReference(
    element.type as string,
    hostNamespace
  ));

  renderRuntime.hostAdapter.attachElementToReference(element, hostReference);

  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
    mountArrayChildren(
      element.children as SimpElement[],
      hostReference,
      null,
      context,
      element,
      hostNamespaces?.children,
      renderRuntime
    );
  }
  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, hostReference, null, context, hostNamespaces?.children, renderRuntime);
  }
  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_TEXT) {
    renderRuntime.hostAdapter.setTextContent(hostReference, element.props.children);
  }

  if (element.props) {
    renderRuntime.hostAdapter.mountProps(hostReference, element, renderRuntime, hostNamespace);
  }

  if (element.className) {
    renderRuntime.hostAdapter.setClassname(hostReference, element.className, hostNamespace);
  }

  if (parentReference) {
    renderRuntime.hostAdapter.insertOrAppend(parentReference, hostReference, nextReference);
  }

  applyRef(element);
}

export function mountFunctionalElement(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (context) {
    element.context = context;
  }

  if (element.unmounted) {
    element.unmounted = false;
  }

  element.store = createElementStore();
  element.store.latestElement = element;

  if (hostNamespace) {
    element.store.hostNamespace = hostNamespace;
  }

  // FC element always has Maybe<SimpElement> children due to a normalization process.
  let children;

  let triedToRerenderUnsubscribe;

  try {
    let triedToRerender = false;
    let rerenderCounter = 0;
    triedToRerenderUnsubscribe = lifecycleEventBus.subscribe(event => {
      if (event.type === 'triedToRerender' && event.element === element) {
        triedToRerender = true;
      }
    });

    do {
      triedToRerender = false;
      if (++rerenderCounter >= 25) {
        throw new Error('Too many re-renders.');
      }
      lifecycleEventBus.publish({
        type: 'beforeRender',
        element,
        phase: 'mounting',
        renderRuntime,
      });
      // children = isComponentElement(element)
      //   ? (element.type as any)(element.props || emptyObject, element.store.componentStore?.renderContext)
      //   : (element.type as any)(element.props || emptyObject);

      children = renderRuntime.renderer(element.type as FC, element);

      lifecycleEventBus.publish({
        type: 'afterRender',
        element,
        phase: 'mounting',
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(element, children, false);
  } catch (error) {
    const event: LifecycleEvent = { type: 'errored', element, error, phase: 'mounting', handled: false, renderRuntime };

    lifecycleEventBus.publish(event);

    if (!event.handled) {
      throw new Error('Error occurred during rendering a component', { cause: event.error });
    }

    return;
  } finally {
    triedToRerenderUnsubscribe!();
  }

  if (element.children) {
    (element.children as SimpElement).parent = element;
    mount(
      element.children as SimpElement,
      parentReference,
      nextReference,
      element.context,
      hostNamespace,
      renderRuntime
    );
  }

  lifecycleEventBus.publish({ type: 'mounted', element, renderRuntime });
}

export function mountFragment(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  switch (element.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST:
      mountArrayChildren(
        element.children as SimpElement[],
        parentReference,
        nextReference,
        context,
        element,
        hostNamespace,
        renderRuntime
      );
      break;
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      (element.children as SimpElement).parent = element;
      mount(element.children as SimpElement, parentReference, nextReference, context, hostNamespace, renderRuntime);
  }
}

export function mountArrayChildren(
  children: SimpElement[],
  reference: HostReference,
  nextReference: HostReference,
  context: unknown,
  parentElement: SimpElement,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  for (const child of children) {
    child.parent = parentElement;
    mount(child, reference, nextReference, context, hostNamespace, renderRuntime);
  }
}

export function mountPortal(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  _hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (element.children) {
    (element.children as SimpElement).parent = element;

    mount(
      element.children as SimpElement,
      element.ref,
      null,
      context,
      renderRuntime.hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self,
      renderRuntime
    );
  }

  const placeHolderElement = createTextElement('');

  mountTextElement(placeHolderElement, parentReference, nextReference, null, null, renderRuntime);

  element.reference = placeHolderElement.reference;
}
