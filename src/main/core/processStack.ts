import type { Maybe, Nullable } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { _mount } from './mounting.js';
import { _patch } from './patching.js';
import { _patchChildren, _patchKeyedChildren } from './patchingChildren.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _unmount } from './unmounting.js';
import { placeElementBeforeAnchor, resolveAnchorReference } from './utils.js';

export const MOUNT_ENTER = 1;
export const MOUNT_EXIT = 2;
export const PATCH_ENTER = 3;
export const PATCH_EXIT = 4;
export const PATCH_CHILDREN = 5;
export const PATCH_KEYED_CHILDREN = 6;
export const UNMOUNT_ENTER = 7;
export const UNMOUNT_EXIT = 8;
export const HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR = 9;
export const HOST_OPS_REPLACE_CHILD = 10;

export interface MountFrameMeta {
  parentReference: unknown;
  rightSibling: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
  placeHolderElement: Nullable<SimpElement>;
}

export interface PatchFrameMeta extends MountFrameMeta {
  prevElement: SimpElement;
}

export interface UnmountFrameMeta {
  renderRuntime: SimpRenderRuntime;
}

export interface PlaceElementFrameMeta {
  parentReference: unknown;
  rightSibling: Nullable<SimpElement>;
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

export interface PatchFrame {
  node: SimpElement;
  kind: typeof PATCH_ENTER | typeof PATCH_EXIT;
  meta: PatchFrameMeta;
}

export interface PatchChildrenFrame {
  node: SimpElement;
  kind: typeof PATCH_CHILDREN | typeof PATCH_KEYED_CHILDREN;
  meta: PatchFrameMeta;
}

export interface UnmountFrame {
  node: SimpElement;
  kind: typeof UNMOUNT_ENTER | typeof UNMOUNT_EXIT;
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
  | PatchFrame
  | PatchChildrenFrame
  | UnmountFrame
  | PlaceElementFrame
  | ReplaceElementFrame;

export type SimpRenderStack = SimpRenderFrame[];

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;

  while (stack.length > 0) {
    const frame = stack.pop()!;

    switch (frame.kind) {
      case MOUNT_ENTER: {
        _mount(frame);
        break;
      }
      case MOUNT_EXIT: {
        _mount(frame);
        break;
      }
      case PATCH_ENTER: {
        _patch(frame);
        break;
      }
      case PATCH_EXIT: {
        _patch(frame);
        break;
      }
      case PATCH_CHILDREN: {
        _patchChildren(frame);
        break;
      }
      case PATCH_KEYED_CHILDREN: {
        _patchKeyedChildren(frame);
        break;
      }
      case UNMOUNT_ENTER: {
        _unmount(frame);
        break;
      }
      case UNMOUNT_EXIT: {
        _unmount(frame);
        break;
      }
      case HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR: {
        const anchor = resolveAnchorReference(frame.meta.rightSibling);
        placeElementBeforeAnchor(frame.node, anchor, frame.meta.parentReference, renderRuntime);
        break;
      }
      case HOST_OPS_REPLACE_CHILD: {
        renderRuntime.hostAdapter.replaceChild(
          frame.meta.parentReference,
          frame.node.reference,
          frame.meta.prevElement.reference
        );
      }
    }
  }
}
