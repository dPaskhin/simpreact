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

export function bitScanForwardIndex(flag: number): number {
  const lsb = (flag & -flag) >>> 0;
  return 31 - Math.clz32(lsb);
}

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

export function findHostReferenceFromElement(element: Nullable<SimpElement>): HostReference {
  if (element == null) {
    return null;
  }

  const stack: Array<SimpElement> = [element];

  while (stack.length) {
    const node = stack.pop();

    if (node == null) {
      continue;
    }

    const flag = node.flag;

    if (
      (flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      return node.reference as HostReference;
    }

    if (node.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const list = node.children as SimpElement[];
      for (let i = list.length - 1; i >= 0; i--) {
        stack.push(list[i]!);
      }
    } else if (node.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
      stack.push(node.children as SimpElement);
    }
  }

  return null;
}
