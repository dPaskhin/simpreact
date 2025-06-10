import type { Many, Maybe, Nullable } from '../shared';
import { EMPTY_MAP, EMPTY_OBJECT } from '../shared';
import { GLOBAL } from './global';
import type { HostReference } from './hostAdapter';
import type { FC, SimpElement } from './createElement';
import { normalizeRoot } from './createElement';
import type { SimpContext, SimpContextMap } from './context';

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
  } else {
    mountConsumer(element, parentReference, nextReference, contextMap);
  }
}

export function mountTextElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>
): void {
  const reference = (element.reference ||= GLOBAL.hostAdapter.createTextReference(element.children as string));

  if (parentReference != null) {
    GLOBAL.hostAdapter.insertOrAppend(parentReference, reference, nextReference);
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
  const hostReference = (element.reference = GLOBAL.hostAdapter.createReference(element.type as string));
  // HOST element always has Maybe<Many<SimpElement>> children due to normalization process.
  const children = element.children as Maybe<Many<SimpElement>>;

  if (className != null && className !== '') {
    GLOBAL.hostAdapter.setClassname(hostReference, className);
  }

  if (Array.isArray(children)) {
    mountArrayChildren(children, hostReference, null, contextMap);
  } else if (children != null) {
    mount(children, hostReference, null, contextMap);
  }

  if (parentReference != null) {
    GLOBAL.hostAdapter.insertOrAppend(parentReference, hostReference, nextReference);
  }

  if (props != null) {
    GLOBAL.hostAdapter.mountProps(hostReference, props);
  }
}

export function mountFunctionalElement(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  const type = element.type as FC;
  let children;
  element.contextMap = contextMap;

  GLOBAL.eventBus.publish({ type: 'beforeRender', element });
  children = normalizeRoot(type(element.props || EMPTY_OBJECT));
  GLOBAL.eventBus.publish({ type: 'afterRender' });

  if (children != null) {
    mount((element.children = children), parentReference, nextReference, contextMap);
  }

  GLOBAL.eventBus.publish({ type: 'mounted', element });
}

export function mountFragment(
  element: SimpElement,
  parentReference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  // FRAGMENT element always has Maybe<Many<SimpElement>> children due to normalization process.
  if (Array.isArray(element.children)) {
    mountArrayChildren(element.children as SimpElement[], parentReference, nextReference, contextMap);
  } else if (element.children != null) {
    mount(element.children as SimpElement, parentReference, nextReference, contextMap);
  }
}

export function mountArrayChildren(
  children: SimpElement[],
  reference: Nullable<HostReference>,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  for (const child of children) {
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
    mountArrayChildren(element.children as SimpElement[], parentReference, nextReference, contextMap);
  } else if (element.children != null) {
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

  mount((element.children = children), parentReference, nextReference, contextMap);
}
