import type { Maybe } from '@simpreact/shared';
import {
  type Key,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
  type SimpNode,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { mount, mountArrayChildren } from './mounting.js';
import { patch } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';
import { remove, unmount } from './unmounting.js';
import { findHostReferenceFromElement } from './utils.js';

export function patchChildren(
  prevChildFlag: number,
  nextChildFlag: number,
  prevChildren: SimpNode,
  nextChildren: SimpNode,
  nextReference: HostReference,
  parentElement: SimpElement,
  parentReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  switch (prevChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = parentElement;
          }

          patchKeyedChildren(
            prevChildren as SimpElement[],
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace,
            renderRuntime
          );

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          // TODO
          // removeAllChildren(parentDOM, parentVNode, lastChildren, animations);
          // mount(
          //   nextChildren,
          //   parentDOM,
          //   context,
          //   isSVG,
          //   nextNode,
          //   lifecycle,
          //   animations,
          // );

          patchKeyedChildren(
            prevChildren as SimpElement[],
            [nextChildren] as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace,
            renderRuntime
          );

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          unmount(prevChildren as SimpElement[], renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string);
          break;
        }
        default: {
          unmount(prevChildren as SimpElement[], renderRuntime);
          renderRuntime.hostAdapter.clearNode(parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          // TODO
          // unmount(lastChildren, animations);
          //
          // mountArrayChildren(
          //   nextChildren,
          //   parentDOM,
          //   context,
          //   isSVG,
          //   findDOMFromVNode(lastChildren, true),
          //   lifecycle,
          //   animations,
          // );
          //
          // removeVNodeDOM(lastChildren, parentDOM, animations);

          patchKeyedChildren(
            [prevChildren] as SimpElement[],
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace,
            renderRuntime
          );

          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;
          patch(
            prevChildren as SimpElement,
            nextChildren as SimpElement,
            parentReference,
            nextReference,
            context,
            hostNamespace,
            renderRuntime
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          unmount(prevChildren as SimpElement[], renderRuntime);
          renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string);
          break;
        }
        default: {
          remove(prevChildren as SimpElement, parentReference, renderRuntime);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
      if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
        renderRuntime.hostAdapter.clearNode(parentReference);
        mountArrayChildren(
          nextChildren as SimpElement[],
          parentReference,
          nextReference,
          context,
          parentElement,
          hostNamespace,
          renderRuntime
        );
        break;
      } else if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
        renderRuntime.hostAdapter.clearNode(parentReference);
        (nextChildren as SimpElement).parent = parentElement;
        mount(nextChildren as SimpElement, parentReference, nextReference, context, hostNamespace, renderRuntime);
      } else if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_TEXT) {
        if (prevChildren !== nextChildren) {
          renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string, true);
        }
      }
      break;
    }
    default: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          mountArrayChildren(
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            parentElement,
            hostNamespace,
            renderRuntime
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;
          mount(nextChildren as SimpElement, parentReference, nextReference, context, hostNamespace, renderRuntime);
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          renderRuntime.hostAdapter.setTextContent(parentReference, nextChildren as string);
        }
      }
    }
  }
}

export function patchKeyedChildren(
  prevChildren: SimpElement[],
  nextChildren: SimpElement[],
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevChildren.length - 1;
  let nextEnd = nextChildren.length - 1;

  // Step 1: Sync from the start
  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    prevChildren[prevStart]!.key === nextChildren[nextStart]!.key
  ) {
    patch(
      prevChildren[prevStart]!,
      nextChildren[nextStart]!,
      parentReference,
      null,
      context,
      hostNamespace,
      renderRuntime
    );
    prevStart++;
    nextStart++;
  }

  // Step 2: Sync from the end
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    patch(prevChildren[prevEnd]!, nextChildren[nextEnd]!, parentReference, null, context, hostNamespace, renderRuntime);
    prevEnd--;
    nextEnd--;
  }

  // Step 3: Remove prev nodes if the next list is exhausted
  if (nextStart > nextEnd) {
    for (let i = prevStart; i <= prevEnd; i++) {
      remove(prevChildren[i]!, parentReference, renderRuntime);
    }
  }
  // Step 4: Mount new nodes if a prev list is exhausted
  else if (prevStart > prevEnd) {
    const before = getStableRightSiblingAnchor(nextEnd, nextChildren, nextReference);
    for (let i = nextStart; i <= nextEnd; i++) {
      mount(nextChildren[i]!, parentReference, before, context, hostNamespace, renderRuntime);
    }
  }

  // Step 5: Full diff with keyed lookup and movement
  else {
    // 5.1 map prev key -> index
    const keyToPrevIndexMap = new Map<Key, number>();
    for (let i = prevStart; i <= prevEnd; i++) {
      const key = prevChildren[i]!.key;
      if (key != null) {
        keyToPrevIndexMap.set(key, i);
      }
    }

    const nextLen = nextEnd - nextStart + 1;

    // newIndexToOldIndex: 0 means "new node", otherwise (oldIndex + 1)
    const newIndexToOldIndex = new Array<number>(nextLen).fill(0);

    const usedPrev = new Set<number>();

    // 5.2 PATCH ONLY (no mounts here)
    for (let i = nextStart; i <= nextEnd; i++) {
      const nextChild = nextChildren[i]!;
      const prevIndex = keyToPrevIndexMap.get(nextChild.key!);

      if (prevIndex !== undefined) {
        const prevChild = prevChildren[prevIndex]!;
        patch(prevChild, nextChild, parentReference, null, context, hostNamespace, renderRuntime);

        newIndexToOldIndex[i - nextStart] = prevIndex + 1;
        usedPrev.add(prevIndex);
      }
    }

    // 5.3 REMOVE after all patches
    for (let i = prevStart; i <= prevEnd; i++) {
      if (!usedPrev.has(i)) {
        remove(prevChildren[i]!, parentReference, renderRuntime);
      }
    }

    // 5.4 PLACE (mount and move) in reverse, so we always have a stable "anchor"
    // If there is a stable (already-patched) suffix node to the right of the diff window,
    // we must use it as the initial anchor. Otherwise, fall back to the caller-provided nextReference.
    // This keeps insertions/moves positioned correctly when we are not diffing the last children.
    let anchor: HostReference = getStableRightSiblingAnchor(nextEnd, nextChildren, nextReference);

    for (let i = nextEnd; i >= nextStart; i--) {
      const nextChild = nextChildren[i]!;
      const mapped = newIndexToOldIndex[i - nextStart];

      if (mapped === 0) {
        // NEW -> mount (happens strictly after removals)
        mount(nextChild, parentReference, anchor, context, hostNamespace, renderRuntime);
        anchor = findHostReferenceFromElement(nextChild) || anchor;
      } else {
        // EXISTING -> move/ensure the correct position
        anchor = placeElementBeforeAnchor(nextChild, anchor, parentReference, renderRuntime);
      }
    }
  }
}

function getStableRightSiblingAnchor(
  nextEndIndex: number,
  nextChildren: SimpElement[],
  nextReference: HostReference
): HostReference {
  const rightIndex = nextEndIndex + 1;

  if (rightIndex >= nextChildren.length) {
    return nextReference;
  }

  return findHostReferenceFromElement(nextChildren[rightIndex]!) || nextReference;
}

function placeElementBeforeAnchor(
  element: SimpElement,
  anchor: HostReference,
  parentReference: HostReference,
  renderRuntime: SimpRenderRuntime
): HostReference {
  const stack: SimpElement[] = [element];
  let nextAnchor: HostReference | null = anchor;

  while (stack.length !== 0) {
    const current = stack.pop()!;

    if (
      (current.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (current.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (current.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      renderRuntime.hostAdapter.insertBefore(parentReference, current.reference!, nextAnchor);
      nextAnchor = current.reference!;
      continue;
    }

    if (current.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const children = current.children as SimpElement[];
      for (let i = 0; i < children.length; i++) {
        stack.push(children[i]!);
      }
    } else if (current.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
      const child = current.children as SimpElement;
      stack.push(child);
    }
  }

  return nextAnchor;
}
