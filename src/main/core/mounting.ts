import type { Many, Maybe, Nullable } from '../shared';
import { EMPTY_MAP, EMPTY_OBJECT } from '../shared';
import { GLOBAL } from './global';
import type { HostReference } from './hostAdapter';
import type { FC, SimpElement } from './createElement';
import { normalizeRoot } from './createElement';
import type { SimpContext, SimpContextMap } from './context';

export function mount<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
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

export function mountTextElement<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>
): void {
  const reference = (element.reference ||= GLOBAL.hostAdapter.createTextReference(element.children as string));

  if (parentReference != null) {
    GLOBAL.hostAdapter.insertOrAppend(parentReference as HostReference, reference, nextReference as HostReference);
  }
}

export function mountHostElement<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
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
    GLOBAL.hostAdapter.insertOrAppend(parentReference as HostReference, hostReference, nextReference as HostReference);
  }

  GLOBAL.hostAdapter.mountProps(hostReference, props);
}

export function mountFunctionalElement<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
  contextMap: Nullable<SimpContextMap>
): void {
  const type = element.type as FC;
  element.contextMap = contextMap;

  GLOBAL.eventBus.publish({ type: 'beforeRender', element });
  element.children = normalizeRoot(type(element.props || EMPTY_OBJECT));
  GLOBAL.eventBus.publish({ type: 'afterRender' });

  mount(element.children, parentReference, nextReference, contextMap);

  GLOBAL.eventBus.publish({ type: 'mounted', element });
}

export function mountFragment<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
  contextMap: Nullable<SimpContextMap>
): void {
  // FRAGMENT element always has Maybe<Many<SimpElement>> children due to normalization process.
  const children = element.children as Maybe<Many<SimpElement>>;

  if (Array.isArray(children)) {
    mountArrayChildren(children, parentReference as HostReference, nextReference as HostReference, contextMap);
  } else if (children != null) {
    mount(children, parentReference, nextReference, contextMap);
  }
}

export function mountArrayChildren<HostRef = HostReference>(
  children: SimpElement[],
  reference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
  contextMap: Nullable<SimpContextMap>
): void {
  for (const child of children) {
    mount(child, reference, nextReference, contextMap);
  }
}

export function mountProvider<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
  contextMap: Nullable<SimpContextMap>
): void {
  // PROVIDER element always has Maybe<Many<SimpElement>> children due to normalization process.
  const children = element.children as Maybe<Many<SimpElement>>;

  contextMap = new Map(contextMap);

  contextMap.set((element.type as any).context, element.props.value);

  if (Array.isArray(children)) {
    mountArrayChildren(children, parentReference as HostReference, nextReference as HostReference, contextMap);
  } else if (children != null) {
    mount(children, parentReference, nextReference, contextMap);
  }
}

export function mountConsumer<HostRef = HostReference>(
  element: SimpElement,
  parentReference: Nullable<HostRef>,
  nextReference: Nullable<HostRef>,
  contextMap: Nullable<SimpContextMap>
): void {
  element.children = normalizeRoot(
    (element.type as SimpContext<any>['Consumer'])(element.props || EMPTY_OBJECT, contextMap || EMPTY_MAP)
  );

  mount(element.children, parentReference, nextReference, contextMap);
}
