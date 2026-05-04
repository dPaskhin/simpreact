import type { Many, Maybe, Nullable } from '@simpreact/shared';
import {
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_EMPTY,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationReplaceElement } from './hostOperations.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import { isMemo } from './memo.js';
import { _pushMountEnterFrame } from './mounting.js';
import { _pushPatchChildrenFrame } from './patchingChildren.js';
import { PATCH_ENTER, PATCH_EXIT, type PatchFrame, type PatchFrameMeta, processStack } from './processStack.js';
import { applyRef } from './ref.js';
import { type SimpRenderRuntime, UPDATING_PHASE } from './runtime.js';
import { _pushUnmountEnterFrame } from './unmounting.js';
import { _clearElementHostReference, bitScanForwardIndex } from './utils.js';

const patchHandlers = [_patchHostElement, _patchFunctionalComponent, _patchTextElement, _patchPortal, _patchFragment];

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot patch while rendering.');
  }

  _pushPatchEnterFrame(nextElement, {
    prevElement,
    parentReference,
    renderRuntime,
    subtreeRightBoundary,
    context,
    hostNamespace,
  });

  processStack(renderRuntime);
}

export function _pushPatchEnterFrame(element: SimpElement, meta: PatchFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: PATCH_ENTER,
    meta,
  });
}

export function _pushPatchExitFrame(element: SimpElement, meta: PatchFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: PATCH_EXIT,
    meta,
  });
}

export function _patch(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement } = frame.meta;

  // Early return if the elements are different type or have different keys.
  if (prevElement.type !== nextElement.type || prevElement.key !== nextElement.key) {
    _replaceWithNewElement(frame);
    return;
  }

  patchHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

function _replaceWithNewElement(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, parentReference, context, hostNamespace, renderRuntime } = frame.meta;

  _pushUnmountEnterFrame(prevElement, frame.meta);

  nextElement.parent = prevElement.parent;
  if ((nextElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 && (prevElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    _pushHostOperationReplaceElement(nextElement, renderRuntime, {
      prevElement,
      parentReference,
    });

    _pushMountEnterFrame(nextElement, {
      context,
      hostNamespace,
      renderRuntime,
      parentReference: null!,
      subtreeRightBoundary: null,
      placeHolderElement: null,
    });
  } else {
    _clearElementHostReference(prevElement, parentReference, renderRuntime);
    _pushMountEnterFrame(nextElement, {
      subtreeRightBoundary: frame.meta.subtreeRightBoundary,
      renderRuntime,
      hostNamespace,
      context,
      parentReference,
      placeHolderElement: null,
    });
  }
}

function _patchHostElement(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, context, hostNamespace, renderRuntime, subtreeRightBoundary, parentReference } = frame.meta;

  if (frame.kind === PATCH_EXIT) {
    renderRuntime.hostAdapter.patchProps(nextElement.reference, prevElement, nextElement, renderRuntime, hostNamespace);

    if (prevElement.className !== nextElement.className) {
      renderRuntime.hostAdapter.setClassname(nextElement.reference, nextElement.className, hostNamespace);
    }

    applyRef(nextElement);

    return;
  }

  nextElement.ref = prevElement.ref;
  nextElement.reference = prevElement.reference;
  renderRuntime.hostAdapter.attachElementToReference(nextElement, nextElement.reference, renderRuntime);

  _pushPatchExitFrame(nextElement, {
    prevElement,
    renderRuntime,
    hostNamespace,
    subtreeRightBoundary,
    context,
    parentReference,
  });

  _pushPatchChildrenFrame(nextElement, {
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

function _patchFunctionalComponent(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, context, renderRuntime, hostNamespace, subtreeRightBoundary, parentReference } = frame.meta;

  if (frame.kind === PATCH_EXIT) {
    lifecycleEventBus.publish({ type: 'updated', element: nextElement, renderRuntime });
    return;
  }

  if (prevElement.unmounted) {
    _pushMountEnterFrame(nextElement, {
      subtreeRightBoundary,
      renderRuntime,
      hostNamespace,
      context,
      parentReference,
      placeHolderElement: null,
    });
    return;
  }

  nextElement.store = prevElement.store!;
  nextElement.store.latestElement = nextElement;

  if (hostNamespace) {
    nextElement.store.hostNamespace = hostNamespace;
  }

  if (
    isMemo(nextElement.type) &&
    !nextElement.store.forceRerender &&
    nextElement.type._compare(prevElement.props, nextElement.props)
  ) {
    nextElement.childFlag = prevElement.childFlag;
    nextElement.children = prevElement.children;
    nextElement.context = prevElement.context;
    return;
  }

  nextElement.context = prevElement.context || context;

  const prevElementSnapshot = prevElement === nextElement ? { ...prevElement } : prevElement;

  let nextChildren;
  let triedToRerenderUnsubscribe;

  try {
    renderRuntime.renderPhase = UPDATING_PHASE;
    renderRuntime.currentRenderingFCElement = nextElement;

    let triedToRerender = false;
    let rerenderCounter = 0;
    triedToRerenderUnsubscribe = lifecycleEventBus.subscribe(event => {
      if (event.type === 'triedToRerender' && event.element === nextElement) {
        triedToRerender = true;
      }
    });

    do {
      triedToRerender = false;
      if (++rerenderCounter >= 25) {
        throw new Error('Too many re-renders.');
      }
      lifecycleEventBus.publish({
        type: 'beforeRender',
        element: nextElement,
        renderRuntime,
      });

      nextChildren = renderRuntime.renderer(nextElement.type as FC, nextElement, renderRuntime);

      lifecycleEventBus.publish({
        type: 'afterRender',
        element: nextElement,
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(nextElement, nextChildren, false);
    nextChildren = nextElement.children;
  } catch (error) {
    const parentChildren = prevElement.parent?.children;

    if (prevElement.parent?.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      const parentChildrenList = parentChildren as SimpElement[];
      parentChildrenList.splice(prevElement.index, 1);

      if (parentChildrenList.length === 1) {
        prevElement.parent.children = parentChildrenList[0];
        prevElement.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
      } else {
        for (let i = prevElement.index; i < parentChildrenList.length; i++) {
          parentChildrenList[i]!.index = i;
        }
      }
    } else if (prevElement.parent) {
      prevElement.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
      prevElement.parent.children = null;
    }

    _clearElementHostReference(prevElement, parentReference, renderRuntime);
    _pushUnmountEnterFrame(prevElement, frame.meta);

    const event: LifecycleEvent = {
      type: 'errored',
      element: nextElement,
      error,
      handled: false,
      renderRuntime,
    };

    lifecycleEventBus.publish(event);

    if (!event.handled) {
      throw new Error('Error occurred during rendering a component', { cause: event.error });
    }

    return;
  } finally {
    triedToRerenderUnsubscribe!();
    renderRuntime.renderPhase = null;
    renderRuntime.currentRenderingFCElement = null;
  }

  _pushPatchExitFrame(nextElement, {
    prevElement,
    renderRuntime,
    hostNamespace,
    subtreeRightBoundary,
    context,
    parentReference,
  });

  _pushPatchChildrenFrame(nextElement, {
    subtreeRightBoundary,
    prevParentChildFlag: prevElementSnapshot.childFlag,
    nextParentChildFlag: nextElement.childFlag,
    prevChildren: prevElementSnapshot.children as Nullable<Many<SimpElement>>,
    nextChildren: nextChildren as Nullable<Many<SimpElement>>,
    renderRuntime,
    hostNamespace,
    parentReference,
    context,
    prevParentElement: prevElementSnapshot,
  });
}

function _patchTextElement(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime } = frame.meta;

  nextElement.reference = prevElement.reference;

  if (nextElement.children !== prevElement.children) {
    renderRuntime.hostAdapter.setTextContent(nextElement.reference, nextElement.children as string);
  }
}

function _patchPortal(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context, subtreeRightBoundary, hostNamespace, parentReference } = frame.meta;

  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  if (frame.kind === PATCH_EXIT) {
    renderRuntime.hostAdapter.removeChild(prevContainer, nextChildren.reference);
    renderRuntime.hostAdapter.insertOrAppend(nextContainer, nextChildren.reference, null);
    return;
  }

  nextElement.reference = prevElement.reference;

  if (prevContainer !== nextContainer && nextChildren != null) {
    _pushPatchExitFrame(nextElement, {
      prevElement,
      renderRuntime,
      hostNamespace,
      subtreeRightBoundary,
      context,
      parentReference,
    });
  }

  _pushPatchChildrenFrame(nextElement, {
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

function _patchFragment(frame: PatchFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context, parentReference, hostNamespace, subtreeRightBoundary } = frame.meta;

  _pushPatchChildrenFrame(nextElement, {
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
