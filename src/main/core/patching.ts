import type { Maybe, Nullable } from '@simpreact/shared';
import {
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_EMPTY,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_FLAG_HOST,
  type SimpElement,
} from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import { isMemo } from './memo.js';
import { _pushMountFrame } from './mounting.js';
import { _pushPatchChildrenFrame } from './patchingChildren.js';
import {
  findNextLogicalSibling,
  HOST_OPS_REPLACE_CHILD,
  MOUNT_ENTER,
  PATCH_CHILDREN,
  PATCH_ENTER,
  PATCH_EXIT,
  processStack,
  type RenderFrame,
  UNMOUNT_ENTER,
} from './processStack.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { _clearElementHostReference, _pushUnmountFrame, _remove } from './unmounting.js';
import { bitScanForwardIndex } from './utils.js';

const patchHandlers = [_patchHostElement, _patchFunctionalComponent, _patchTextElement, _patchPortal, _patchFragment];

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  parentAnchorReference: HostReference,
  rightSibling: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.size !== 0) {
    throw new Error('Cannot patch while rendering.');
  }

  _pushPatchFrame({
    node: nextElement,
    phase: PATCH_ENTER,
    meta: {
      prevElement,
      parentReference,
      renderRuntime,
      parentAnchorReference,
      rightSibling,
      context,
      hostNamespace,
      placeHolderElement: null,
    },
  });

  processStack(renderRuntime);
}

export function _pushPatchFrame(frame: RenderFrame): void {
  frame.meta.renderRuntime.renderStack.push(frame);
}

export function _patch(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement } = frame.meta;

  // Early return if the elements are different type or have different keys.
  if (prevElement!.type !== nextElement.type || prevElement!.key !== nextElement.key) {
    _replaceWithNewElement(frame);
    return;
  }

  patchHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

function _replaceWithNewElement(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, parentReference, context, hostNamespace, renderRuntime } = frame.meta;

  _pushUnmountFrame({
    node: prevElement!,
    phase: UNMOUNT_ENTER,
    meta: {
      prevElement,
      renderRuntime,
      parentReference,
      parentAnchorReference: null,
      rightSibling: null,
      hostNamespace,
      placeHolderElement: null,
      context: null,
    },
  });

  nextElement.parent = prevElement!.parent;
  if ((nextElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 && (prevElement!.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    renderRuntime.renderStack.push({
      node: nextElement,
      phase: HOST_OPS_REPLACE_CHILD,
      meta: {
        prevElement,
        renderRuntime,
        parentReference,
        parentAnchorReference: null,
        rightSibling: null,
        hostNamespace: null,
        placeHolderElement: null,
        context: null,
      },
    });

    _pushMountFrame({
      node: nextElement,
      phase: MOUNT_ENTER,
      meta: {
        prevElement: null,
        parentAnchorReference: null,
        rightSibling: null,
        renderRuntime,
        hostNamespace,
        placeHolderElement: null,
        context,
        parentReference: null,
      },
    });
  } else {
    _clearElementHostReference(prevElement, parentReference, renderRuntime);
    _pushMountFrame({
      node: nextElement,
      phase: MOUNT_ENTER,
      meta: {
        prevElement: null,
        parentAnchorReference: frame.meta.parentAnchorReference,
        rightSibling: frame.meta.rightSibling || findNextLogicalSibling(nextElement),
        renderRuntime,
        hostNamespace,
        placeHolderElement: null,
        context,
        parentReference,
      },
    });
  }
}

function _patchHostElement(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, context, hostNamespace, renderRuntime } = frame.meta;

  if (frame.phase === PATCH_EXIT) {
    renderRuntime.hostAdapter.patchProps(
      nextElement.reference,
      prevElement!,
      nextElement,
      renderRuntime,
      hostNamespace
    );

    if (prevElement!.className !== nextElement.className) {
      renderRuntime.hostAdapter.setClassname(nextElement.reference, nextElement.className, hostNamespace);
    }

    applyRef(nextElement);

    return;
  }

  nextElement.ref = prevElement!.ref;
  nextElement.reference = prevElement!.reference;
  renderRuntime.hostAdapter.attachElementToReference(nextElement, nextElement.reference);

  renderRuntime.renderStack.push({
    node: nextElement,
    phase: PATCH_EXIT,
    meta: {
      prevElement,
      renderRuntime,
      hostNamespace,
      parentAnchorReference: null,
      rightSibling: null,
      context: null,
      parentReference: null,
      placeHolderElement: null,
    },
  });

  _pushPatchChildrenFrame({
    node: nextElement,
    phase: PATCH_CHILDREN,
    meta: {
      prevElement,
      renderRuntime,
      hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(nextElement, hostNamespace)?.children,
      parentAnchorReference: null,
      rightSibling: null,
      context,
      parentReference: nextElement.reference,
      placeHolderElement: null,
    },
  });
}

function _patchFunctionalComponent(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, context, renderRuntime, hostNamespace, parentAnchorReference, rightSibling, parentReference } =
    frame.meta;

  if (frame.phase === PATCH_EXIT) {
    lifecycleEventBus.publish({ type: 'updated', element: nextElement, renderRuntime });
    return;
  }

  if (prevElement!.unmounted) {
    _pushMountFrame({
      node: nextElement,
      phase: MOUNT_ENTER,
      meta: {
        parentAnchorReference,
        rightSibling,
        renderRuntime,
        hostNamespace,
        context,
        parentReference,
        placeHolderElement: null,
        prevElement: null,
      },
    });
    return;
  }

  nextElement.store = prevElement!.store || { latestElement: null, hostNamespace: null };
  nextElement.store.latestElement = nextElement;

  if (hostNamespace) {
    nextElement.store.hostNamespace = hostNamespace;
  }

  if (
    isMemo(nextElement.type) &&
    !nextElement.type._isForcedUpdate &&
    nextElement.type._compare(prevElement!.props, nextElement.props)
  ) {
    nextElement.childFlag = prevElement!.childFlag;
    nextElement.children = prevElement!.children;
    nextElement.context = prevElement!.context;
    return;
  }

  if (isMemo(nextElement.type)) {
    nextElement.type._isForcedUpdate = false;
  }

  nextElement.context = prevElement!.context || context;

  const { children: prevChildren, childFlag: prevChildFlag } = prevElement!;

  let nextChildren;
  let triedToRerenderUnsubscribe;

  try {
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
        phase: 'updating',
        renderRuntime,
      });

      nextChildren = renderRuntime.renderer(nextElement.type as FC, nextElement);

      lifecycleEventBus.publish({
        type: 'afterRender',
        element: nextElement,
        phase: 'updating',
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(nextElement, nextChildren, false);
  } catch (error) {
    const parentChildren = prevElement!.parent?.children;

    if (prevElement!.parent?.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      (parentChildren as SimpElement[]).splice((parentChildren as SimpElement[]).indexOf(prevElement!), 1);

      if ((parentChildren as SimpElement[]).length === 1) {
        prevElement!.parent.children = (parentChildren as SimpElement[])[0];
        prevElement!.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
      }
    } else if (prevElement!.parent) {
      prevElement!.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
      prevElement!.parent.children = null;
    }

    _remove(prevElement!, parentReference, renderRuntime);

    const event: LifecycleEvent = {
      type: 'errored',
      element: nextElement,
      error,
      phase: 'updating',
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
  }

  renderRuntime.renderStack.push({
    node: nextElement,
    phase: PATCH_EXIT,
    meta: {
      prevElement,
      renderRuntime,
      hostNamespace,
      parentAnchorReference: null,
      rightSibling: null,
      context: null,
      parentReference: null,
      placeHolderElement: null,
    },
  });

  _pushPatchChildrenFrame({
    node: nextElement,
    phase: PATCH_CHILDREN,
    meta: {
      // TODO: avoid creating a new object here
      prevElement: { ...prevElement, children: prevChildren, childFlag: prevChildFlag } as SimpElement,
      renderRuntime,
      hostNamespace,
      parentAnchorReference,
      rightSibling,
      context,
      parentReference,
      placeHolderElement: null,
    },
  });
}

function _patchTextElement(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime } = frame.meta;

  nextElement.reference = prevElement!.reference;

  if (nextElement.children !== prevElement!.children) {
    renderRuntime.hostAdapter.setTextContent(nextElement.reference, nextElement.children as string);
  }
}

function _patchPortal(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context } = frame.meta;

  const prevContainer = prevElement!.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  if (frame.phase === PATCH_EXIT) {
    renderRuntime.hostAdapter.removeChild(prevContainer, nextChildren.reference);
    renderRuntime.hostAdapter.appendChild(nextContainer, nextChildren.reference);
    return;
  }

  nextElement.reference = prevElement!.reference;

  if (prevContainer !== nextContainer && nextChildren != null) {
    _pushPatchFrame({
      node: nextElement,
      phase: PATCH_EXIT,
      meta: {
        prevElement,
        renderRuntime,
        hostNamespace: null,
        parentAnchorReference: null,
        rightSibling: null,
        context: null,
        parentReference: null,
        placeHolderElement: null,
      },
    });
  }

  _pushPatchChildrenFrame({
    node: nextElement,
    phase: PATCH_CHILDREN,
    meta: {
      prevElement,
      renderRuntime,
      hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(nextChildren, undefined)?.self,
      parentAnchorReference: null,
      rightSibling: null,
      context,
      parentReference: nextContainer,
      placeHolderElement: null,
    },
  });
}

function _patchFragment(frame: RenderFrame): void {
  const nextElement = frame.node;
  const { prevElement, renderRuntime, context, parentAnchorReference, parentReference, hostNamespace } = frame.meta;

  let rightSibling = frame.meta.rightSibling || findNextLogicalSibling(nextElement);

  _pushPatchChildrenFrame({
    node: nextElement,
    phase: PATCH_CHILDREN,
    meta: {
      prevElement,
      parentReference,
      parentAnchorReference,
      rightSibling,
      context,
      renderRuntime,
      hostNamespace,
      placeHolderElement: null,
    },
  });
}
