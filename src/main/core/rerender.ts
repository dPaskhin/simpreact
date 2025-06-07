import type { SimpElement } from './createElement';
import { findHostReferenceFromElement, updateFunctionalComponent } from './patching';
import { GLOBAL } from './global';
import type { HostReference } from './hostAdapter';

export function rerender(element: SimpElement) {
  updateFunctionalComponent(
    element,
    GLOBAL.hostAdapter.findParentReference(findHostReferenceFromElement(element)) as HostReference,
    null,
    element.contextMap || null
  );
}
