import type { Maybe } from '@simpreact/shared';
import {
  createElementStore,
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
import { mount, mountFunctionalElement } from './mounting.js';
import { patchChildren } from './patchingChildren.js';
import { applyRef } from './ref.js';
import type { SimpRenderRuntime } from './runtime.js';
import { clearElementHostReference, remove, unmount } from './unmounting.js';
import { findHostReferenceFromElement } from './utils.js';

const patchHandlers = [patchHostElement, patchFunctionalComponent, patchTextElement, patchPortal, patchFragment];

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  if (prevElement.type !== nextElement.type || prevElement.key !== nextElement.key) {
    replaceWithNewElement(prevElement, nextElement, parentReference, context, hostNamespace, renderRuntime);
    return;
  }

  const index = Math.log2(nextElement.flag & -nextElement.flag);

  patchHandlers[index]!(
    prevElement,
    nextElement,
    context,
    parentReference,
    hostNamespace,
    nextReference,
    renderRuntime
  );
}

function replaceWithNewElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>,
  renderRuntime: SimpRenderRuntime
): void {
  unmount(prevElement, renderRuntime);

  nextElement.parent = prevElement.parent;
  if ((nextElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 && (prevElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    mount(nextElement, null, null, context, hostNamespace, renderRuntime);
    renderRuntime.hostAdapter.replaceChild(parentReference, nextElement.reference, prevElement.reference);
  } else {
    mount(
      nextElement,
      parentReference,
      findHostReferenceFromElement(prevElement),
      context,
      hostNamespace,
      renderRuntime
    );
    clearElementHostReference(prevElement, parentReference, renderRuntime);
  }
}

function patchHostElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  _parentReference: HostReference,
  hostNamespace: Maybe<string>,
  _nextReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  nextElement.ref = prevElement.ref;
  nextElement.reference = prevElement.reference;
  renderRuntime.hostAdapter.attachElementToReference(nextElement, nextElement.reference);

  const hostNamespaces = renderRuntime.hostAdapter.getHostNamespaces(nextElement, hostNamespace);
  hostNamespace = hostNamespaces?.self;

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children || prevElement.props?.children,
    nextElement.children || nextElement.props?.children,
    null,
    nextElement,
    nextElement.reference,
    context,
    hostNamespaces?.children,
    renderRuntime
  );

  renderRuntime.hostAdapter.patchProps(nextElement.reference, prevElement, nextElement, renderRuntime, hostNamespace);

  if (prevElement.className !== nextElement.className) {
    renderRuntime.hostAdapter.setClassname(nextElement.reference, nextElement.className, hostNamespace);
  }

  applyRef(nextElement);
}

export function patchFunctionalComponent(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  parentReference: HostReference,
  hostNamespace: Maybe<string>,
  nextReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  if (prevElement.unmounted) {
    mountFunctionalElement(nextElement, parentReference, nextReference, context, hostNamespace, renderRuntime);
    return;
  }

  nextElement.store = prevElement.store || createElementStore();
  nextElement.store.latestElement = nextElement;

  if (hostNamespace) {
    nextElement.store.hostNamespace = hostNamespace;
  }

  if (
    isMemo(nextElement.type) &&
    // Only when the elements are the same, we need to rerender the component it means that the element rerenders itself.
    prevElement !== nextElement &&
    nextElement.type._compare(prevElement.props, nextElement.props)
  ) {
    nextElement.childFlag = prevElement.childFlag;
    nextElement.children = prevElement.children;
    nextElement.context = prevElement.context;
    return;
  }

  nextElement.context = prevElement.context || context;

  const { children: prevChildren, childFlag: prevChildFlag } = prevElement;

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
    const parentChildren = prevElement.parent?.children;

    if (prevElement.parent?.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      (parentChildren as SimpElement[]).splice((parentChildren as SimpElement[]).indexOf(prevElement), 1);

      if ((parentChildren as SimpElement[]).length === 1) {
        prevElement.parent.children = (parentChildren as SimpElement[])[0];
        prevElement.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_ELEMENT;
      }
    } else if (prevElement.parent) {
      prevElement.parent.childFlag = SIMP_ELEMENT_CHILD_FLAG_EMPTY;
      prevElement.parent.children = null;
    }

    remove(prevElement, parentReference, renderRuntime);

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

  patchChildren(
    prevChildFlag,
    nextElement.childFlag,
    prevChildren,
    nextElement.children,
    nextReference,
    nextElement,
    parentReference,
    nextElement.context,
    hostNamespace,
    renderRuntime
  );
  lifecycleEventBus.publish({ type: 'updated', element: nextElement, renderRuntime });
}

function patchTextElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  _context: unknown,
  _parentReference: HostReference,
  _hostNamespace: Maybe<string>,
  _nextReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  nextElement.reference = prevElement.reference;

  if (nextElement.children !== prevElement.children) {
    renderRuntime.hostAdapter.setTextContent(nextElement.reference, nextElement.children as string);
  }
}

function patchFragment(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  parentReference: HostReference,
  hostNamespace: Maybe<string>,
  nextReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  nextReference ||= renderRuntime.hostAdapter.findNextSiblingReference(
    findHostReferenceFromElement(prevElement, false)
  );

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children,
    nextElement.children,
    nextReference,
    prevElement,
    parentReference,
    context,
    hostNamespace,
    renderRuntime
  );
}

export function patchPortal(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  _parentReference: HostReference,
  _hostNamespace: Maybe<string>,
  _nextReference: HostReference,
  renderRuntime: SimpRenderRuntime
): void {
  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children,
    nextChildren,
    null,
    prevContainer,
    nextElement,
    context,
    renderRuntime.hostAdapter.getHostNamespaces(nextChildren, undefined)?.self,
    renderRuntime
  );

  nextElement.reference = prevElement.reference;

  if (prevContainer !== nextContainer && nextChildren != null) {
    renderRuntime.hostAdapter.removeChild(prevContainer, nextChildren.reference);
    renderRuntime.hostAdapter.appendChild(nextContainer, nextChildren.reference);
  }
}
