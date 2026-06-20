import type { Many, Maybe, Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { _mountEnter, _mountExit } from './mounting.js';
import { _mountChildren } from './mountingChildren.js';
import { _patchEnter, _patchExit } from './patching.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _unmountEnter, _unmountExit } from './unmounting.js';
import { _unmountChildren } from './unmountingChildren.js';
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

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;

  while (stack.length > 0) {
    const frame = stack.pop()!;

    switch (frame.kind) {
      case MOUNT_ENTER: {
        _mountEnter(frame);
        break;
      }
      case MOUNT_EXIT: {
        _mountExit(frame);
        break;
      }
      case MOUNT_CHILDREN_ENTER: {
        _mountChildren(frame);
        break;
      }
      case PATCH_ENTER: {
        _patchEnter(frame);
        break;
      }
      case PATCH_EXIT: {
        _patchExit(frame);
        break;
      }
      case UNMOUNT_ENTER: {
        _unmountEnter(frame);
        break;
      }
      case UNMOUNT_EXIT: {
        _unmountExit(frame);
        break;
      }
      case UNMOUNT_CHILDREN_ENTER: {
        _unmountChildren(frame);
        break;
      }
      case HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR: {
        const anchor = resolveAnchorReference(frame.meta.subtreeRightBoundary);
        placeElementBeforeAnchor(frame.node, anchor, frame.meta.parentReference, renderRuntime);
        break;
      }
      case HOST_OPS_REPLACE_CHILD: {
        renderRuntime.hostAdapter.replaceChild(
          frame.meta.parentReference,
          frame.node.reference,
          frame.meta.prevElement.reference
        );
        break;
      }
    }
  }
}
