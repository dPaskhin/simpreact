import {
  type Key,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperation } from './hostOperations.js';
import { _pushMountArrayChildrenFrame, _pushMountFrame } from './mounting.js';
import { _pushPatchFrame } from './patching.js';
import {
  HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
  MOUNT_ENTER,
  PATCH_ENTER,
  PATCH_KEYED_CHILDREN,
  type RenderFrame,
  UNMOUNT_ENTER,
} from './processStack.js';
import {
  _clearElementHostReference,
  _pushUnmountArrayChildrenFrame,
  _pushUnmountFrame,
  _remove,
} from './unmounting.js';

export function _pushPatchChildrenFrame(frame: RenderFrame): void {
  frame.meta.renderRuntime.renderStack.push(frame);
}

export function _pushPatchKeyedChildrenFrame(frame: RenderFrame): void {
  frame.meta.renderRuntime.renderStack.push(frame);
}

export function _patchChildren(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { renderRuntime, rightSibling, parentReference, context, hostNamespace, placeHolderElement, prevElement } =
    frame.meta;
  const nextChildFlag = nextElement.childFlag;
  const prevChildFlag = prevElement!.childFlag;
  let nextChildren = nextElement.children;
  let prevChildren = prevElement!.children;

  switch (prevChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = nextElement;
          }

          _pushPatchKeyedChildrenFrame({
            node: frame.node,
            phase: PATCH_KEYED_CHILDREN,
            meta: {
              prevElement,
              context,
              parentReference,
              rightSibling,
              hostNamespace,
              placeHolderElement,
              renderRuntime,
            },
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          if (prevElement!.flag & SIMP_ELEMENT_FLAG_FRAGMENT) {
            _clearElementHostReference(prevElement, parentReference, renderRuntime);
          } else {
            renderRuntime.hostAdapter.clearNode(parentReference);
          }

          _pushMountFrame({
            node: nextChildren as SimpElement,
            phase: MOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });

          _pushUnmountArrayChildrenFrame({
            node: prevElement!,
            phase: UNMOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling: null,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountArrayChildrenFrame({
            node: prevElement!,
            phase: UNMOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling: null,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          renderRuntime.hostAdapter.setTextContent(parentReference, nextElement.props?.children);
          break;
        }
        default: {
          _pushUnmountArrayChildrenFrame({
            node: prevElement!,
            phase: UNMOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling: null,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          renderRuntime.hostAdapter.clearNode(parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          _pushUnmountFrame({
            node: prevChildren as SimpElement,
            phase: UNMOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling: null,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          _pushMountArrayChildrenFrame({
            node: nextElement,
            phase: MOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          _clearElementHostReference(prevChildren as SimpElement, parentReference, renderRuntime);

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = nextElement;

          _pushPatchFrame({
            node: nextChildren as SimpElement,
            phase: PATCH_ENTER,
            meta: {
              prevElement: prevChildren as SimpElement,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          _pushUnmountArrayChildrenFrame({
            node: prevElement!,
            phase: UNMOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling: null,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
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
          _pushMountArrayChildrenFrame({
            node: nextElement,
            phase: MOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          renderRuntime.hostAdapter.clearNode(parentReference);
          (nextChildren as SimpElement).parent = nextElement;
          _pushMountFrame({
            node: nextChildren as SimpElement,
            phase: MOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          prevChildren = prevElement!.props?.children;
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
          _pushMountArrayChildrenFrame({
            node: nextElement,
            phase: MOUNT_ENTER,
            meta: {
              parentReference,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
              renderRuntime,
              prevElement: null,
            },
          });
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = nextElement;

          _pushMountFrame({
            node: nextChildren as SimpElement,
            phase: MOUNT_ENTER,
            meta: {
              prevElement: null,
              parentReference,
              renderRuntime,
              rightSibling,
              context,
              hostNamespace,
              placeHolderElement: null,
            },
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

export function _patchKeyedChildren(frame: RenderFrame): void {
  const { node: nextElement, meta } = frame;
  const { renderRuntime, parentReference, prevElement, context, hostNamespace } = meta;

  const nextChildren = nextElement.children as SimpElement[];
  const prevChildren = prevElement!.children as SimpElement[];
  const nextLen = nextChildren.length;
  const prevLen = prevChildren.length;

  const base = {
    parentReference,
    renderRuntime,
    context,
    hostNamespace,
    placeHolderElement: null,
  } as const;

  const rs = (i: number): SimpElement | null => {
    return nextChildren[i + 1] ?? null;
  };

  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevLen - 1;
  let nextEnd = nextLen - 1;

  // Step 1: shrink prefix
  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    prevChildren[prevStart]!.key === nextChildren[nextStart]!.key
  ) {
    prevStart++;
    nextStart++;
  }

  // Step 2: shrink suffix
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    prevEnd--;
    nextEnd--;
  }

  // next[i] in suffix maps to prev[i - delta]
  const delta = nextLen - prevLen;

  const pushSuffixPatches = (): void => {
    for (let i = nextEnd + 1; i < nextLen; i++) {
      _pushPatchFrame({
        node: nextChildren[i]!,
        phase: PATCH_ENTER,
        meta: { ...base, prevElement: prevChildren[i - delta]!, rightSibling: rs(i) },
      });
    }
  };

  const pushPrefixPatches = (): void => {
    for (let i = 0; i < nextStart; i++) {
      _pushPatchFrame({
        node: nextChildren[i]!,
        phase: PATCH_ENTER,
        meta: { ...base, prevElement: prevChildren[i]!, rightSibling: rs(i) },
      });
    }
  };

  // Step 3: next exhausted → remove stale prev, patch edges
  if (nextStart > nextEnd) {
    pushPrefixPatches();
    for (let i = prevStart; i <= prevEnd; i++) {
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }
    pushSuffixPatches();
    return;
  }

  // Step 4: prev exhausted → mount remaining next, patch edges
  if (prevStart > prevEnd) {
    pushPrefixPatches();
    for (let i = nextStart; i <= nextEnd; i++) {
      _pushMountFrame({
        node: nextChildren[i]!,
        phase: MOUNT_ENTER,
        meta: { ...base, prevElement: null, rightSibling: rs(i) },
      });
    }
    pushSuffixPatches();
    return;
  }

  // Step 5: unknown middle section
  const keyToPrevIndex = new Map<Key, number>();
  for (let i = prevStart; i <= prevEnd; i++) {
    const key = prevChildren[i]!.key;
    if (key != null) keyToPrevIndex.set(key, i);
  }

  const middleLen = nextEnd - nextStart + 1;
  const newIndexToOldIndex = new Int32Array(middleLen); // 0 = new node

  let moved = false;
  let maxPrevIndexSoFar = -1;

  for (let i = nextStart; i <= nextEnd; i++) {
    const prevIndex = keyToPrevIndex.get(nextChildren[i]!.key!);
    if (prevIndex !== undefined) {
      newIndexToOldIndex[i - nextStart] = prevIndex + 1;
      if (prevIndex < maxPrevIndexSoFar) {
        moved = true;
      } else {
        maxPrevIndexSoFar = prevIndex;
      }
    }
  }

  pushPrefixPatches();

  // Remove unmatched prev nodes
  const matchedPrev = new Uint8Array(prevEnd - prevStart + 1);
  for (let i = 0; i < middleLen; i++) {
    const old = newIndexToOldIndex[i];
    if (old !== 0) matchedPrev[old! - 1 - prevStart] = 1;
  }
  for (let i = prevStart; i <= prevEnd; i++) {
    if (!matchedPrev[i - prevStart]) {
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }
  }

  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = nextChildren[i]!;
    const oldIndex = newIndexToOldIndex[i - nextStart]!;

    if (oldIndex === 0) {
      _pushMountFrame({
        node: nextChild,
        phase: MOUNT_ENTER,
        meta: { ...base, prevElement: null, rightSibling: rs(i) },
      });
    } else {
      const prevChild = prevChildren[oldIndex - 1]!;
      // patch first (deeper = executes last within this node's two frames)
      if (moved) {
        _pushHostOperation({
          node: nextChild,
          phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
          meta: { ...base, prevElement: prevChild, rightSibling: rs(i) },
        });
      }
      _pushPatchFrame({
        node: nextChild,
        phase: PATCH_ENTER,
        meta: { ...base, prevElement: prevChild, rightSibling: null },
      });
    }
  }

  pushSuffixPatches();
}
