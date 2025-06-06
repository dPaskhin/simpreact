import type { SimpElement } from './createElement';
import { findHostReferenceFromElement, updateFunctionalComponent } from './patching';
import { GLOBAL } from './global';

export function rerender(element: SimpElement) {
  updateFunctionalComponent(
    element,
    GLOBAL.hostAdapter.findParentReference(findHostReferenceFromElement(element, true)!)!,
    null,
    element.contextMap || null
  );
}
