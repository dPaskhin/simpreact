import type { Maybe, Nullable } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_EMPTY,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_FC,
  SIMP_ELEMENT_FLAG_FRAGMENT,
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

export function placeElementBeforeAnchor(
  element: SimpElement,
  anchor: unknown,
  parentReference: unknown,
  renderRuntime: SimpRenderRuntime
): void {
  const { hostAdapter } = renderRuntime;
  const placeStack: SimpElement[] = [element];
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

export function resolveAnchorReference(subtreeRightBoundary: Nullable<SimpElement>): unknown | null {
  let current: Nullable<SimpElement> = subtreeRightBoundary;

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
  const n = sequence.length;
  const predecessors = new Int32Array(n);
  predecessors.fill(-1);
  const result = new Int32Array(n);
  let resultLen = 0;

  for (let i = 0; i < n; i++) {
    const value = sequence[i]!;

    if (value === 0) {
      continue;
    }

    if (resultLen === 0 || sequence[result[resultLen - 1]!]! < value) {
      if (resultLen > 0) {
        predecessors[i] = result[resultLen - 1]!;
      }

      result[resultLen++] = i;
      continue;
    }

    let start = 0;
    let end = resultLen - 1;

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

  let resultIndex = resultLen;
  let sequenceIndex = resultLen > 0 ? result[resultLen - 1]! : -1;
  const indexes = new Int32Array(resultIndex);

  while (resultIndex-- > 0) {
    indexes[resultIndex] = sequenceIndex;
    sequenceIndex = predecessors[sequenceIndex]!;
  }

  return indexes;
}

export function detachElementFromParent(element: SimpElement): void {
  const parent = element.parent;
  if (!parent) return;

  if (parent.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
    const list = parent.children as SimpElement[];
    list.splice(element.index, 1);

    if (list.length === 1) {
      parent.children = list[0];
      parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
    } else {
      for (let i = element.index; i < list.length; i++) {
        list[i]!.index = i;
      }
    }
  } else {
    parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
    parent.children = null;
  }
}

export function clearElementHostReference(
  element: Maybe<SimpElement>,
  parentHostReference: unknown,
  renderRuntime: SimpRenderRuntime
): void {
  while (element != null) {
    if (isHostLike(element.flag)) {
      renderRuntime.hostAdapter.removeChild(parentHostReference, element.reference!);
      return;
    }
    const children = element.children;
    const childFlag = element.childFlag;

    if ((element.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
      element = children as SimpElement;
      continue;
    }
    if ((element.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0) {
      switch (childFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST:
          for (let i = 0, len = (children as SimpElement[]).length; i < len; ++i) {
            clearElementHostReference((children as SimpElement[])[i], parentHostReference, renderRuntime);
          }
          return;
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
          element = children as SimpElement;
      }
    }
  }
}
