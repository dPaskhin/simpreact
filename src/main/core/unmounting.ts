import { noop } from '@simpreact/shared';
import type { SimpElement } from './createElement.js';
import { getLifecycleEventBus } from './lifecycleEventBus.js';
import { processStack, UNMOUNT_ENTER, UNMOUNT_EXIT, type UnmountFrame, type UnmountFrameMeta } from './processStack.js';
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

  _pushUnmountEnterFrame(element, { renderRuntime });

  processStack(renderRuntime);
}

export function _unmountEnter(frame: UnmountFrame): void {
  unmountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _unmountExit(frame: UnmountFrame): void {
  unmountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushUnmountEnterFrame(element: SimpElement, meta: UnmountFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: UNMOUNT_ENTER,
    meta,
  });
}

export function _pushUnmountExitFrame(element: SimpElement, meta: UnmountFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: UNMOUNT_EXIT,
    meta,
  });
}

function _unmountFCEnter(frame: UnmountFrame): void {
  const current = frame.node;

  if (current.unmounted) {
    return;
  }

  _pushUnmountExitFrame(current, frame.meta);
  _pushUnmountChildrenFrame(current, frame.meta);
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
  _pushUnmountExitFrame(frame.node, frame.meta);
  _pushUnmountChildrenFrame(frame.node, frame.meta);
}

function _unmountHostExit(frame: UnmountFrame): void {
  const current = frame.node;
  unmountRef(current);
  frame.meta.renderRuntime.hostAdapter.unmountProps(current.reference, current, frame.meta.renderRuntime);
  frame.meta.renderRuntime.hostAdapter.detachElementFromReference(current.reference, frame.meta.renderRuntime);
}

function _unmountPortalElement(frame: UnmountFrame): void {
  _clearElementHostReference(frame.node.children as SimpElement, frame.node.ref, frame.meta.renderRuntime);
  _pushUnmountChildrenFrame(frame.node, frame.meta);
}

function _unmountFragmentElement(frame: UnmountFrame): void {
  _pushUnmountChildrenFrame(frame.node, frame.meta);
}
