import type { Maybe } from '@simpreact/shared';
import {
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_FC,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { processStack, UNMOUNT_ENTER, UNMOUNT_EXIT, type UnmountFrame } from './processStack.js';
import { unmountRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _pushUnmountChildrenFrame } from './unmountingChildren.js';
import { isHostLike } from './utils.js';

export function unmount(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot unmount while rendering.');
  }

  _pushUnmountEnterFrame(element, renderRuntime);

  processStack(renderRuntime);
}

export function _unmount(frame: UnmountFrame): void {
  const current = frame.node;

  if (frame.kind === UNMOUNT_EXIT) {
    if ((current.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
      current.unmounted = true;
      lifecycleEventBus.publish({ type: 'unmounted', element: current, renderRuntime: frame.meta.renderRuntime });
      current.store = null;
      return;
    }

    if ((current.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
      unmountRef(current);
      frame.meta.renderRuntime.hostAdapter.unmountProps(current.reference, current, frame.meta.renderRuntime);
      frame.meta.renderRuntime.hostAdapter.detachElementFromReference(current.reference, frame.meta.renderRuntime);
    }

    return;
  }

  if ((current.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
    if (current.unmounted) {
      return;
    }

    _pushUnmountExitFrame(current, frame.meta.renderRuntime);

    if (current.children) {
      _pushUnmountChildrenFrame(current, frame.meta);
    }

    return;
  }

  if ((current.flag & SIMP_ELEMENT_FLAG_TEXT) !== 0) {
    return;
  }

  if ((current.flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0) {
    _remove(current.children as SimpElement, current.ref, frame.meta.renderRuntime);
    return;
  }

  if ((current.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    _pushUnmountExitFrame(current, frame.meta.renderRuntime);
  }

  _pushUnmountChildrenFrame(current, frame.meta);
}

export function _pushUnmountEnterFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push({
    node: element,
    kind: UNMOUNT_ENTER,
    meta: { renderRuntime },
  });
}

export function _pushUnmountExitFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push({
    node: element,
    kind: UNMOUNT_EXIT,
    meta: { renderRuntime },
  });
}

export function _clearElementHostReference(
  element: Maybe<SimpElement>,
  parentHostReference: unknown,
  renderRuntime: SimpRenderRuntime
): void {
  while (element != null) {
    if (isHostLike(element.flag)) {
      renderRuntime.hostAdapter.removeChild(parentHostReference, element.reference!);
      return;
    }
    const children = element.children;
    const childFlag = element.childFlag;

    if ((element.flag & SIMP_ELEMENT_FLAG_FC) !== 0) {
      element = children as SimpElement;
      continue;
    }
    if ((element.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0) {
      switch (childFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST:
          for (let i = 0, len = (children as SimpElement[]).length; i < len; ++i) {
            _clearElementHostReference((children as SimpElement[])[i], parentHostReference, renderRuntime);
          }
          return;
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
          element = children as SimpElement;
      }
    }
  }
}

export function _remove(element: SimpElement, parentReference: unknown, renderRuntime: SimpRenderRuntime): void {
  _clearElementHostReference(element, parentReference, renderRuntime);
  _pushUnmountEnterFrame(element, renderRuntime);
}
