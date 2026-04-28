import type { Maybe, Nullable } from '@simpreact/shared';
import {
  createTextElement,
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationPlaceElement } from './hostOperations.js';
import { type LifecycleEvent, lifecycleEventBus, MOUNTING_PHASE } from './lifecycleEventBus.js';
import {
  MOUNT_ENTER,
  MOUNT_EXIT,
  processStack,
  type SimpRenderFrame,
  type SimpRenderFrameMeta,
} from './processStack.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { bitScanForwardIndex } from './utils.js';

const mountHandlers = [_mountHostElement, _mountFunctionalElement, _mountTextElement, _mountPortal, _mountFragment];

export function mount(
  element: SimpElement,
  parentReference: unknown,
  rightSibling: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot mount while rendering.');
  }

  _pushMountEnterFrame(element, {
    parentReference,
    rightSibling,
    context,
    hostNamespace,
    renderRuntime,
    placeHolderElement: null,
    prevElement: null,
  });

  processStack(renderRuntime);
}

export function _mount(frame: SimpRenderFrame): void {
  mountHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushMountEnterFrame(element: SimpElement, meta: SimpRenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: MOUNT_ENTER,
    meta,
  });
}

function _pushMountExitFrame(element: SimpElement, meta: SimpRenderFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    phase: MOUNT_EXIT,
    meta,
  });
}

export function _pushMountArrayChildrenFrame(element: SimpElement, meta: SimpRenderFrameMeta): void {
  const children = element.children as SimpElement[];

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]!;
    child.parent = element;

    const rightSibling = children[child.index + 1] ?? meta.rightSibling;

    _pushMountEnterFrame(child, { ...meta, rightSibling });
  }
}

function _mountHostElement(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, rightSibling, context, hostNamespace, renderRuntime } = frame.meta;

  if (frame.phase === MOUNT_EXIT) {
    if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_TEXT) {
      renderRuntime.hostAdapter.setTextContent(element.reference, element.props.children);
    }

    if (element.props) {
      renderRuntime.hostAdapter.mountProps(element.reference, element, renderRuntime, hostNamespace);
    }

    if (element.className) {
      renderRuntime.hostAdapter.setClassname(element.reference, element.className, hostNamespace);
    }

    if (parentReference) {
      _pushHostOperationPlaceElement(element, {
        renderRuntime,
        hostNamespace: null,
        rightSibling,
        context: null,
        parentReference,
        placeHolderElement: null,
        prevElement: null,
      });
    }

    applyRef(element);

    return;
  }

  const hostNamespaces = renderRuntime.hostAdapter.getHostNamespaces(element, hostNamespace);
  const hostReference = (element.reference = renderRuntime.hostAdapter.createReference(
    element.type as string,
    hostNamespaces?.self
  ));

  renderRuntime.hostAdapter.attachElementToReference(element, hostReference);

  _pushMountExitFrame(element, {
    renderRuntime,
    hostNamespace: hostNamespaces?.self,
    rightSibling,
    context,
    parentReference,
    placeHolderElement: null,
    prevElement: null,
  });

  switch (element.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      _pushMountArrayChildrenFrame(element, {
        renderRuntime,
        hostNamespace: hostNamespaces?.children,
        rightSibling: null,
        context,
        parentReference: hostReference,
        placeHolderElement: null,
        prevElement: null,
      });
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      (element.children as SimpElement).parent = element;

      _pushMountEnterFrame(element.children as SimpElement, {
        renderRuntime,
        hostNamespace: hostNamespaces?.children,
        rightSibling: null,
        context,
        parentReference: hostReference,
        placeHolderElement: null,
        prevElement: null,
      });
    }
  }
}

function _mountFunctionalElement(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, rightSibling, context, hostNamespace, renderRuntime } = frame.meta;

  if (frame.phase === MOUNT_EXIT) {
    lifecycleEventBus.publish({ type: 'mounted', element, renderRuntime });
    return;
  }

  if (context) {
    element.context = context;
  }

  if (element.unmounted) {
    element.unmounted = false;
  }

  element.store = { latestElement: null, hostNamespace: null };
  element.store.latestElement = element;

  if (hostNamespace) {
    element.store.hostNamespace = hostNamespace;
  }

  // FC element always has Maybe<SimpElement> children due to a normalization process.
  let children;

  let triedToRerenderUnsubscribe: () => void;

  try {
    let triedToRerender = false;
    let rerenderCounter = 0;
    triedToRerenderUnsubscribe = lifecycleEventBus.subscribe(event => {
      if (event.type === 'triedToRerender' && event.element === element) {
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
        element,
        phase: MOUNTING_PHASE,
        renderRuntime,
      });

      children = renderRuntime.renderer(element.type as FC, element);

      lifecycleEventBus.publish({
        type: 'afterRender',
        element,
        phase: MOUNTING_PHASE,
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(element, children, false);
  } catch (error) {
    const event: LifecycleEvent = {
      type: 'errored',
      element,
      error,
      phase: MOUNTING_PHASE,
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

  _pushMountExitFrame(element, {
    renderRuntime,
    hostNamespace: null,
    rightSibling: null,
    context: null,
    parentReference: null,
    placeHolderElement: null,
    prevElement: null,
  });

  if (element.children) {
    const child = element.children as SimpElement;
    child.parent = element;

    _pushMountEnterFrame(child, {
      renderRuntime,
      hostNamespace,
      rightSibling,
      context: element.context,
      parentReference,
      placeHolderElement: null,
      prevElement: null,
    });
  }
}

function _mountTextElement(frame: SimpRenderFrame): void {
  const { renderRuntime, parentReference } = frame.meta;

  frame.node.reference = renderRuntime.hostAdapter.createTextReference(frame.node.children as string);

  _pushHostOperationPlaceElement(frame.node, {
    renderRuntime,
    hostNamespace: null,
    rightSibling: frame.meta.rightSibling,
    context: null,
    parentReference,
    placeHolderElement: null,
    prevElement: null,
  });
}

function _mountPortal(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, rightSibling, context, renderRuntime } = frame.meta;

  if (frame.phase === MOUNT_EXIT) {
    element.reference = frame.meta.placeHolderElement!.reference;
    return;
  }

  const placeHolderElement = createTextElement('');

  _pushMountExitFrame(element, {
    renderRuntime,
    rightSibling: null,
    context: null,
    parentReference: null,
    hostNamespace: null,
    placeHolderElement,
    prevElement: null,
  });

  if (element.children) {
    const child = element.children as SimpElement;
    child.parent = element;

    _pushMountEnterFrame(child, {
      renderRuntime,
      rightSibling: null,
      context,
      parentReference: element.ref,
      hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(child, undefined)?.self,
      placeHolderElement: null,
      prevElement: null,
    });
  }

  _pushMountEnterFrame(placeHolderElement, {
    renderRuntime,
    rightSibling,
    context: null,
    parentReference,
    hostNamespace: null,
    placeHolderElement: null,
    prevElement: null,
  });
}

function _mountFragment(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, hostNamespace, context, renderRuntime, rightSibling } = frame.meta;

  switch (element.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST:
      _pushMountArrayChildrenFrame(element, {
        renderRuntime,
        hostNamespace,
        rightSibling,
        context,
        parentReference,
        placeHolderElement: null,
        prevElement: null,
      });

      break;
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      const child = element.children as SimpElement;
      child.parent = element;
      _pushMountEnterFrame(child, {
        renderRuntime,
        hostNamespace,
        rightSibling,
        context,
        parentReference,
        placeHolderElement: null,
        prevElement: null,
      });
  }
}
