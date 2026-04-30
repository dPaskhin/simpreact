import {
  type Key,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationPlaceElement } from './hostOperations.js';
import { _pushMountArrayChildrenFrame, _pushMountEnterFrame } from './mounting.js';
import { _pushPatchEnterFrame } from './patching.js';
import { PATCH_CHILDREN, PATCH_KEYED_CHILDREN, type PatchChildrenFrame, type PatchFrameMeta } from './processStack.js';
import {
  _clearElementHostReference,
  _pushUnmountArrayChildrenFrame,
  _pushUnmountEnterFrame,
  _remove,
} from './unmounting.js';
import { getLongestIncreasingSubsequenceIndexes } from './utils.js';

export function _pushPatchChildrenFrame(element: SimpElement, meta: PatchFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: PATCH_CHILDREN,
    meta,
  });
}

export function _pushPatchKeyedChildrenFrame(element: SimpElement, meta: PatchFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: PATCH_KEYED_CHILDREN,
    meta,
  });
}

export function _patchChildren(frame: PatchChildrenFrame): void {
  const nextElement = frame.node;
  const { renderRuntime, rightSibling, parentReference, context, hostNamespace, placeHolderElement, prevElement } =
    frame.meta;
  const nextChildFlag = nextElement.childFlag;
  const prevChildFlag = prevElement.childFlag;
  let nextChildren = nextElement.children;
  let prevChildren = prevElement.children;

  switch (prevChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = nextElement;
          }

          _pushPatchKeyedChildrenFrame(frame.node, {
            prevElement,
            context,
            parentReference,
            rightSibling,
            hostNamespace,
            placeHolderElement,
            renderRuntime,
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          if (prevElement.flag & SIMP_ELEMENT_FLAG_FRAGMENT) {
            _clearElementHostReference(prevElement, parentReference, renderRuntime);
          } else {
            renderRuntime.hostAdapter.clearNode(parentReference);
          }

          _pushMountEnterFrame(nextChildren as SimpElement, {
            parentReference,
            rightSibling,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
          });

          _pushUnmountArrayChildrenFrame(prevElement, renderRuntime);

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountArrayChildrenFrame(prevElement, renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, nextElement.props?.children);
          break;
        }
        default: {
          _pushUnmountArrayChildrenFrame(prevElement, renderRuntime);
          renderRuntime.hostAdapter.clearNode(parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          _pushUnmountEnterFrame(prevChildren as SimpElement, renderRuntime);
          _pushMountArrayChildrenFrame(nextElement, {
            parentReference,
            renderRuntime,
            rightSibling,
            context,
            hostNamespace,
            placeHolderElement: null,
          });
          _clearElementHostReference(prevChildren as SimpElement, parentReference, renderRuntime);

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = nextElement;

          _pushPatchEnterFrame(nextChildren as SimpElement, {
            prevElement: prevChildren as SimpElement,
            parentReference,
            renderRuntime,
            rightSibling,
            context,
            hostNamespace,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountArrayChildrenFrame(prevElement, renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, nextElement.props?.children);
          break;
        }
        default: {
          _remove(prevChildren as SimpElement, parentReference, renderRuntime);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          _pushMountArrayChildrenFrame(nextElement, {
            parentReference,
            renderRuntime,
            rightSibling,
            context,
            hostNamespace,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          (nextChildren as SimpElement).parent = nextElement;
          _pushMountEnterFrame(nextChildren as SimpElement, {
            parentReference,
            rightSibling,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          prevChildren = prevElement.props?.children;
          nextChildren = nextElement.props?.children;
          if (prevChildren !== nextChildren) {
            renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string, true);
          }
        }
      }
      break;
    }
    default: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          _pushMountArrayChildrenFrame(nextElement, {
            parentReference,
            rightSibling,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = nextElement;

          _pushMountEnterFrame(nextChildren as SimpElement, {
            parentReference,
            rightSibling,
            context,
            hostNamespace,
            renderRuntime,
            placeHolderElement: null,
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          renderRuntime.hostAdapter.setTextContent(parentReference, nextElement.props?.children);
        }
      }
    }
  }
}

export function _patchKeyedChildren(frame: PatchChildrenFrame): void {
  const { node: nextElement, meta } = frame;
  const { renderRuntime, parentReference, prevElement, context, hostNamespace } = meta;

  const nextChildren = nextElement.children as SimpElement[];
  const prevChildren = prevElement.children as SimpElement[];

  const nextLen = nextChildren.length;
  const prevLen = prevChildren.length;

  const base = {
    parentReference,
    renderRuntime,
    context,
    hostNamespace,
    placeHolderElement: null,
  } as const;

  const getRightSibling = (child: SimpElement): SimpElement | null => {
    return nextChildren[child.index + 1] ?? null;
  };

  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevLen - 1;
  let nextEnd = nextLen - 1;

  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    prevChildren[prevStart]!.key === nextChildren[nextStart]!.key
  ) {
    prevStart++;
    nextStart++;
  }

  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    prevEnd--;
    nextEnd--;
  }

  const pushPrefixPatches = (): void => {
    for (let i = 0; i < nextStart; i++) {
      const nextChild = nextChildren[i]!;
      const prevChild = prevChildren[nextChild.index]!;

      _pushPatchEnterFrame(nextChild, {
        ...base,
        prevElement: prevChild,
        rightSibling: getRightSibling(nextChild),
      });
    }
  };

  const pushSuffixPatches = (): void => {
    const delta = nextLen - prevLen;

    for (let i = nextEnd + 1; i < nextLen; i++) {
      const nextChild = nextChildren[i]!;
      const prevChild = prevChildren[nextChild.index - delta]!;

      _pushPatchEnterFrame(nextChild, {
        ...base,
        prevElement: prevChild,
        rightSibling: getRightSibling(nextChild),
      });
    }
  };

  if (nextStart > nextEnd) {
    pushPrefixPatches();

    for (let i = prevStart; i <= prevEnd; i++) {
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }

    pushSuffixPatches();
    return;
  }

  if (prevStart > prevEnd) {
    pushPrefixPatches();

    for (let i = nextStart; i <= nextEnd; i++) {
      const nextChild = nextChildren[i]!;

      _pushMountEnterFrame(nextChild, {
        ...base,
        rightSibling: getRightSibling(nextChild),
      });
    }

    pushSuffixPatches();
    return;
  }

  const keyToPrevChild = new Map<Key, SimpElement>();

  for (let i = prevStart; i <= prevEnd; i++) {
    const prevChild = prevChildren[i]!;
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
    const nextChild = nextChildren[i]!;
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
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }
  }

  const stableNewIndexes = moved ? getLongestIncreasingSubsequenceIndexes(newIndexToOldIndex) : new Int32Array(0);
  let stableCursor = 0;

  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = nextChildren[i]!;
    const newIndex = nextChild.index - nextStart;
    const oldIndex = newIndexToOldIndex[newIndex];

    if (oldIndex === 0) {
      _pushMountEnterFrame(nextChild, {
        ...base,
        rightSibling: getRightSibling(nextChild),
      });
      continue;
    }

    const prevChild = prevChildren[oldIndex! - 1]!;
    const isStable = moved && stableNewIndexes[stableCursor] === newIndex;

    if (isStable) {
      stableCursor++;
    } else if (moved) {
      _pushHostOperationPlaceElement(nextChild, {
        parentReference,
        renderRuntime,
        rightSibling: getRightSibling(nextChild),
      });
    }

    _pushPatchEnterFrame(nextChild, {
      ...base,
      prevElement: prevChild,
      rightSibling: null,
    });
  }

  pushSuffixPatches();
}
