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
import type { HostReference } from './hostAdapter.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import {
  HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
  MOUNT_ENTER,
  MOUNT_EXIT,
  processStack,
  type RenderFrame,
} from './processStack.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { bitScanForwardIndex } from './utils.js';

const mountHandlers = [_mountHostElement, _mountFunctionalElement, _mountTextElement, _mountPortal, _mountFragment];

export function mount(
  element: SimpElement,
  parentReference: HostReference,
  parentAnchorReference: HostReference,
  rightSibling: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.size !== 0) {
    throw new Error('Cannot mount while rendering.');
  }

  _pushMountFrame({
    node: element,
    phase: MOUNT_ENTER,
    meta: {
      parentReference,
      renderRuntime,
      parentAnchorReference,
      rightSibling,
      context,
      hostNamespace,
      prevElement: null,
      placeHolderElement: null,
    },
  });

  processStack(renderRuntime);
}

export function _mount(frame: RenderFrame): void {
  mountHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushMountFrame(frame: RenderFrame): void {
  frame.meta.renderRuntime.renderStack.push(frame);
}

export function _pushMountArrayChildrenFrame(frame: RenderFrame): void {
  const children = frame.node.children as SimpElement[];
  const { parentReference, parentAnchorReference, context, hostNamespace, renderRuntime } = frame.meta;

  let rightSibling = frame.meta.rightSibling;

  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]!;
    child.parent = frame.node;

    _pushMountFrame({
      node: child,
      phase: MOUNT_ENTER,
      meta: {
        prevElement: null,
        parentReference,
        parentAnchorReference,
        rightSibling,
        context,
        hostNamespace,
        renderRuntime,
        placeHolderElement: null,
      },
    });

    rightSibling = child;
  }
}

function _mountHostElement(frame: RenderFrame): void {
  const element = frame.node;
  const { parentReference, parentAnchorReference, rightSibling, context, hostNamespace, renderRuntime } = frame.meta;

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
      renderRuntime.renderStack.push({
        node: element,
        phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
        meta: {
          renderRuntime,
          hostNamespace: null,
          parentAnchorReference,
          rightSibling,
          context: null,
          parentReference,
          placeHolderElement: null,
          prevElement: null,
        },
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

  renderRuntime.renderStack.push({
    node: element,
    phase: MOUNT_EXIT,
    meta: {
      renderRuntime,
      hostNamespace: hostNamespaces?.self,
      parentAnchorReference,
      rightSibling,
      context,
      parentReference,
      placeHolderElement: null,
      prevElement: null,
    },
  });

  switch (element.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      _pushMountArrayChildrenFrame({
        node: element,
        phase: MOUNT_ENTER,
        meta: {
          renderRuntime,
          hostNamespace: hostNamespaces?.children,
          parentAnchorReference: null,
          rightSibling: null,
          context,
          parentReference: hostReference,
          placeHolderElement: null,
          prevElement: null,
        },
      });
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      (element.children as SimpElement).parent = element;
      _pushMountFrame({
        node: element.children as SimpElement,
        phase: MOUNT_ENTER,
        meta: {
          renderRuntime,
          hostNamespace: hostNamespaces?.children,
          parentAnchorReference: null,
          rightSibling: null,
          context,
          parentReference: hostReference,
          placeHolderElement: null,
          prevElement: null,
        },
      });
    }
  }
}

function _mountFunctionalElement(frame: RenderFrame): void {
  const element = frame.node;
  const { parentReference, parentAnchorReference, rightSibling, context, hostNamespace, renderRuntime } = frame.meta;

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
        phase: 'mounting',
        renderRuntime,
      });

      children = renderRuntime.renderer(element.type as FC, element);

      lifecycleEventBus.publish({
        type: 'afterRender',
        element,
        phase: 'mounting',
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(element, children, false);
  } catch (error) {
    const event: LifecycleEvent = { type: 'errored', element, error, phase: 'mounting', handled: false, renderRuntime };

    lifecycleEventBus.publish(event);

    if (!event.handled) {
      throw new Error('Error occurred during rendering a component', { cause: event.error });
    }

    return;
  } finally {
    triedToRerenderUnsubscribe!();
  }

  renderRuntime.renderStack.push({
    node: element,
    phase: MOUNT_EXIT,
    meta: {
      renderRuntime,
      hostNamespace: null,
      parentAnchorReference: null,
      rightSibling: null,
      context: null,
      parentReference: null,
      placeHolderElement: null,
      prevElement: null,
    },
  });

  if (element.children) {
    const child = element.children as SimpElement;
    child.parent = element;
    renderRuntime.renderStack.push({
      node: child,
      phase: MOUNT_ENTER,
      meta: {
        renderRuntime,
        hostNamespace,
        parentAnchorReference,
        rightSibling,
        context: element.context,
        parentReference,
        placeHolderElement: null,
        prevElement: null,
      },
    });
  }
}

function _mountTextElement(frame: RenderFrame): void {
  const { renderRuntime, parentReference, parentAnchorReference } = frame.meta;

  frame.node.reference = renderRuntime.hostAdapter.createTextReference(frame.node.children as string);

  renderRuntime.renderStack.push({
    node: frame.node,
    phase: HOST_OPS_PLACE_ELEMENT_BEFORE_ANCHOR,
    meta: {
      renderRuntime,
      hostNamespace: null,
      parentAnchorReference,
      rightSibling: frame.meta.rightSibling,
      context: null,
      parentReference,
      placeHolderElement: null,
      prevElement: null,
    },
  });
}

function _mountPortal(frame: RenderFrame): void {
  const element = frame.node;
  const { parentReference, parentAnchorReference, rightSibling, context, renderRuntime } = frame.meta;

  if (frame.phase === MOUNT_EXIT) {
    element.reference = frame.meta.placeHolderElement!.reference;
    return;
  }

  const placeHolderElement = createTextElement('');

  renderRuntime.renderStack.push({
    node: element,
    phase: MOUNT_EXIT,
    meta: {
      renderRuntime,
      parentAnchorReference: null,
      rightSibling: null,
      context: null,
      parentReference: null,
      hostNamespace: null,
      placeHolderElement,
      prevElement: null,
    },
  });

  if (element.children) {
    const child = element.children as SimpElement;
    child.parent = element;

    renderRuntime.renderStack.push({
      node: child,
      phase: MOUNT_ENTER,
      meta: {
        renderRuntime,
        parentAnchorReference: null,
        rightSibling: null,
        context,
        parentReference: element.ref,
        hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(child, undefined)?.self,
        placeHolderElement: null,
        prevElement: null,
      },
    });
  }

  renderRuntime.renderStack.push({
    node: placeHolderElement,
    phase: MOUNT_ENTER,
    meta: {
      renderRuntime,
      parentAnchorReference,
      rightSibling,
      context: null,
      parentReference,
      hostNamespace: null,
      placeHolderElement: null,
      prevElement: null,
    },
  });
}

function _mountFragment(frame: RenderFrame): void {
  const element = frame.node;
  const { parentReference, parentAnchorReference, hostNamespace, context, renderRuntime, rightSibling } = frame.meta;

  switch (element.childFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST:
      _pushMountArrayChildrenFrame({
        node: element,
        phase: MOUNT_ENTER,
        meta: {
          renderRuntime,
          hostNamespace,
          parentAnchorReference,
          rightSibling,
          context,
          parentReference,
          placeHolderElement: null,
          prevElement: null,
        },
      });

      break;
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT:
      const child = element.children as SimpElement;
      child.parent = element;
      renderRuntime.renderStack.push({
        node: child,
        phase: MOUNT_ENTER,
        meta: {
          renderRuntime,
          hostNamespace,
          parentAnchorReference,
          rightSibling,
          context,
          parentReference,
          placeHolderElement: null,
          prevElement: null,
        },
      });
  }
}
