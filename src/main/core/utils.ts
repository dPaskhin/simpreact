import type { Nullable } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { SimpRenderRuntime } from './runtime.js';

export function bitScanForwardIndex(flag: number): number {
  const lsb = (flag & -flag) >>> 0;
  return 31 - Math.clz32(lsb);
}

export function isHostLike(flag: number): boolean {
  return (
    (flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
    (flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
    (flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
  );
}

export function findParentReferenceFromElement(element: SimpElement): unknown | null {
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

const placeStack: SimpElement[] = [];

export function placeElementBeforeAnchor(
  element: SimpElement,
  anchor: unknown,
  parentReference: unknown,
  renderRuntime: SimpRenderRuntime
): void {
  const { hostAdapter } = renderRuntime;
  placeStack.push(element);
  let nextAnchor: unknown | null = anchor;

  while (placeStack.length !== 0) {
    const current = placeStack.pop()!;

    if (isHostLike(current.flag)) {
      hostAdapter.insertOrAppend(parentReference, current.reference!, nextAnchor);
      nextAnchor = current.reference!;
      continue;
    }

    if (current.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const children = current.children as SimpElement[];
      for (let i = 0; i < children.length; i++) {
        placeStack.push(children[i]!);
      }
    } else if (current.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
      placeStack.push(current.children as SimpElement);
    }
  }
}

export function resolveAnchorReference(rightSibling: Nullable<SimpElement>): unknown | null {
  let current: Nullable<SimpElement> = rightSibling;

  while (current != null) {
    const reference = findHostReferenceFromElement(current);
    if (reference != null) {
      return reference;
    }
    current = findNextLogicalElement(current);
  }

  return null;
}

export function findHostReferenceFromElement(element: Nullable<SimpElement>): unknown | null {
  if (element == null) {
    return null;
  }

  const stack: Array<SimpElement> = [element];

  while (stack.length) {
    const node = stack.pop();

    if (node == null) {
      continue;
    }

    if (isHostLike(node.flag)) {
      return node.reference;
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

function findNextLogicalElement(element: SimpElement): Nullable<SimpElement> {
  let current: SimpElement = element;

  while (true) {
    const parent = current.parent as Nullable<SimpElement>;

    if (parent == null || isHostLike(parent.flag)) {
      return null;
    }

    if (parent.childFlag !== SIMP_ELEMENT_CHILD_FLAG_LIST) {
      current = parent;
      continue;
    }

    const nextSibling = (parent.children as SimpElement[])[current.index + 1];

    if (nextSibling != null) {
      return nextSibling;
    }

    current = parent;
  }
}

export function getLongestIncreasingSubsequenceIndexes(sequence: Int32Array): Int32Array {
  const predecessors = new Int32Array(sequence.length);
  const result: number[] = [];

  predecessors.fill(-1);

  for (let i = 0; i < sequence.length; i++) {
    const value = sequence[i]!;

    if (value === 0) {
      continue;
    }

    const lastResultIndex = result[result.length - 1];

    if (lastResultIndex == null || sequence[lastResultIndex]! < value) {
      if (lastResultIndex != null) {
        predecessors[i] = lastResultIndex;
      }

      result.push(i);
      continue;
    }

    let start = 0;
    let end = result.length - 1;

    while (start < end) {
      const middle = (start + end) >> 1;

      if (sequence[result[middle]!]! < value) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }

    if (value < sequence[result[start]!]!) {
      if (start > 0) {
        predecessors[i] = result[start - 1]!;
      }

      result[start] = i;
    }
  }

  let resultIndex = result.length;
  let sequenceIndex = result[resultIndex - 1] ?? -1;
  const indexes = new Int32Array(resultIndex);

  while (resultIndex-- > 0) {
    indexes[resultIndex] = sequenceIndex;
    sequenceIndex = predecessors[sequenceIndex]!;
  }

  return indexes;
}
