import type { Many } from '../types';
import { createElement, SIMP_ELEMENT_TYPE } from './createElement';
import { createFragmentElement } from './fragment';
import type { SimpElement, SimpNode } from './types';
import { TEXT_TYPE } from './constants';

export function normalizeChildren(
  children: SimpNode,
  forcePrimitiveElement = false,
  depth = false
): Many<SimpElement> | null {
  if (children == null || typeof children === 'boolean') {
    return null;
  }

  if (typeof children === 'number' || typeof children === 'string') {
    return depth || forcePrimitiveElement ? createElement(TEXT_TYPE, null, children) : null;
  }

  if (typeof children === 'object' && !Array.isArray(children)) {
    if (children.$$typeof === SIMP_ELEMENT_TYPE) {
      return children;
    } else {
      throw new TypeError('Objects are not valid as a child');
    }
  }

  if (depth) {
    return createFragmentElement(children);
  }

  let res: SimpElement[] = [];

  for (let child of children) {
    depth = true;
    child = normalizeChildren(child, forcePrimitiveElement, true);

    if (child) {
      res.push(child as SimpElement);
    }
  }

  return res;
}
