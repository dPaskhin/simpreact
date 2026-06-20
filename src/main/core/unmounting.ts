import { noop } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { getLifecycleEventBus } from './lifecycleEventBus.js';
import { acquireUnmountFrame, processStack, UNMOUNT_ENTER, UNMOUNT_EXIT, type UnmountFrame } from './processStack.js';
import { unmountRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { pushUnmountChildrenFrame } from './unmountingChildren.js';
import { bitScanForwardIndex, clearElementHostReference } from './utils.js';

const unmountEnterHandlers = [unmountHostEnter, unmountFCEnter, noop, unmountPortalElement, unmountFragmentElement];

const unmountExitHandlers = [unmountHostExit, unmountFCExit, noop, noop, noop];

export function unmount(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot unmount while rendering.');
  }

  pushUnmountEnterFrame(element, renderRuntime);

  processStack(renderRuntime);
}

/** @internal */
export function unmountEnter(frame: UnmountFrame): void {
  unmountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

/** @internal */
export function unmountExit(frame: UnmountFrame): void {
  unmountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

/** @internal */
export function pushUnmountEnterFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_ENTER));
}

function pushUnmountExitFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_EXIT));
}

function unmountFCEnter(frame: UnmountFrame): void {
  const current = frame.node;

  if (current.unmounted) {
    return;
  }

  pushUnmountExitFrame(current, frame.meta.renderRuntime);
  pushUnmountChildrenFrame(current, frame.meta.renderRuntime);
}

function unmountFCExit(frame: UnmountFrame): void {
  const current = frame.node;
  current.unmounted = true;
  getLifecycleEventBus(frame.meta.renderRuntime).publish({
    type: 'unmounted',
    element: current,
    renderRuntime: frame.meta.renderRuntime,
  });
}

function unmountHostEnter(frame: UnmountFrame): void {
  pushUnmountExitFrame(frame.node, frame.meta.renderRuntime);
  pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}

function unmountHostExit(frame: UnmountFrame): void {
  const current = frame.node;
  unmountRef(current);
  frame.meta.renderRuntime.hostAdapter.unmountProps(current.reference, current, frame.meta.renderRuntime);
  frame.meta.renderRuntime.hostAdapter.detachElementFromReference(current.reference, frame.meta.renderRuntime);
}

function unmountPortalElement(frame: UnmountFrame): void {
  clearElementHostReference(frame.node.children as SimpElement, frame.node.ref, frame.meta.renderRuntime);
  pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}

function unmountFragmentElement(frame: UnmountFrame): void {
  pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}
