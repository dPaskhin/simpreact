import { createElement } from './createElement';
import type { SimpElement } from './types';

export function createRootElement<Element extends SimpElement, Reference = {}>(
  element: Element,
  reference: Reference
): SimpElement {
  element._parent = createElement('ROOT', null);

  element._parent._reference = reference;
  element._parent._children = element;

  return element;
}
