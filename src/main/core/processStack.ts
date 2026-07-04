import type { Many, Maybe, Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { mountEnter, mountExit } from './mounting.js';
import { mountChildren } from './mountingChildren.js';
import { patchEnter, patchExit } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';
import { unmountEnter, unmountExit } from './unmounting.js';
import { unmountChildren } from './unmountingChildren.js';
import { placeElementBeforeAnchor, resolveAnchorReference } from './utils.js';

export const MOUNT_ENTER = 10;
export const MOUNT_EXIT = 11;
export const MOUNT_CHILDREN_ENTER = 12;

export const PATCH_ENTER = 20;
export const PATCH_EXIT = 21;

export const UNMOUNT_ENTER = 30;
export const UNMOUNT_EXIT = 31;
export const UNMOUNT_CHILDREN_ENTER = 32;

export const HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR = 40;
export const HOST_OPS_REPLACE_CHILD = 42;

export interface SimpRenderFrame {
  kind: number;
  node: SimpElement;
  renderRuntime: SimpRenderRuntime;
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  prevElement: SimpElement;
  children: Nullable<Many<SimpElement>>;
  placeHolderElement: Nullable<SimpElement>;
}

export type SimpRenderStack = SimpRenderFrame[];

function createFrame(): SimpRenderFrame {
  return {
    kind: 0,
    node: null!,
    renderRuntime: null!,
    parentReference: null,
    subtreeRightBoundary: null,
    context: null,
    hostNamespace: null,
    prevElement: null!,
    children: null,
    placeHolderElement: null,
  };
}

// Reuses whatever a previous pop left at this slot, or allocates once — the
// stack IS the pool. Callers set all 10 fields (nulling ones their kind skips).
export function acquireFrame(renderRuntime: SimpRenderRuntime): SimpRenderFrame {
  const stack = renderRuntime.renderStack;
  const cursor = ++renderRuntime.stackCursor;
  return (stack[cursor] ??= createFrame());
}

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;

  while (renderRuntime.stackCursor >= 0) {
    const frame = stack[renderRuntime.stackCursor--]!;

    switch (frame.kind) {
      case MOUNT_ENTER:
        mountEnter(frame);
        break;
      case MOUNT_EXIT:
        mountExit(frame);
        break;
      case MOUNT_CHILDREN_ENTER:
        mountChildren(frame);
        break;
      case PATCH_ENTER:
        patchEnter(frame);
        break;
      case PATCH_EXIT:
        patchExit(frame);
        break;
      case UNMOUNT_ENTER:
        unmountEnter(frame);
        break;
      case UNMOUNT_EXIT:
        unmountExit(frame);
        break;
      case UNMOUNT_CHILDREN_ENTER:
        unmountChildren(frame);
        break;
      case HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR: {
        const anchor = resolveAnchorReference(frame.subtreeRightBoundary);
        placeElementBeforeAnchor(frame.node, anchor, frame.parentReference, renderRuntime);
        break;
      }
      case HOST_OPS_REPLACE_CHILD:
        renderRuntime.hostAdapter.replaceChild(
          frame.parentReference,
          frame.node.reference,
          frame.prevElement.reference
        );
        break;
    }
  }

  // Nothing is mid-acquire once drained — safe to sweep dormant slots and
  // drop large refs now instead of waiting for reuse.
  for (let i = renderRuntime.stackCursor + 1; i < stack.length; i++) {
    const frame = stack[i]!;
    frame.node = null!;
    frame.prevElement = null!;
    frame.children = null;
    frame.subtreeRightBoundary = null;
    frame.placeHolderElement = null;
  }
}
