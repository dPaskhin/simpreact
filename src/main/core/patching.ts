import type { Many, Nullable } from '@simpreact/shared';
import { noop } from '@simpreact/shared';
import {
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationReplaceElement } from './hostOperations.js';
import { getLifecycleEventBus, type LifecycleEvent } from './lifecycleEventBus.js';
import { isMemo } from './memo.js';
import { _pushMountEnterFrame } from './mounting.js';
import { _patchChildren } from './patchingChildren.js';
import { acquirePatchFrame, PATCH_ENTER, PATCH_EXIT, type PatchFrame, processStack } from './processStack.js';
import { applyRef } from './ref.js';
import { type SimpRenderRuntime, UPDATING_PHASE } from './runtime.js';
import { _pushUnmountEnterFrame } from './unmounting.js';
import { _clearElementHostReference, _detachElementFromParent, bitScanForwardIndex } from './utils.js';

const patchEnterHandlers = [_patchHostEnter, _patchFCEnter, _patchTextElement, _patchPortalEnter, _patchFragment];
const patchExitHandlers = [_patchHostExit, _patchFCExit, noop, _patchPortalExit, noop];

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: string | null | undefined,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot patch while rendering.');
  }

  _pushPatchEnterFrame(
    nextElement,
    renderRuntime,
    prevElement,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace
  );

  processStack(renderRuntime);
}

export function _pushPatchEnterFrame(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  prevElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: string | null | undefined
): void {
  renderRuntime.renderStack.push(
    acquirePatchFrame(
      renderRuntime,
      element,
      PATCH_ENTER,
      prevElement,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace
    )
  );
}

function _pushPatchExitFrame(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  prevElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: string | null | undefined
): void {
  renderRuntime.renderStack.push(
    acquirePatchFrame(
      renderRuntime,
      element,
      PATCH_EXIT,
      prevElement,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace
    )
  );
}

export function _patchEnter(frame: PatchFrame): void {
  const { prevElement } = frame.meta;

  // Early return if the elements are different type or have different keys.
  if (prevElement.type !== frame.node.type || prevElement.key !== frame.node.key) {
    _replaceWithNewElement(frame);
    return;
  }

  patchEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _patchExit(frame: PatchFrame): void {
  patchExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

function _replaceWithNewElement(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, parentReference, context, hostNamespace, renderRuntime } = frame.meta;

  _pushUnmountEnterFrame(prevElement, renderRuntime);

  nextElement.parent = prevElement.parent;
  if ((nextElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 && (prevElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    _pushHostOperationReplaceElement(nextElement, renderRuntime, parentReference, prevElement);

    _pushMountEnterFrame(nextElement, renderRuntime, null!, null, context, hostNamespace, null);
  } else {
    _clearElementHostReference(prevElement, parentReference, renderRuntime);
    _pushMountEnterFrame(
      nextElement,
      renderRuntime,
      parentReference,
      frame.meta.subtreeRightBoundary,
      context,
      hostNamespace,
      null
    );
  }
}

function _patchHostEnter(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, context, hostNamespace, renderRuntime, subtreeRightBoundary, parentReference } = frame.meta;

  nextElement.ref = prevElement.ref;
  nextElement.reference = prevElement.reference;
  renderRuntime.hostAdapter.attachElementToReference(nextElement, nextElement.reference, renderRuntime);

  _pushPatchExitFrame(
    nextElement,
    renderRuntime,
    prevElement,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace
  );

  _patchChildren(nextElement, {
    prevParentElement: prevElement,
    nextChildren: nextElement.children as Nullable<Many<SimpElement>>,
    prevChildren: prevElement.children as Nullable<Many<SimpElement>>,
    nextParentChildFlag: nextElement.childFlag,
    prevParentChildFlag: prevElement.childFlag,
    subtreeRightBoundary,
    hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(nextElement, hostNamespace)?.children,
    context,
    parentReference: nextElement.reference,
    renderRuntime,
  });
}

function _patchHostExit(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, hostNamespace } = frame.meta;

  renderRuntime.hostAdapter.patchProps(nextElement.reference, prevElement, nextElement, renderRuntime, hostNamespace);

  if (prevElement.className !== nextElement.className) {
    renderRuntime.hostAdapter.setClassname(nextElement.reference, nextElement.className, hostNamespace);
  }

  applyRef(nextElement);
}

function _patchFCEnter(frame: PatchFrame): void {
  const { prevElement, context, renderRuntime, hostNamespace, subtreeRightBoundary, parentReference } = frame.meta;
  const jsxElement = frame.node;

  if (prevElement.unmounted) {
    _pushMountEnterFrame(
      jsxElement,
      renderRuntime,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace,
      null
    );
    return;
  }

  if (hostNamespace) {
    prevElement.hostNamespace = hostNamespace;
  }

  // Replace the short-lived JSX element in the parent's children with the long-lived prevElement.
  if (jsxElement !== prevElement) {
    _swapChildInParent(jsxElement, prevElement);
  }

  // Memo check: compare old props against new props.
  // Self-rerenders (jsxElement === prevElement) always proceed — state may have changed.
  const prevProps = prevElement.props;
  if (
    jsxElement !== prevElement &&
    isMemo(prevElement.type) &&
    prevElement.type._compare(prevProps, jsxElement.props)
  ) {
    return;
  }

  prevElement.props = jsxElement.props;
  prevElement.context = prevElement.context || context;

  // Snapshot before render: captures old childFlag and old children for reconciliation.
  const prevElementSnapshot = { ...prevElement };

  let nextChildren;
  let triedToRerenderUnsubscribe: () => void = noop;

  try {
    renderRuntime.renderPhase = UPDATING_PHASE;
    renderRuntime.currentRenderingFCElement = prevElement;

    let triedToRerender = false;
    let rerenderCounter = 0;
    triedToRerenderUnsubscribe = getLifecycleEventBus(renderRuntime).subscribe(event => {
      if (event.type === 'triedToRerender' && event.element === prevElement) {
        triedToRerender = true;
      }
    });

    do {
      triedToRerender = false;
      if (++rerenderCounter >= 25) {
        throw new Error('Too many re-renders.');
      }
      getLifecycleEventBus(renderRuntime).publish({
        type: 'beforeRender',
        element: prevElement,
        renderRuntime,
      });

      nextChildren = renderRuntime.renderer(prevElement.type as FC, prevElement, renderRuntime);

      getLifecycleEventBus(renderRuntime).publish({
        type: 'afterRender',
        element: prevElement,
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(prevElement, nextChildren, false);
    nextChildren = prevElement.children;
  } catch (error) {
    _detachElementFromParent(prevElement);
    _clearElementHostReference(prevElement, parentReference, renderRuntime);
    _pushUnmountEnterFrame(prevElement, renderRuntime);

    const event: LifecycleEvent = {
      type: 'errored',
      element: prevElement,
      error,
      handled: false,
      renderRuntime,
    };

    getLifecycleEventBus(renderRuntime).publish(event);

    if (!event.handled) {
      throw new Error('Error occurred during rendering a component', { cause: event.error });
    }

    return;
  } finally {
    triedToRerenderUnsubscribe();
    renderRuntime.renderPhase = null;
    renderRuntime.currentRenderingFCElement = null;
  }

  _pushPatchExitFrame(
    prevElement,
    renderRuntime,
    prevElement,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace
  );

  _patchChildren(prevElement, {
    subtreeRightBoundary,
    prevParentChildFlag: prevElementSnapshot.childFlag,
    nextParentChildFlag: prevElement.childFlag,
    prevChildren: prevElementSnapshot.children as Nullable<Many<SimpElement>>,
    nextChildren: nextChildren as Nullable<Many<SimpElement>>,
    renderRuntime,
    hostNamespace,
    parentReference,
    context,
    prevParentElement: prevElementSnapshot,
  });
}

function _patchFCExit(frame: PatchFrame): void {
  getLifecycleEventBus(frame.meta.renderRuntime).publish({
    type: 'updated',
    element: frame.node,
    renderRuntime: frame.meta.renderRuntime,
  });
}

function _swapChildInParent(jsxElement: SimpElement, liveElement: SimpElement): void {
  const parent = jsxElement.parent;
  if (!parent) return;

  liveElement.parent = parent;
  liveElement.index = jsxElement.index;

  if (parent.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
    (parent.children as SimpElement[])[jsxElement.index] = liveElement;
  } else {
    parent.children = liveElement;
  }
}

function _patchTextElement(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime } = frame.meta;

  nextElement.reference = prevElement.reference;

  if (nextElement.children !== prevElement.children) {
    renderRuntime.hostAdapter.setTextContent(nextElement.reference, nextElement.children as string);
  }
}

function _patchPortalEnter(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context, subtreeRightBoundary, hostNamespace, parentReference } = frame.meta;

  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  nextElement.reference = prevElement.reference;

  if (prevContainer !== nextContainer && nextChildren != null) {
    _pushPatchExitFrame(
      nextElement,
      renderRuntime,
      prevElement,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace
    );
  }

  _patchChildren(nextElement, {
    prevParentElement: prevElement,
    context,
    parentReference: nextContainer,
    hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(nextChildren, undefined)?.self,
    renderRuntime,
    prevChildren: prevElement.children as Nullable<Many<SimpElement>>,
    nextChildren,
    nextParentChildFlag: nextElement.childFlag,
    prevParentChildFlag: prevElement.childFlag,
    subtreeRightBoundary,
  });
}

function _patchPortalExit(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime } = frame.meta;
  const nextChildren = nextElement.children as SimpElement;

  renderRuntime.hostAdapter.removeChild(prevElement.ref, nextChildren.reference);
  renderRuntime.hostAdapter.insertOrAppend(nextElement.ref, nextChildren.reference, null);
}

function _patchFragment(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context, parentReference, hostNamespace, subtreeRightBoundary } = frame.meta;

  _patchChildren(nextElement, {
    subtreeRightBoundary,
    context,
    parentReference,
    prevParentChildFlag: prevElement.childFlag,
    nextParentChildFlag: nextElement.childFlag,
    nextChildren: nextElement.children as Nullable<Many<SimpElement>>,
    prevChildren: prevElement.children as Nullable<Many<SimpElement>>,
    renderRuntime,
    hostNamespace,
    prevParentElement: prevElement,
  });
}
