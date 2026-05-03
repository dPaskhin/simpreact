import type { Many } from '../shared/index.js';
import {
  type Key,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationPlaceElement } from './hostOperations.js';
import { _pushMountEnterFrame } from './mounting.js';
import { _pushMountChildrenFrame } from './mountingChildren.js';
import { _pushPatchEnterFrame } from './patching.js';
import {
  PATCH_CHILDREN,
  PATCH_KEYED_CHILDREN,
  type PatchChildrenFrame,
  type PatchChildrenFrameMeta,
} from './processStack.js';
import { _remove } from './unmounting.js';
import { _pushUnmountChildrenFrame } from './unmountingChildren.js';
import { getLongestIncreasingSubsequenceIndexes, isHostLike } from './utils.js';

export function _pushPatchChildrenFrame(parent: SimpElement, meta: PatchChildrenFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: parent,
    kind: PATCH_CHILDREN,
    meta,
  });
}

export function _pushPatchKeyedChildrenFrame(element: SimpElement, meta: PatchChildrenFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: PATCH_KEYED_CHILDREN,
    meta,
  });
}

export function _patchChildren(frame: PatchChildrenFrame): void {
  const parentElement = frame.node;
  const {
    renderRuntime,
    parentReference,
    context,
    hostNamespace,
    nextChildren,
    prevChildren,
    prevParentChildFlag,
    nextParentChildFlag,
    prevParentElement,
  } = frame.meta;

  const subtreeRightBoundary = isHostLike(parentElement.flag) ? null : frame.meta.subtreeRightBoundary;

  switch (prevParentChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = parentElement;
          }

          _pushPatchKeyedChildrenFrame(parentElement, {
            prevChildren,
            nextChildren,
            subtreeRightBoundary,
            prevParentChildFlag,
            nextParentChildFlag,
            context,
            parentReference,
            hostNamespace,
            renderRuntime,
            prevParentElement,
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;
          _pushPatchKeyedChildrenFrame(parentElement, {
            prevChildren,
            nextChildren,
            subtreeRightBoundary,
            prevParentChildFlag,
            nextParentChildFlag,
            context,
            parentReference,
            hostNamespace,
            renderRuntime,
            prevParentElement,
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountChildrenFrame(prevParentElement, frame.meta);
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
          break;
        }
        default: {
          _pushUnmountChildrenFrame(prevParentElement, frame.meta);
          renderRuntime.hostAdapter.clearNode(parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            child.parent = parentElement;
          }

          _pushPatchKeyedChildrenFrame(parentElement, {
            prevChildren,
            nextChildren,
            subtreeRightBoundary,
            prevParentChildFlag,
            nextParentChildFlag,
            context,
            parentReference,
            hostNamespace,
            renderRuntime,
            prevParentElement,
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;

          _pushPatchEnterFrame(nextChildren as SimpElement, {
            prevElement: prevChildren as SimpElement,
            parentReference,
            renderRuntime,
            subtreeRightBoundary: subtreeRightBoundary,
            context,
            hostNamespace,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountChildrenFrame(prevParentElement, frame.meta);
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
          break;
        }
        default: {
          _remove(prevChildren as SimpElement, parentReference, renderRuntime);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          _pushMountChildrenFrame(parentElement, {
            children: parentElement.children as SimpElement[],
            context,
            hostNamespace,
            renderRuntime,
            subtreeRightBoundary,
            parentReference,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          (nextChildren as SimpElement).parent = parentElement;
          _pushMountEnterFrame(nextChildren as SimpElement, {
            parentReference,
            subtreeRightBoundary: subtreeRightBoundary,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          const prevChildren = prevParentElement.props?.children;
          const nextChildren = parentElement.props?.children;
          if (prevChildren !== nextChildren) {
            renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string, true);
          }
        }
      }
      break;
    }
    default: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          _pushMountChildrenFrame(parentElement, {
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace,
            renderRuntime,
            children: parentElement.children as SimpElement[],
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;

          _pushMountEnterFrame(nextChildren as SimpElement, {
            parentReference,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
            subtreeRightBoundary: subtreeRightBoundary,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
        }
      }
    }
  }
}

export function _patchKeyedChildren(frame: PatchChildrenFrame): void {
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame.meta;

  const nextChildren = frame.meta.nextChildren as Many<SimpElement>;
  const prevChildren = frame.meta.prevChildren as Many<SimpElement>;

  const nextLen = Array.isArray(nextChildren) ? nextChildren.length : 1;
  const prevLen = Array.isArray(prevChildren) ? prevChildren.length : 1;

  const base = {
    parentReference,
    renderRuntime,
    context,
    hostNamespace,
    placeHolderElement: null,
  } as const;

  const getRightSibling = (child: SimpElement): SimpElement | null => {
    return child.index + 1 < nextLen ? getChild(nextChildren, child.index + 1) : subtreeRightBoundary;
  };

  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevLen - 1;
  let nextEnd = nextLen - 1;

  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    getChild(prevChildren, prevStart).key === getChild(nextChildren, nextStart).key
  ) {
    prevStart++;
    nextStart++;
  }

  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    getChild(prevChildren, prevEnd).key === getChild(nextChildren, nextEnd).key
  ) {
    prevEnd--;
    nextEnd--;
  }

  const pushPrefixPatches = (): void => {
    for (let i = 0; i < nextStart; i++) {
      const nextChild = getChild(nextChildren, i);
      const prevChild = getChild(prevChildren, nextChild.index);

      _pushPatchEnterFrame(nextChild, {
        ...base,
        prevElement: prevChild,
        subtreeRightBoundary: getRightSibling(nextChild),
      });
    }
  };

  const pushSuffixPatches = (): void => {
    const delta = nextLen - prevLen;

    for (let i = nextEnd + 1; i < nextLen; i++) {
      const nextChild = getChild(nextChildren, i);
      const prevChild = getChild(prevChildren, nextChild.index - delta);

      _pushPatchEnterFrame(nextChild, {
        ...base,
        prevElement: prevChild,
        subtreeRightBoundary: getRightSibling(nextChild),
      });
    }
  };

  if (nextStart > nextEnd) {
    pushPrefixPatches();

    for (let i = prevStart; i <= prevEnd; i++) {
      _remove(getChild(prevChildren, i), parentReference, renderRuntime);
    }

    pushSuffixPatches();
    return;
  }

  if (prevStart > prevEnd) {
    pushPrefixPatches();

    for (let i = nextStart; i <= nextEnd; i++) {
      const nextChild = getChild(nextChildren, i);

      _pushMountEnterFrame(nextChild, {
        ...base,
        subtreeRightBoundary: getRightSibling(nextChild),
      });
    }

    pushSuffixPatches();
    return;
  }

  const keyToPrevChild = new Map<Key, SimpElement>();

  for (let i = prevStart; i <= prevEnd; i++) {
    const prevChild = getChild(prevChildren, i);
    const key = prevChild.key;

    if (key != null) {
      keyToPrevChild.set(key, prevChild);
    }
  }

  const middleLen = nextEnd - nextStart + 1;
  const newIndexToOldIndex = new Int32Array(middleLen);

  let moved = false;
  let maxPrevIndexSoFar = -1;

  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = getChild(nextChildren, i);
    const prevChild = keyToPrevChild.get(nextChild.key!);

    if (prevChild != null) {
      const prevIndex = prevChild.index;

      newIndexToOldIndex[nextChild.index - nextStart] = prevIndex + 1;

      if (prevIndex < maxPrevIndexSoFar) {
        moved = true;
      } else {
        maxPrevIndexSoFar = prevIndex;
      }
    }
  }

  pushPrefixPatches();

  const matchedPrev = new Uint8Array(prevEnd - prevStart + 1);

  for (let i = 0; i < middleLen; i++) {
    const oldIndex = newIndexToOldIndex[i];

    if (oldIndex !== 0) {
      matchedPrev[oldIndex! - 1 - prevStart] = 1;
    }
  }

  for (let i = prevStart; i <= prevEnd; i++) {
    if (!matchedPrev[i - prevStart]) {
      _remove(getChild(prevChildren, i), parentReference, renderRuntime);
    }
  }

  const stableNewIndexes = moved ? getLongestIncreasingSubsequenceIndexes(newIndexToOldIndex) : new Int32Array(0);
  let stableCursor = 0;

  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = getChild(nextChildren, i);
    const newIndex = nextChild.index - nextStart;
    const oldIndex = newIndexToOldIndex[newIndex];

    if (oldIndex === 0) {
      _pushMountEnterFrame(nextChild, {
        ...base,
        subtreeRightBoundary: getRightSibling(nextChild),
      });
      continue;
    }

    const prevChild = getChild(prevChildren, oldIndex! - 1);
    const isStable = moved && stableNewIndexes[stableCursor] === newIndex;

    if (isStable) {
      stableCursor++;
    } else if (moved) {
      _pushHostOperationPlaceElement(nextChild, {
        parentReference,
        renderRuntime,
        subtreeRightBoundary: getRightSibling(nextChild),
      });
    }

    _pushPatchEnterFrame(nextChild, {
      ...base,
      prevElement: prevChild,
      subtreeRightBoundary: null,
    });
  }

  pushSuffixPatches();
}

function getChild(children: Many<SimpElement>, index: number): SimpElement {
  return Array.isArray(children) ? children[index]! : children;
}
