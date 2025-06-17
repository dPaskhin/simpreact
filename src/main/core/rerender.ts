import type { SimpElement } from './createElement';
import { findHostReferenceFromElement, updateFunctionalComponent } from './patching';
import type { HostReference } from './hostAdapter';
import { hostAdapter } from './hostAdapter';

export function rerender(element: SimpElement) {
  updateFunctionalComponent(
    element,
    hostAdapter.findParentReference(findHostReferenceFromElement(element)) as HostReference,
    null,
    element.contextMap || null
  );
}
