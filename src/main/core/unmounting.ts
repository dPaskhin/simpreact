import { noop } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { getLifecycleEventBus } from './lifecycleEventBus.js';
import {
  acquireUnmountFrame,
  processStack,
  type SimpRenderFrame,
  UNMOUNT_ENTER,
  UNMOUNT_EXIT,
} from './processStack.js';
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

export function unmountEnter(frame: SimpRenderFrame): void {
  unmountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function unmountExit(frame: SimpRenderFrame): void {
  unmountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function pushUnmountEnterFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_ENTER));
}

function pushUnmountExitFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_EXIT));
}

function unmountFCEnter(frame: SimpRenderFrame): void {
  const current = frame.node;

  if (current.unmounted) {
    return;
  }

  pushUnmountExitFrame(current, frame.renderRuntime);
  pushUnmountChildrenFrame(current, frame.renderRuntime);
}

function unmountFCExit(frame: SimpRenderFrame): void {
  const current = frame.node;
  current.unmounted = true;
  getLifecycleEventBus(frame.renderRuntime).publish({
    type: 'unmounted',
    element: current,
    renderRuntime: frame.renderRuntime,
  });
}

function unmountHostEnter(frame: SimpRenderFrame): void {
  pushUnmountExitFrame(frame.node, frame.renderRuntime);
  pushUnmountChildrenFrame(frame.node, frame.renderRuntime);
}

function unmountHostExit(frame: SimpRenderFrame): void {
  const current = frame.node;
  unmountRef(current);
  frame.renderRuntime.hostAdapter.unmountProps(current.reference, current, frame.renderRuntime);
  frame.renderRuntime.hostAdapter.detachElementFromReference(current.reference, frame.renderRuntime);
}

function unmountPortalElement(frame: SimpRenderFrame): void {
  clearElementHostReference(frame.node.children as SimpElement, frame.node.ref, frame.renderRuntime);
  pushUnmountChildrenFrame(frame.node, frame.renderRuntime);
}

function unmountFragmentElement(frame: SimpRenderFrame): void {
  pushUnmountChildrenFrame(frame.node, frame.renderRuntime);
}
