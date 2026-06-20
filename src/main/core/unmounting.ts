import { noop } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { getLifecycleEventBus } from './lifecycleEventBus.js';
import { acquireUnmountFrame, processStack, UNMOUNT_ENTER, UNMOUNT_EXIT, type UnmountFrame } from './processStack.js';
import { unmountRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _pushUnmountChildrenFrame } from './unmountingChildren.js';
import { _clearElementHostReference, bitScanForwardIndex } from './utils.js';

const unmountEnterHandlers = [_unmountHostEnter, _unmountFCEnter, noop, _unmountPortalElement, _unmountFragmentElement];

const unmountExitHandlers = [_unmountHostExit, _unmountFCExit, noop, noop, noop];

export function unmount(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot unmount while rendering.');
  }

  _pushUnmountEnterFrame(element, renderRuntime);

  processStack(renderRuntime);
}

export function _unmountEnter(frame: UnmountFrame): void {
  unmountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _unmountExit(frame: UnmountFrame): void {
  unmountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushUnmountEnterFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_ENTER));
}

export function _pushUnmountExitFrame(element: SimpElement, renderRuntime: SimpRenderRuntime): void {
  renderRuntime.renderStack.push(acquireUnmountFrame(renderRuntime, element, UNMOUNT_EXIT));
}

function _unmountFCEnter(frame: UnmountFrame): void {
  const current = frame.node;

  if (current.unmounted) {
    return;
  }

  _pushUnmountExitFrame(current, frame.meta.renderRuntime);
  _pushUnmountChildrenFrame(current, frame.meta.renderRuntime);
}

function _unmountFCExit(frame: UnmountFrame): void {
  const current = frame.node;
  current.unmounted = true;
  getLifecycleEventBus(frame.meta.renderRuntime).publish({
    type: 'unmounted',
    element: current,
    renderRuntime: frame.meta.renderRuntime,
  });
}

function _unmountHostEnter(frame: UnmountFrame): void {
  _pushUnmountExitFrame(frame.node, frame.meta.renderRuntime);
  _pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}

function _unmountHostExit(frame: UnmountFrame): void {
  const current = frame.node;
  unmountRef(current);
  frame.meta.renderRuntime.hostAdapter.unmountProps(current.reference, current, frame.meta.renderRuntime);
  frame.meta.renderRuntime.hostAdapter.detachElementFromReference(current.reference, frame.meta.renderRuntime);
}

function _unmountPortalElement(frame: UnmountFrame): void {
  _clearElementHostReference(frame.node.children as SimpElement, frame.node.ref, frame.meta.renderRuntime);
  _pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}

function _unmountFragmentElement(frame: UnmountFrame): void {
  _pushUnmountChildrenFrame(frame.node, frame.meta.renderRuntime);
}
