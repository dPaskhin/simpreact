import type { Many, Maybe, Nullable } from '../shared/index.js';
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
import type { SimpRenderRuntime } from './runtime.js';
import { _pushUnmountEnterFrame } from './unmounting.js';
import { _pushUnmountChildrenFrame } from './unmountingChildren.js';
import { _clearElementHostReference, getLongestIncreasingSubsequenceIndexes, isHostLike } from './utils.js';

export interface PatchChildrenArgs {
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
  nextChildren: Nullable<Many<SimpElement>>;
  prevChildren: Nullable<Many<SimpElement>>;
  prevParentChildFlag: number;
  nextParentChildFlag: number;
  prevParentElement: SimpElement;
}

export function _patchChildren(parentElement: SimpElement, meta: PatchChildrenArgs): void {
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
  } = meta;

  const subtreeRightBoundary = isHostLike(parentElement.flag) ? null : meta.subtreeRightBoundary;

  switch (prevParentChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = parentElement;
          }

          _patchKeyedChildren(parentElement, {
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
          _patchKeyedChildren(parentElement, {
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
          _pushUnmountChildrenFrame(prevParentElement, renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
          break;
        }
        default: {
          _pushUnmountChildrenFrame(prevParentElement, renderRuntime);
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

          _patchKeyedChildren(parentElement, {
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

          _pushPatchEnterFrame(
            nextChildren as SimpElement,
            renderRuntime,
            prevChildren as SimpElement,
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountChildrenFrame(prevParentElement, renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
          break;
        }
        default: {
          _clearElementHostReference(prevChildren as SimpElement, parentReference, renderRuntime);
          _pushUnmountEnterFrame(prevChildren as SimpElement, renderRuntime);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          _pushMountChildrenFrame(
            parentElement,
            renderRuntime,
            parentElement.children as SimpElement[],
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          (nextChildren as SimpElement).parent = parentElement;
          _pushMountEnterFrame(
            nextChildren as SimpElement,
            renderRuntime,
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace,
            null
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          const prevText = prevParentElement.props?.children;
          const nextText = parentElement.props?.children;
          if (prevText !== nextText) {
            renderRuntime.hostAdapter.setTextContent(parentReference, nextText as string, true);
          }
        }
      }
      break;
    }
    default: {
      switch (nextParentChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          _pushMountChildrenFrame(
            parentElement,
            renderRuntime,
            parentElement.children as SimpElement[],
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;

          _pushMountEnterFrame(
            nextChildren as SimpElement,
            renderRuntime,
            parentReference,
            subtreeRightBoundary,
            context,
            hostNamespace,
            null
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          renderRuntime.hostAdapter.setTextContent(parentReference, parentElement.props?.children);
        }
      }
    }
  }
}

export function _patchKeyedChildren(parentElement: SimpElement, meta: PatchChildrenArgs): void {
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = meta;

  const nextChildren = meta.nextChildren as Many<SimpElement>;
  const prevChildren = meta.prevChildren as Many<SimpElement>;

  const nextLen = Array.isArray(nextChildren) ? nextChildren.length : 1;
  const prevLen = Array.isArray(prevChildren) ? prevChildren.length : 1;

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

      _pushPatchEnterFrame(
        nextChild,
        renderRuntime,
        prevChild,
        parentReference,
        getRightSibling(nextChild),
        context,
        hostNamespace
      );
    }
  };

  const pushSuffixPatches = (): void => {
    const delta = nextLen - prevLen;

    for (let i = nextEnd + 1; i < nextLen; i++) {
      const nextChild = getChild(nextChildren, i);
      const prevChild = getChild(prevChildren, nextChild.index - delta);

      _pushPatchEnterFrame(
        nextChild,
        renderRuntime,
        prevChild,
        parentReference,
        getRightSibling(nextChild),
        context,
        hostNamespace
      );
    }
  };

  if (nextStart > nextEnd) {
    pushPrefixPatches();

    for (let i = prevStart; i <= prevEnd; i++) {
      const child = getChild(prevChildren, i);

      _clearElementHostReference(child, parentReference, renderRuntime);
      _pushUnmountEnterFrame(child, renderRuntime);
    }

    pushSuffixPatches();
    return;
  }

  if (prevStart > prevEnd) {
    pushPrefixPatches();

    for (let i = nextStart; i <= nextEnd; i++) {
      const nextChild = getChild(nextChildren, i);

      _pushMountEnterFrame(
        nextChild,
        renderRuntime,
        parentReference,
        getRightSibling(nextChild),
        context,
        hostNamespace,
        null
      );
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
      const child = getChild(prevChildren, i);

      _clearElementHostReference(child, parentReference, renderRuntime);
      _pushUnmountEnterFrame(child, renderRuntime);
    }
  }

  const stableNewIndexes = moved ? getLongestIncreasingSubsequenceIndexes(newIndexToOldIndex) : new Int32Array(0);
  let stableCursor = 0;

  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = getChild(nextChildren, i);
    const newIndex = nextChild.index - nextStart;
    const oldIndex = newIndexToOldIndex[newIndex];

    if (oldIndex === 0) {
      _pushMountEnterFrame(
        nextChild,
        renderRuntime,
        parentReference,
        getRightSibling(nextChild),
        context,
        hostNamespace,
        null
      );
      continue;
    }

    const prevChild = getChild(prevChildren, oldIndex! - 1);
    const isStable = moved && stableNewIndexes[stableCursor] === newIndex;

    if (isStable) {
      stableCursor++;
    } else if (moved) {
      _pushHostOperationPlaceElement(nextChild, renderRuntime, parentReference, getRightSibling(nextChild));
    }

    _pushPatchEnterFrame(nextChild, renderRuntime, prevChild, parentReference, null, context, hostNamespace);
  }

  pushSuffixPatches();
}

function getChild(children: Many<SimpElement>, index: number): SimpElement {
  return Array.isArray(children) ? children[index]! : children;
}
