import type { Nullable } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';

export function findParentReferenceFromElement(element: SimpElement): HostReference {
  let flag: number;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if ((flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
      return temp.reference;
    }

    temp = temp.parent;
  }

  return null;
}

export function findHostReferenceFromElement(element: SimpElement, startEdge = true): HostReference {
  // Fast-path: null guard (if your call sites can pass null)
  if (element == null) {
    return null;
  }

  // Iterative DFS stack.
  // Order matters: we want to visit "edge-first".
  const stack: Array<SimpElement> = [element];

  while (stack.length) {
    const node = stack.pop();

    if (node == null) {
      continue;
    }

    const flag = node.flag;

    // Found a host-ish node => return its reference
    if (
      (flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      return node.reference as HostReference;
    }

    // Push children in the correct order for DFS.
    // We want the traversal to prefer the requested edge but still keep searching
    // if that edge is empty/null.
    if (node.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const list = node.children as SimpElement[];
      if (startEdge) {
        // left-to-right: push in reverse so index 0 is popped first
        for (let i = list.length - 1; i >= 0; i--) {
          stack.push(list[i]!);
        }
      } else {
        // right-to-left: push forward so the last index is popped first
        for (let i = 0; i < list.length; i++) {
          stack.push(list[i]!);
        }
      }
    } else if (node.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
      stack.push(node.children as SimpElement);
    }
  }

  return null;
}
