import type { Many, Maybe, Nullable } from '@simpreact/shared';
import { EMPTY_MAP, EMPTY_OBJECT } from '@simpreact/shared';

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
  contextMap: Nullable<SimpContextMap>
): void {
  if (element.flag === 'TEXT') {
    mountTextElement(element, parentReference, nextReference);
  } else if (element.flag === 'HOST') {
    mountHostElement(element, parentReference, nextReference, contextMap);
  } else if (element.flag === 'FC') {
    mountFunctionalElement(element, parentReference, nextReference, contextMap);
  } else if (element.flag === 'FRAGMENT') {
    mountFragment(element, parentReference, nextReference, contextMap);
  } else if (element.flag === 'PROVIDER') {
    mountProvider(element, parentReference, nextReference, contextMap);
  } else if (element.flag === 'PORTAL') {
    mountPortal(element, parentReference, nextReference, contextMap);
  } else {
    mountConsumer(element, parentReference, nextReference, contextMap);
  }
}

export function mountTextElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>
): void {
  const reference = (element.reference ||= hostAdapter.createTextReference(element.children as string));

  hostAdapter.attachElementToReference(element, reference);

  if (parentReference != null) {
    hostAdapter.insertOrAppend(parentReference, reference, nextReference);
  }
}

export function mountHostElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
) {
  const props = element.props;
  const className = element.className;
  const hostReference = (element.reference = hostAdapter.createReference(element.type as string));

  hostAdapter.attachElementToReference(element, hostReference);

  if (props != null) {
    hostAdapter.mountProps(hostReference, props, null, element);
  }

  if (className != null && className !== '') {
    hostAdapter.setClassname(hostReference, className);
  }

  // HOST element always has Maybe<Many<SimpElement>> children due to normalization process.
  const children = element.children as Maybe<Many<SimpElement>>;

  if (Array.isArray(children)) {
    mountArrayChildren(children, hostReference, null, contextMap, element);
  } else if (children != null) {
    children.parent = element;
    mount(children, hostReference, null, contextMap);
  }

  if (parentReference != null) {
    hostAdapter.insertOrAppend(parentReference, hostReference, nextReference);
  }

  applyRef(element);
}

export function mountFunctionalElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  const type = element.type as FC;
  let children;

  if (contextMap) {
    element.contextMap = contextMap;
  }

  lifecycleEventBus.publish({ type: 'beforeRender', element });
  children = normalizeRoot(type(element.props || EMPTY_OBJECT));
  lifecycleEventBus.publish({ type: 'afterRender' });

  if (children != null) {
    children.parent = element;
    mount((element.children = children), parentReference, nextReference, contextMap);
  }

  lifecycleEventBus.publish({ type: 'mounted', element });
}

export function mountFragment(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  // FRAGMENT element always has Maybe<Many<SimpElement>> children due to normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(element.children as SimpElement[], parentReference, nextReference, contextMap, element);
  } else if (element.children != null) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, parentReference, nextReference, contextMap);
  }
}

export function mountArrayChildren(
  children: SimpElement[],
  reference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  parentElement: SimpElement
): void {
  for (const child of children) {
    child.parent = parentElement;
    mount(child, reference, nextReference, contextMap);
  }
}

export function mountProvider(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  contextMap = new Map(contextMap);
  contextMap.set((element.type as any).context, element.props.value);

  // PROVIDER element always has Maybe<Many<SimpElement>> children due to normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(element.children as SimpElement[], parentReference, nextReference, contextMap, element);
  } else if (element.children != null) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, parentReference, nextReference, contextMap);
  }
}

export function mountConsumer(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  const children = normalizeRoot(
    (element.type as SimpContext<any>['Consumer'])(element.props || EMPTY_OBJECT, contextMap || EMPTY_MAP)
  );

  if (children == null) {
    return;
  }

  children.parent = element;
  mount((element.children = children), parentReference, nextReference, contextMap);
}

export function mountPortal(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  if (element.children) {
    (element.children as SimpElement).parent = element;
    mount(element.children as SimpElement, element.ref, null, contextMap);
  }

  const placeHolderElement = createTextElement('');

  mountTextElement(placeHolderElement, parentReference, nextReference);

  element.reference = placeHolderElement.reference;
}
