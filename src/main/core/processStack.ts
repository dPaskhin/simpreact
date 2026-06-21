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

export interface MountFrameMeta {
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
  placeHolderElement: Nullable<SimpElement>;
}

export interface MountChildrenFrameMeta {
  children: Nullable<Many<SimpElement>>;
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
}

export interface PatchFrameMeta {
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
  prevElement: SimpElement;
}

export interface UnmountFrameMeta {
  renderRuntime: SimpRenderRuntime;
}

export interface PlaceElementFrameMeta {
  parentReference: unknown;
  subtreeRightBoundary: Nullable<SimpElement>;
  renderRuntime: SimpRenderRuntime;
}

export interface ReplaceElementFrameMeta {
  parentReference: unknown;
  prevElement: SimpElement;
}

export interface MountFrame {
  node: SimpElement;
  kind: typeof MOUNT_ENTER | typeof MOUNT_EXIT;
  meta: MountFrameMeta;
}

export interface MountChildrenFrame {
  node: SimpElement;
  kind: typeof MOUNT_CHILDREN_ENTER;
  meta: MountChildrenFrameMeta;
}

export interface PatchFrame {
  node: SimpElement;
  kind: typeof PATCH_ENTER | typeof PATCH_EXIT;
  meta: PatchFrameMeta;
}

export interface UnmountFrame {
  node: SimpElement;
  kind: typeof UNMOUNT_ENTER | typeof UNMOUNT_EXIT;
  meta: UnmountFrameMeta;
}

export interface UnmountChildrenFrame {
  node: SimpElement;
  kind: typeof UNMOUNT_CHILDREN_ENTER;
  meta: UnmountFrameMeta;
}

export interface PlaceElementFrame {
  node: SimpElement;
  kind: typeof HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR;
  meta: PlaceElementFrameMeta;
}

export interface ReplaceElementFrame {
  node: SimpElement;
  kind: typeof HOST_OPS_REPLACE_CHILD;
  meta: ReplaceElementFrameMeta;
}

export type SimpRenderFrame =
  | MountFrame
  | MountChildrenFrame
  | PatchFrame
  | UnmountFrame
  | UnmountChildrenFrame
  | PlaceElementFrame
  | ReplaceElementFrame;

export type SimpRenderStack = SimpRenderFrame[];

export interface FramePool {
  mount: MountFrame[];
  mountChildren: MountChildrenFrame[];
  patch: PatchFrame[];
  unmount: UnmountFrame[];
  unmountChildren: UnmountChildrenFrame[];
  place: PlaceElementFrame[];
  replace: ReplaceElementFrame[];
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
): MountFrame {
  const frame = renderRuntime.framePool.mount.pop();
  if (frame !== undefined) {
    frame.node = element;
    frame.kind = kind;
    frame.meta.parentReference = parentReference;
    frame.meta.subtreeRightBoundary = subtreeRightBoundary;
    frame.meta.context = context;
    frame.meta.hostNamespace = hostNamespace;
    frame.meta.renderRuntime = renderRuntime;
    frame.meta.placeHolderElement = placeHolderElement;
    return frame;
  }
  return {
    node: element,
    kind,
    meta: { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime, placeHolderElement },
  };
}

export function acquireMountChildrenFrame(
  renderRuntime: SimpRenderRuntime,
  parent: SimpElement,
  children: Nullable<Many<SimpElement>>,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>
): MountChildrenFrame {
  const frame = renderRuntime.framePool.mountChildren.pop();
  if (frame !== undefined) {
    frame.node = parent;
    frame.meta.children = children;
    frame.meta.parentReference = parentReference;
    frame.meta.subtreeRightBoundary = subtreeRightBoundary;
    frame.meta.context = context;
    frame.meta.hostNamespace = hostNamespace;
    frame.meta.renderRuntime = renderRuntime;
    return frame;
  }
  return {
    node: parent,
    kind: MOUNT_CHILDREN_ENTER,
    meta: { children, parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime },
  };
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
): PatchFrame {
  const frame = renderRuntime.framePool.patch.pop();
  if (frame !== undefined) {
    frame.node = element;
    frame.kind = kind;
    frame.meta.prevElement = prevElement;
    frame.meta.parentReference = parentReference;
    frame.meta.subtreeRightBoundary = subtreeRightBoundary;
    frame.meta.context = context;
    frame.meta.hostNamespace = hostNamespace;
    frame.meta.renderRuntime = renderRuntime;
    return frame;
  }
  return {
    node: element,
    kind,
    meta: { prevElement, parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime },
  };
}

export function acquireUnmountFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  kind: typeof UNMOUNT_ENTER | typeof UNMOUNT_EXIT
): UnmountFrame {
  const frame = renderRuntime.framePool.unmount.pop();
  if (frame !== undefined) {
    frame.node = element;
    frame.kind = kind;
    frame.meta.renderRuntime = renderRuntime;
    return frame;
  }
  return { node: element, kind, meta: { renderRuntime } };
}

export function acquireUnmountChildrenFrame(
  renderRuntime: SimpRenderRuntime,
  parent: SimpElement
): UnmountChildrenFrame {
  const frame = renderRuntime.framePool.unmountChildren.pop();
  if (frame !== undefined) {
    frame.node = parent;
    frame.meta.renderRuntime = renderRuntime;
    return frame;
  }
  return { node: parent, kind: UNMOUNT_CHILDREN_ENTER, meta: { renderRuntime } };
}

export function acquirePlaceFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>
): PlaceElementFrame {
  const frame = renderRuntime.framePool.place.pop();
  if (frame !== undefined) {
    frame.node = element;
    frame.meta.parentReference = parentReference;
    frame.meta.subtreeRightBoundary = subtreeRightBoundary;
    frame.meta.renderRuntime = renderRuntime;
    return frame;
  }
  return {
    node: element,
    kind: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
    meta: { parentReference, subtreeRightBoundary, renderRuntime },
  };
}

export function acquireReplaceFrame(
  renderRuntime: SimpRenderRuntime,
  element: SimpElement,
  parentReference: unknown,
  prevElement: SimpElement
): ReplaceElementFrame {
  const frame = renderRuntime.framePool.replace.pop();
  if (frame !== undefined) {
    frame.node = element;
    frame.meta.parentReference = parentReference;
    frame.meta.prevElement = prevElement;
    return frame;
  }
  return { node: element, kind: HOST_OPS_REPLACE_CHILD, meta: { parentReference, prevElement } };
}

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;
  const pool = renderRuntime.framePool;

  while (stack.length > 0) {
    const frame = stack.pop()!;

    switch (frame.kind) {
      case MOUNT_ENTER: {
        mountEnter(frame);
        frame.node = null!;
        pool.mount.push(frame);
        break;
      }
      case MOUNT_EXIT: {
        mountExit(frame);
        frame.node = null!;
        pool.mount.push(frame);
        break;
      }
      case MOUNT_CHILDREN_ENTER: {
        mountChildren(frame);
        frame.node = null!;
        pool.mountChildren.push(frame);
        break;
      }
      case PATCH_ENTER: {
        patchEnter(frame);
        frame.node = null!;
        pool.patch.push(frame);
        break;
      }
      case PATCH_EXIT: {
        patchExit(frame);
        frame.node = null!;
        pool.patch.push(frame);
        break;
      }
      case UNMOUNT_ENTER: {
        unmountEnter(frame);
        frame.node = null!;
        pool.unmount.push(frame);
        break;
      }
      case UNMOUNT_EXIT: {
        unmountExit(frame);
        frame.node = null!;
        pool.unmount.push(frame);
        break;
      }
      case UNMOUNT_CHILDREN_ENTER: {
        unmountChildren(frame);
        frame.node = null!;
        pool.unmountChildren.push(frame);
        break;
      }
      case HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR: {
        const anchor = resolveAnchorReference(frame.meta.subtreeRightBoundary);
        placeElementBeforeAnchor(frame.node, anchor, frame.meta.parentReference, renderRuntime);
        frame.node = null!;
        pool.place.push(frame);
        break;
      }
      case HOST_OPS_REPLACE_CHILD: {
        renderRuntime.hostAdapter.replaceChild(
          frame.meta.parentReference,
          frame.node.reference,
          frame.meta.prevElement.reference
        );
        frame.node = null!;
        pool.replace.push(frame);
        break;
      }
    }
  }
}
