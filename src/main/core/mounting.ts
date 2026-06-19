import type { Many, Maybe, Nullable } from '@simpreact/shared';
import { noop } from '@simpreact/shared';
import {
  createTextElement,
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import { _pushHostOperationPlaceElement } from './hostOperations.js';
import { getLifecycleEventBus, type LifecycleEvent } from './lifecycleEventBus.js';
import { _pushMountChildrenFrame } from './mountingChildren.js';
import { MOUNT_ENTER, MOUNT_EXIT, type MountFrame, type MountFrameMeta, processStack } from './processStack.js';
import { applyRef } from './ref.js';
import { MOUNTING_PHASE, type SimpRenderRuntime } from './runtime.js';
import { bitScanForwardIndex } from './utils.js';

const mountHandlers = [_mountHostElement, _mountFunctionalElement, _mountTextElement, _mountPortal, _mountFragment];

export function mount(
  element: SimpElement,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (renderRuntime.renderStack.length !== 0) {
    throw new Error('Cannot mount while rendering.');
  }

  _pushMountEnterFrame(element, {
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace,
    renderRuntime,
    placeHolderElement: null,
  });

  processStack(renderRuntime);
}

export function _mount(frame: MountFrame): void {
  mountHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushMountEnterFrame(element: SimpElement, meta: MountFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: MOUNT_ENTER,
    meta,
  });
}

function _pushMountExitFrame(element: SimpElement, meta: MountFrameMeta): void {
  meta.renderRuntime.renderStack.push({
    node: element,
    kind: MOUNT_EXIT,
    meta,
  });
}

function _mountHostElement(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame.meta;

  if (frame.kind === MOUNT_EXIT) {
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
        subtreeRightBoundary,
        parentReference,
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

  renderRuntime.hostAdapter.attachElementToReference(element, hostReference, renderRuntime);

  _pushMountExitFrame(element, {
    renderRuntime,
    hostNamespace: hostNamespaces?.self,
    subtreeRightBoundary,
    context,
    parentReference,
    placeHolderElement: null,
  });

  _pushMountChildrenFrame(element, {
    renderRuntime,
    hostNamespace: hostNamespaces?.children,
    subtreeRightBoundary,
    context,
    parentReference: hostReference,
    children: element.children as Nullable<Many<SimpElement>>,
  });
}

function _mountFunctionalElement(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame.meta;

  if (frame.kind === MOUNT_EXIT) {
    getLifecycleEventBus(renderRuntime).publish({ type: 'mounted', element, renderRuntime });
    return;
  }

  if (context) {
    element.context = context;
  }

  if (element.unmounted) {
    element.unmounted = false;
  }

  element.store = { latestElement: null, hostNamespace: null, forceRerender: false };
  element.store.latestElement = element;

  if (hostNamespace) {
    element.store.hostNamespace = hostNamespace;
  }

  // FC element always has Maybe<SimpElement> children due to a normalization process.
  let children;

  let triedToRerenderUnsubscribe: () => void = noop;

  try {
    renderRuntime.renderPhase = MOUNTING_PHASE;
    renderRuntime.currentRenderingFCElement = element;

    let triedToRerender = false;
    let rerenderCounter = 0;
    triedToRerenderUnsubscribe = getLifecycleEventBus(renderRuntime).subscribe(event => {
      if (event.type === 'triedToRerender' && event.element === element) {
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
        element,
        renderRuntime,
      });

      children = renderRuntime.renderer(element.type as FC, element, renderRuntime);

      getLifecycleEventBus(renderRuntime).publish({
        type: 'afterRender',
        element,
        renderRuntime,
      });
    } while (triedToRerender);

    normalizeRoot(element, children, false);
    children = element.children;
  } catch (error) {
    const event: LifecycleEvent = {
      type: 'errored',
      element,
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

  _pushMountExitFrame(element, {
    renderRuntime,
    hostNamespace,
    subtreeRightBoundary,
    context,
    parentReference,
    placeHolderElement: null,
  });

  _pushMountChildrenFrame(element, {
    renderRuntime,
    hostNamespace,
    children: children as Nullable<SimpElement>,
    context: element.context,
    parentReference,
    subtreeRightBoundary,
  });
}

function _mountTextElement(frame: MountFrame): void {
  frame.node.reference = frame.meta.renderRuntime.hostAdapter.createTextReference(frame.node.children as string);
  _pushHostOperationPlaceElement(frame.node, frame.meta);
}

function _mountPortal(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, renderRuntime } = frame.meta;

  if (frame.kind === MOUNT_EXIT) {
    element.reference = frame.meta.placeHolderElement!.reference;
    return;
  }

  const placeHolderElement = createTextElement('');

  _pushMountExitFrame(element, {
    renderRuntime,
    subtreeRightBoundary,
    context: null,
    parentReference: null,
    hostNamespace: null,
    placeHolderElement,
  });

  _pushMountChildrenFrame(element, {
    renderRuntime,
    hostNamespace: renderRuntime.hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self,
    subtreeRightBoundary,
    context,
    parentReference: element.ref,
    children: element.children as SimpElement,
  });

  _pushMountEnterFrame(placeHolderElement, {
    renderRuntime,
    subtreeRightBoundary,
    context: null,
    parentReference,
    hostNamespace: null,
    placeHolderElement: null,
  });
}

function _mountFragment(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, hostNamespace, context, renderRuntime, subtreeRightBoundary } = frame.meta;

  _pushMountChildrenFrame(element, {
    renderRuntime,
    hostNamespace,
    children: element.children as Nullable<Many<SimpElement>>,
    parentReference,
    context,
    subtreeRightBoundary: subtreeRightBoundary,
  });
}
