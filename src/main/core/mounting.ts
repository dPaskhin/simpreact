import type { Maybe, Nullable } from '@simpreact/shared';
import { emptyObject } from '@simpreact/shared';
import { createComponentStore, isComponentElement } from './component.js';
import {
  createElementStore,
  createTextElement,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { hostAdapter } from './hostAdapter.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import { applyRef } from './ref.js';

const mountHandlers = [mountHostElement, mountFunctionalElement, mountTextElement, mountPortal, mountFragment];

export function mount(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  const index = Math.log2(element.flag & -element.flag);

  mountHandlers[index]!(element, parentReference, nextReference, context, hostNamespace);
}

export function mountTextElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>
): void {
  hostAdapter.insertOrAppend(
    parentReference,
    (element.reference = hostAdapter.createTextReference(element.children as string)),
    nextReference
  );
}

export function mountHostElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  const hostNamespaces = hostAdapter.getHostNamespaces(element, hostNamespace);
  hostNamespace = hostNamespaces?.self;

  const hostReference = (element.reference = hostAdapter.createReference(element.type as string, hostNamespace));

  hostAdapter.attachElementToReference(element, hostReference);

  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
    mountArrayChildren(
      element.children as SimpElement[],
      hostReference,
      null,
      context,
      element,
      hostNamespaces?.children
    );
  }
  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, hostReference, null, context, hostNamespaces?.children);
  }
  if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_TEXT) {
    hostAdapter.setTextContent(hostReference, element.props.children);
  }

  if (element.props) {
    hostAdapter.mountProps(hostReference, element, hostNamespace);
  }

  if (element.className) {
    hostAdapter.setClassname(hostReference, element.className, hostNamespace);
  }

  if (parentReference) {
    hostAdapter.insertOrAppend(parentReference, hostReference, nextReference);
  }

  applyRef(element);
}

export function mountFunctionalElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
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

  if (isComponentElement(element)) {
    createComponentStore(element);
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
      });
      children = isComponentElement(element)
        ? (element.type as any)(element.props || emptyObject, element.store.componentStore?.renderContext)
        : (element.type as any)(element.props || emptyObject);
      lifecycleEventBus.publish({
        type: 'afterRender',
        element,
        phase: 'mounting',
      });
    } while (triedToRerender);

    normalizeRoot(element, children, false);
  } catch (error) {
    const event: LifecycleEvent = { type: 'errored', element, error, phase: 'mounting', handled: false };

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
    mount(element.children as SimpElement, parentReference, nextReference, element.context, hostNamespace);
  }

  lifecycleEventBus.publish({ type: 'mounted', element });
}

export function mountFragment(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  // FRAGMENT element always has Maybe<Many<SimpElement>> children due to a normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(
      element.children as SimpElement[],
      parentReference,
      nextReference,
      context,
      element,
      hostNamespace
    );
  } else if (element.children) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, parentReference, nextReference, context, hostNamespace);
  }
}

export function mountArrayChildren(
  children: SimpElement[],
  reference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown,
  parentElement: SimpElement,
  hostNamespace: Maybe<string>
): void {
  for (const child of children) {
    child.parent = parentElement;
    mount(child, reference, nextReference, context, hostNamespace);
  }
}

export function mountPortal(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  context: unknown
): void {
  if (element.children) {
    (element.children as SimpElement).parent = element;

    mount(
      element.children as SimpElement,
      element.ref,
      null,
      context,
      hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self
    );
  }

  const placeHolderElement = createTextElement('');

  mountTextElement(placeHolderElement, parentReference, nextReference);

  element.reference = placeHolderElement.reference;
}
