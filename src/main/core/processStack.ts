import type { Maybe, Nullable } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { _mount } from './mounting.js';
import { _patch } from './patching.js';
import { _patchChildren, _patchKeyedChildren } from './patchingChildren.js';
import type { SimpRenderRuntime } from './runtime.js';
import type { TraversalFrame } from './traverseStack.js';
import { _unmount } from './unmounting.js';
import { findHostReferenceFromElement } from './utils.js';

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

export interface RenderMeta {
  prevElement: Nullable<SimpElement>;
  parentReference: HostReference;
  rightSibling: Nullable<SimpElement>;
  context: unknown;
  hostNamespace: Maybe<string>;
  renderRuntime: SimpRenderRuntime;
  placeHolderElement: Nullable<SimpElement>;
}

export interface RenderFrame extends TraversalFrame<SimpElement, RenderMeta> {}

export function processStack(renderRuntime: SimpRenderRuntime): void {
  const stack = renderRuntime.renderStack;

  while (!stack.isEmpty) {
    const frame = stack.pop()!;

    switch (frame.phase) {
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
          frame.meta.prevElement!.reference
        );
      }
    }
  }
}

function placeElementBeforeAnchor(
  element: SimpElement,
  anchor: HostReference,
  parentReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  const stack: SimpElement[] = [element];
  let nextAnchor: HostReference | null = anchor;

  while (stack.length !== 0) {
    const current = stack.pop()!;

    if (
      (current.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (current.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (current.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      renderRuntime.hostAdapter.insertOrAppend(parentReference, current.reference!, nextAnchor);
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
}

export function resolveAnchorReference(rightSibling: Nullable<SimpElement>): HostReference {
  let current = rightSibling;

  while (current != null) {
    const reference = findHostReferenceFromElement(current);

    if (reference != null) {
      return reference;
    }

    current = findNextLogicalSibling(current);
  }

  return null;
}

function findNextLogicalSibling(element: SimpElement): Nullable<SimpElement> {
  let current: Nullable<SimpElement> = element;

  while (current != null) {
    const parent = current.parent as Nullable<SimpElement>;

    if (
      parent == null ||
      (parent.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (parent.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (parent.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      return null;
    }

    if (parent.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const siblings = parent.children as SimpElement[];
      const index = siblings.indexOf(current);

      if (index !== -1 && index + 1 < siblings.length) {
        return siblings[index + 1]!;
      }
    }

    current = parent;
  }

  return null;
}
