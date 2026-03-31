import {
  type Key,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  type SimpElement,
} from './createElement.js';
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
  const {
    renderRuntime,
    parentAnchorReference,
    rightSibling,
    parentReference,
    context,
    hostNamespace,
    placeHolderElement,
    prevElement,
  } = frame.meta;
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
              parentAnchorReference,
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
  const nextElement = frame.node;
  const { renderRuntime, parentAnchorReference, parentReference, prevElement, context, hostNamespace } = frame.meta;
  const nextChildren = nextElement.children as SimpElement[];
  const prevChildren = prevElement!.children as SimpElement[];

  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevChildren.length - 1;
  let nextEnd = nextChildren.length - 1;

  const prefixPairs: Array<{ prev: SimpElement; next: SimpElement }> = [];
  const suffixPairs: Array<{ prev: SimpElement; next: SimpElement }> = [];

  // Step 1: collect prefix matches
  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    prevChildren[prevStart]!.key === nextChildren[nextStart]!.key
  ) {
    prefixPairs.push({
      prev: prevChildren[prevStart]!,
      next: nextChildren[nextStart]!,
    });

    prevStart++;
    nextStart++;
  }

  // Step 2: collect suffix matches
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    suffixPairs.push({
      prev: prevChildren[prevEnd]!,
      next: nextChildren[nextEnd]!,
    });

    prevEnd--;
    nextEnd--;
  }

  // Step 3: next exhausted -> remove remaining prev
  if (nextStart > nextEnd) {
    let rightSibling = frame.meta.rightSibling;

    for (let i = prevStart; i <= prevEnd; i++) {
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }

    for (let i = 0; i <= suffixPairs.length - 1; i++) {
      const pair = suffixPairs[i]!;

      _pushPatchFrame({
        node: pair.next,
        phase: PATCH_ENTER,
        meta: {
          prevElement: pair.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    }

    for (let i = 0; i <= prefixPairs.length - 1; i++) {
      const pair = prefixPairs[i]!;

      _pushPatchFrame({
        node: pair.next,
        phase: PATCH_ENTER,
        meta: {
          prevElement: pair.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });

      rightSibling = pair.next;
    }

    return;
  }

  // Step 4: prev exhausted -> mount remaining next
  if (prevStart > prevEnd) {
    let rightSibling = nextChildren[nextEnd + 1] || frame.meta.rightSibling;

    for (let i = nextEnd; i >= nextStart; i--) {
      const nextChild = nextChildren[i]!;

      _pushMountFrame({
        node: nextChild,
        phase: MOUNT_ENTER,
        meta: {
          prevElement: null,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });

      rightSibling = nextChild;
    }

    // push suffix first
    for (let i = suffixPairs.length - 1; i >= 0; i--) {
      const pair = suffixPairs[i]!;

      _pushPatchFrame({
        node: pair.next,
        phase: PATCH_ENTER,
        meta: {
          prevElement: pair.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling: null,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    }

    for (let i = prefixPairs.length - 1; i >= 0; i--) {
      const pair = prefixPairs[i]!;

      _pushPatchFrame({
        node: pair.next,
        phase: PATCH_ENTER,
        meta: {
          prevElement: pair.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling: null,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    }

    return;
  }

  // Step 5: unknown sequence in the middle
  const keyToPrevIndexMap = new Map<Key, number>();

  for (let i = prevStart; i <= prevEnd; i++) {
    const key = prevChildren[i]!.key;

    if (key != null) {
      keyToPrevIndexMap.set(key, i);
    }
  }

  const nextLen = nextEnd - nextStart + 1;
  const newIndexToOldIndex: number[] = [];
  for (let i = 0; i < nextLen; i++) {
    newIndexToOldIndex.push(0);
  }
  const usedPrev: boolean[] = [];
  for (let i = 0; i < prevEnd - prevStart + 1; i++) {
    usedPrev.push(false);
  }

  let moved = false;
  let maxPrevIndexSoFar = -1;

  // match only
  for (let i = nextStart; i <= nextEnd; i++) {
    const nextChild = nextChildren[i]!;
    const prevIndex = keyToPrevIndexMap.get(nextChild.key!);

    if (prevIndex !== undefined) {
      newIndexToOldIndex[i - nextStart] = prevIndex + 1;
      usedPrev[prevIndex - prevStart] = true;

      if (prevIndex < maxPrevIndexSoFar) {
        moved = true;
      } else {
        maxPrevIndexSoFar = prevIndex;
      }
    }
  }

  // remove stale prev
  for (let i = prevStart; i <= prevEnd; i++) {
    if (!usedPrev[i - prevStart]) {
      _remove(prevChildren[i]!, parentReference, renderRuntime);
    }
  }

  let rightSibling = nextChildren[nextEnd + 1] || frame.meta.rightSibling;

  const plan: FramePlan[] = [];

  for (let i = nextEnd; i >= nextStart; i--) {
    const nextChild = nextChildren[i]!;
    const mapped = newIndexToOldIndex[i - nextStart]!;

    if (mapped === 0) {
      plan.push({ type: 'mount', next: nextChild, rightSibling });
      rightSibling = nextChild;
      continue;
    }

    const prevChild = prevChildren[mapped - 1]!;

    if (moved) {
      plan.push({ type: 'place', next: nextChild, prev: prevChild, rightSibling });
    }
    plan.push({ type: 'patch', next: nextChild, prev: prevChild, rightSibling: null });
    rightSibling = nextChild;
  }

  const reordered: FramePlan[] = [];
  for (const entry of plan) {
    if (entry.type === 'mount' && entry.rightSibling !== null) {
      // find the patch for the rightSibling and insert the mount after it
      const rsKey = entry.rightSibling.key;
      const idx = reordered.findLastIndex(e => e.type === 'patch' && e.next.key === rsKey);
      if (idx !== -1) {
        reordered.splice(idx + 1, 0, entry);
        continue;
      }
    }
    reordered.push(entry);
  }

  for (const entry of reordered) {
    if (entry.type === 'mount') {
      _pushMountFrame({
        node: entry.next,
        phase: MOUNT_ENTER,
        meta: {
          prevElement: null,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling: entry.rightSibling,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    } else if (entry.type === 'place') {
      renderRuntime.renderStack.push({
        node: entry.next,
        phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
        meta: {
          prevElement: entry.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling: entry.rightSibling,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    } else {
      _pushPatchFrame({
        node: entry.next,
        phase: PATCH_ENTER,
        meta: {
          prevElement: entry.prev,
          parentReference,
          renderRuntime,
          parentAnchorReference,
          rightSibling: null,
          context,
          hostNamespace,
          placeHolderElement: null,
        },
      });
    }
  }

  // push suffix first so it executes after the middle block
  for (let i = suffixPairs.length - 1; i >= 0; i--) {
    const pair = suffixPairs[i]!;

    _pushPatchFrame({
      node: pair.next,
      phase: PATCH_ENTER,
      meta: {
        prevElement: pair.prev,
        parentReference,
        renderRuntime,
        parentAnchorReference,
        rightSibling: null,
        context,
        hostNamespace,
        placeHolderElement: null,
      },
    });
  }

  // push the prefix last so it executes first
  for (let i = prefixPairs.length - 1; i >= 0; i--) {
    const pair = prefixPairs[i]!;

    _pushPatchFrame({
      node: pair.next,
      phase: PATCH_ENTER,
      meta: {
        prevElement: pair.prev,
        parentReference,
        renderRuntime,
        parentAnchorReference,
        rightSibling: null,
        context,
        hostNamespace,
        placeHolderElement: null,
      },
    });
  }
}

type FramePlan =
  | { type: 'patch'; next: SimpElement; prev: SimpElement; rightSibling: SimpElement | null }
  | { type: 'place'; next: SimpElement; prev: SimpElement; rightSibling: SimpElement | null }
  | { type: 'mount'; next: SimpElement; rightSibling: SimpElement | null };
