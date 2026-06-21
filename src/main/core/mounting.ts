import type { Many, Maybe, Nullable } from '@simpreact/shared';
import { noop } from '@simpreact/shared';
import {
  createTextElement,
  type FC,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  type SimpElement,
} from './createElement.js';
import { pushHostOperationPlaceElement } from './hostOperations.js';
import { getLifecycleEventBus, type LifecycleEvent } from './lifecycleEventBus.js';
import { pushMountChildrenFrame } from './mountingChildren.js';
import { acquireMountFrame, MOUNT_ENTER, MOUNT_EXIT, processStack, type SimpRenderFrame } from './processStack.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { bitScanForwardIndex } from './utils.js';

const mountEnterHandlers = [mountHostEnter, mountFCEnter, mountTextElement, mountPortalEnter, mountFragment];
const mountExitHandlers = [mountHostExit, mountFCExit, noop, mountPortalExit, noop];

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

  pushMountEnterFrame(element, renderRuntime, parentReference, subtreeRightBoundary, context, hostNamespace, null);

  processStack(renderRuntime);
}

export function mountEnter(frame: SimpRenderFrame): void {
  mountEnterHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function mountExit(frame: SimpRenderFrame): void {
  mountExitHandlers[bitScanForwardIndex(frame.node.flag)]!(frame);
}

export function pushMountEnterFrame(
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

function pushMountExitFrame(
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

function mountHostEnter(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame;

  const hostNamespaces = renderRuntime.hostAdapter.getHostNamespaces(element, hostNamespace);
  const hostReference = (element.reference = renderRuntime.hostAdapter.createReference(
    element.type as string,
    hostNamespaces?.self
  ));

  renderRuntime.hostAdapter.attachElementToReference(element, hostReference, renderRuntime);

  pushMountExitFrame(
    element,
    renderRuntime,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespaces?.self,
    null
  );

  pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as Nullable<Many<SimpElement>>,
    hostReference,
    subtreeRightBoundary,
    context,
    hostNamespaces?.children
  );
}

function mountHostExit(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, hostNamespace, renderRuntime } = frame;

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
    pushHostOperationPlaceElement(element, renderRuntime, parentReference, subtreeRightBoundary);
  }

  applyRef(element);
}

function mountFCEnter(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, hostNamespace, renderRuntime } = frame;

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

  try {
    let rerenderCounter = 0;
    renderRuntime.activeRenderElement = element;
    renderRuntime.pendingRerenderFlag = false;

    do {
      renderRuntime.pendingRerenderFlag = false;
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
    } while (renderRuntime.pendingRerenderFlag);

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
    renderRuntime.activeRenderElement = null;
  }

  pushMountExitFrame(element, renderRuntime, parentReference, subtreeRightBoundary, context, hostNamespace, null);

  pushMountChildrenFrame(
    element,
    renderRuntime,
    children as Nullable<SimpElement>,
    parentReference,
    subtreeRightBoundary,
    element.context,
    hostNamespace
  );
}

function mountFCExit(frame: SimpRenderFrame): void {
  getLifecycleEventBus(frame.renderRuntime).publish({
    type: 'mounted',
    element: frame.node,
    renderRuntime: frame.renderRuntime,
  });
}

function mountTextElement(frame: SimpRenderFrame): void {
  frame.node.reference = frame.renderRuntime.hostAdapter.createTextReference(frame.node.children as string);
  pushHostOperationPlaceElement(frame.node, frame.renderRuntime, frame.parentReference, frame.subtreeRightBoundary);
}

function mountPortalEnter(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, subtreeRightBoundary, context, renderRuntime } = frame;

  const placeHolderElement = createTextElement('');

  pushMountExitFrame(element, renderRuntime, null!, subtreeRightBoundary, null, null, placeHolderElement);

  pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as SimpElement,
    element.ref,
    subtreeRightBoundary,
    context,
    renderRuntime.hostAdapter.getHostNamespaces(element.children as SimpElement, undefined)?.self
  );

  pushMountEnterFrame(placeHolderElement, renderRuntime, parentReference, subtreeRightBoundary, null, null, null);
}

function mountPortalExit(frame: SimpRenderFrame): void {
  frame.node.reference = frame.placeHolderElement!.reference;
}

function mountFragment(frame: SimpRenderFrame): void {
  const element = frame.node;
  const { parentReference, hostNamespace, context, renderRuntime, subtreeRightBoundary } = frame;

  pushMountChildrenFrame(
    element,
    renderRuntime,
    element.children as Nullable<Many<SimpElement>>,
    parentReference,
    subtreeRightBoundary,
    context,
    hostNamespace
  );
}
