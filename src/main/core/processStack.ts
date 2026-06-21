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

export function acquireMountFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  kind: typeof MOUNT_ENTER | typeof MOUNT_EXIT,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  placeHolderElement: Nullable<SimpElement>
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = kind;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = parentReference;
  frame.subtreeRightBoundary = subtreeRightBoundary;
  frame.context = context;
  frame.hostNamespace = hostNamespace;
  frame.placeHolderElement = placeHolderElement;
  return frame;
}

export function acquireMountChildrenFrame(
  renderRuntime: SimpRenderRuntime,
  parent: SimpElement,
  children: Nullable<Many<SimpElement>>,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = MOUNT_CHILDREN_ENTER;
  frame.node = parent;
  frame.renderRuntime = renderRuntime;
  frame.children = children;
  frame.parentReference = parentReference;
  frame.subtreeRightBoundary = subtreeRightBoundary;
  frame.context = context;
  frame.hostNamespace = hostNamespace;
  return frame;
}

export function acquirePatchFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  kind: typeof PATCH_ENTER | typeof PATCH_EXIT,
  prevElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = kind;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.prevElement = prevElement;
  frame.parentReference = parentReference;
  frame.subtreeRightBoundary = subtreeRightBoundary;
  frame.context = context;
  frame.hostNamespace = hostNamespace;
  return frame;
}

export function acquireUnmountFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  kind: typeof UNMOUNT_ENTER | typeof UNMOUNT_EXIT
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = kind;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  return frame;
}

export function acquireUnmountChildrenFrame(renderRuntime: SimpRenderRuntime, parent: SimpElement): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = UNMOUNT_CHILDREN_ENTER;
  frame.node = parent;
  frame.renderRuntime = renderRuntime;
  return frame;
}

export function acquirePlaceFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = parentReference;
  frame.subtreeRightBoundary = subtreeRightBoundary;
  return frame;
}

export function acquireReplaceFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  parentReference: unknown,
  prevElement: SimpElement
): SimpRenderFrame {
  const frame = renderRuntime.framePool.pop() ?? createFrame();
  frame.kind = HOST_OPS_REPLACE_CHILD;
  frame.node = element;
  frame.renderRuntime = renderRuntime;
  frame.parentReference = parentReference;
  frame.prevElement = prevElement;
  return frame;
}

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;
  const pool = renderRuntime.framePool;

  while (stack.length > 0) {
    const frame = stack.pop()!;

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

    frame.node = null!;
    frame.prevElement = null!;
    frame.children = null;
    frame.subtreeRightBoundary = null;
    frame.placeHolderElement = null;
    pool.push(frame);
  }
}
