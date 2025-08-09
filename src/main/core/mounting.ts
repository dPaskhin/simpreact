import type { Many, Maybe, Nullable } from '@simpreact/shared';
import { emptyMap, emptyObject } from '@simpreact/shared';

import type { HostReference } from './hostAdapter';
import { hostAdapter } from './hostAdapter';
import type { FC, SimpElement } from './createElement';
import { createTextElement, normalizeRoot } from './createElement';
import type { SimpContext, SimpContextMap } from './context';
import { applyRef } from './ref';
import { lifecycleEventBus } from './lifecycleEventBus';

export function mount(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  if (element.flag === 'TEXT') {
    mountTextElement(element, parentReference, nextReference);
  } else if (element.flag === 'HOST') {
    mountHostElement(element, parentReference, nextReference, contextMap, hostNamespace);
  } else if (element.flag === 'FC') {
    mountFunctionalElement(element, parentReference, nextReference, contextMap, hostNamespace);
  } else if (element.flag === 'FRAGMENT') {
    mountFragment(element, parentReference, nextReference, contextMap, hostNamespace);
  } else if (element.flag === 'PROVIDER') {
    mountProvider(element, parentReference, nextReference, contextMap, hostNamespace);
  } else if (element.flag === 'PORTAL') {
    mountPortal(element, parentReference, nextReference, contextMap);
  } else {
    mountConsumer(element, parentReference, nextReference, contextMap, hostNamespace);
  }
}

export function mountTextElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>
): void {
  const reference = (element.reference = hostAdapter.createTextReference(element.children as string));

  if (parentReference) {
    hostAdapter.insertOrAppend(parentReference, reference, nextReference);
  }
}

export function mountHostElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  const hostNamespaces = hostAdapter.getHostNamespaces(element, hostNamespace);
  hostNamespace = hostNamespaces?.self;

  const hostReference = (element.reference = hostAdapter.createReference(element.type as string, hostNamespace));

  hostAdapter.attachElementToReference(element, hostReference);

  if (parentReference) {
    hostAdapter.insertOrAppend(parentReference, hostReference, nextReference);
  }

  // HOST element always has Maybe<Many<SimpElement>> children due to normalization process.
  const children = element.children as Maybe<Many<SimpElement>>;

  if (Array.isArray(children)) {
    mountArrayChildren(children, hostReference, null, contextMap, element, hostNamespaces?.children);
  } else if (children) {
    children.parent = element;
    mount(children, hostReference, null, contextMap, hostNamespaces?.children);
  }

  if (element.props) {
    hostAdapter.mountProps(hostReference, element, hostNamespace);
  }

  if (element.className) {
    hostAdapter.setClassname(hostReference, element.className, hostNamespace);
  }

  applyRef(element);
}

export function mountFunctionalElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  if (contextMap) {
    element.contextMap = contextMap;
  }

  (element.store ||= {}).latestElement = element;

  if (hostNamespace) {
    element.store.hostNamespace = hostNamespace;
  }

  let children: Maybe<SimpElement>;

  try {
    lifecycleEventBus.publish({ type: 'beforeRender', element });
    children = normalizeRoot((element.type as FC)(element.props || emptyObject), false);
    lifecycleEventBus.publish({ type: 'afterRender' });
  } catch (error) {
    lifecycleEventBus.publish({ type: 'errored', element, error });
    return;
  }

  if (children) {
    children.parent = element;
    mount((element.children = children), parentReference, nextReference, contextMap, hostNamespace);
  }

  lifecycleEventBus.publish({ type: 'mounted', element });
}

export function mountFragment(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  // FRAGMENT element always has Maybe<Many<SimpElement>> children due to normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(
      element.children as SimpElement[],
      parentReference,
      nextReference,
      contextMap,
      element,
      hostNamespace
    );
  } else if (element.children) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, parentReference, nextReference, contextMap, hostNamespace);
  }
}

export function mountArrayChildren(
  children: SimpElement[],
  reference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  parentElement: SimpElement,
  hostNamespace: Maybe<string>
): void {
  for (const child of children) {
    child.parent = parentElement;
    mount(child, reference, nextReference, contextMap, hostNamespace);
  }
}

export function mountProvider(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  contextMap = new Map(contextMap);
  contextMap.set((element.type as any).context, element.props.value);

  // PROVIDER element always has Maybe<Many<SimpElement>> children due to normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(
      element.children as SimpElement[],
      parentReference,
      nextReference,
      contextMap,
      element,
      hostNamespace
    );
  } else if (element.children) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, parentReference, nextReference, contextMap, hostNamespace);
  }
}

export function mountConsumer(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  const children = normalizeRoot(
    (element.type as SimpContext<any>['Consumer'])(element.props || emptyObject, contextMap || emptyMap),
    false
  );

  if (!children) {
    return;
  }

  children.parent = element;
  mount((element.children = children), parentReference, nextReference, contextMap, hostNamespace);
}

export function mountPortal(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  if (element.children) {
    (element.children as SimpElement).parent = element;

    mount(
      element.children as SimpElement,
      element.ref,
      null,
      contextMap,
      hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self
    );
  }

  const placeHolderElement = createTextElement('');

  mountTextElement(placeHolderElement, parentReference, nextReference);

  element.reference = placeHolderElement.reference;
}
