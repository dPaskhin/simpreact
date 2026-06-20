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
import { acquireMountFrame, MOUNT_ENTER, MOUNT_EXIT, type MountFrame, processStack } from './processStack.js';
import { applyRef } from './ref.js';
import { MOUNTING_PHASE, type SimpRenderRuntime } from './runtime.js';
import { bitScanForwardIndex } from './utils.js';

const mountEnterHandlers = [_mountHostEnter, _mountFCEnter, _mountTextElement, _mountPortalEnter, _mountFragment];
const mountExitHandlers = [_mountHostExit, _mountFCExit, noop, _mountPortalExit, noop];

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

  _pushMountEnterFrame(element, renderRuntime, parentReference, subtreeRightBoundary, context, hostNamespace, null);

  processStack(renderRuntime);
}

export function _mountEnter(frame: MountFrame): void {
  mountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _mountExit(frame: MountFrame): void {
  mountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function _pushMountEnterFrame(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  placeHolderElement: Nullable<SimpElement>
): void {
  renderRuntime.renderStack.push(
    acquireMountFrame(
      renderRuntime,
      element,
      MOUNT_ENTER,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace,
      placeHolderElement
    )
  );
}

function _pushMountExitFrame(
  element: SimpElement,
  renderRuntime: SimpRenderRuntime,
  parentReference: unknown,
  subtreeRightBoundary: Nullable<SimpElement>,
  context: unknown,
  hostNamespace: Maybe<string>,
  placeHolderElement: Nullable<SimpElement>
): void {
  renderRuntime.renderStack.push(
    acquireMountFrame(
      renderRuntime,
      element,
      MOUNT_EXIT,
      parentReference,
      subtreeRightBoundary,
      context,
      hostNamespace,
      placeHolderElement
    )
  );
}

function _mountHostEnter(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame.meta;

  const hostNamespaces = renderRuntime.hostAdapter.getHostNamespaces(element, hostNamespace);
  const hostReference = (element.reference = renderRuntime.hostAdapter.createReference(
    element.type as string,
    hostNamespaces?.self
  ));

  renderRuntime.hostAdapter.attachElementToReference(element, hostReference, renderRuntime);

  _pushMountExitFrame(
    element,
    renderRuntime,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespaces?.self,
    null
  );

  _pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as Nullable<Many<SimpElement>>,
    hostReference,
    subtreeRightBoundary,
    context,
    hostNamespaces?.children
  );
}

function _mountHostExit(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, hostNamespace, renderRuntime } = frame.meta;

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
    _pushHostOperationPlaceElement(element, renderRuntime, parentReference, subtreeRightBoundary);
  }

  applyRef(element);
}

function _mountFCEnter(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame.meta;

  if (context) {
    element.context = context;
  }

  if (element.unmounted) {
    element.unmounted = false;
  }

  if (hostNamespace) {
    element.hostNamespace = hostNamespace;
  }

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

  _pushMountExitFrame(element, renderRuntime, parentReference, subtreeRightBoundary, context, hostNamespace, null);

  _pushMountChildrenFrame(
    element,
    renderRuntime,
    children as Nullable<SimpElement>,
    parentReference,
    subtreeRightBoundary,
    element.context,
    hostNamespace
  );
}

function _mountFCExit(frame: MountFrame): void {
  getLifecycleEventBus(frame.meta.renderRuntime).publish({
    type: 'mounted',
    element: frame.node,
    renderRuntime: frame.meta.renderRuntime,
  });
}

function _mountTextElement(frame: MountFrame): void {
  frame.node.reference = frame.meta.renderRuntime.hostAdapter.createTextReference(frame.node.children as string);
  _pushHostOperationPlaceElement(
    frame.node,
    frame.meta.renderRuntime,
    frame.meta.parentReference,
    frame.meta.subtreeRightBoundary
  );
}

function _mountPortalEnter(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, renderRuntime } = frame.meta;

  const placeHolderElement = createTextElement('');

  _pushMountExitFrame(element, renderRuntime, null!, subtreeRightBoundary, null, null, placeHolderElement);

  _pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as SimpElement,
    element.ref,
    subtreeRightBoundary,
    context,
    renderRuntime.hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self
  );

  _pushMountEnterFrame(placeHolderElement, renderRuntime, parentReference, subtreeRightBoundary, null, null, null);
}

function _mountPortalExit(frame: MountFrame): void {
  frame.node.reference = frame.meta.placeHolderElement!.reference;
}

function _mountFragment(frame: MountFrame): void {
  const element = frame.node;
  const { parentReference, hostNamespace, context, renderRuntime, subtreeRightBoundary } = frame.meta;

  _pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as Nullable<Many<SimpElement>>,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace
  );
}
