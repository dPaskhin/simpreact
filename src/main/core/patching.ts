import { emptyObject, type Maybe, type Nullable } from '@simpreact/shared';
import { isComponentElement } from './component.js';
import {
  createElementStore,
  type Key,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_PORTAL,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
  type SimpNode,
} from './createElement.js';
import { type HostReference, hostAdapter } from './hostAdapter.js';
import { type LifecycleEvent, lifecycleEventBus } from './lifecycleEventBus.js';
import { isMemo } from './memo.js';
import { mount, mountArrayChildren, mountFunctionalElement } from './mounting.js';
import { applyRef } from './ref.js';
import { clearElementHostReference, remove, unmount } from './unmounting.js';

const patchHandlers = [patchHostElement, patchFunctionalComponent, patchTextElement, patchPortal, patchFragment];

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  if (prevElement.type !== nextElement.type || prevElement.key !== nextElement.key) {
    replaceWithNewElement(prevElement, nextElement, parentReference, context, hostNamespace);
    return;
  }

  const index = Math.log2(nextElement.flag & -nextElement.flag);

  patchHandlers[index]!(prevElement, nextElement, context, parentReference, hostNamespace, nextReference);
}

function replaceWithNewElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  unmount(prevElement);

  nextElement.parent = prevElement.parent;
  if ((nextElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0 && (prevElement.flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
    mount(nextElement, null, null, context, hostNamespace);
    hostAdapter.replaceChild(parentReference, nextElement.reference, prevElement.reference);
  } else {
    mount(nextElement, parentReference, findHostReferenceFromElement(prevElement), context, hostNamespace);
    clearElementHostReference(prevElement, parentReference);
  }
}

function patchHostElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  _parentReference: HostReference,
  hostNamespace: Maybe<string>
): void {
  nextElement.ref = prevElement.ref;
  nextElement.reference = prevElement.reference;
  hostAdapter.attachElementToReference(nextElement, nextElement.reference);

  const hostNamespaces = hostAdapter.getHostNamespaces(nextElement, hostNamespace);
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
    hostNamespaces?.children
  );

  hostAdapter.patchProps(nextElement.reference, prevElement, nextElement, hostNamespace);

  if (prevElement.className !== nextElement.className) {
    hostAdapter.setClassname(nextElement.reference, nextElement.className, hostNamespace);
  }

  applyRef(nextElement);
}

function patchFunctionalComponent(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  parentReference: HostReference,
  hostNamespace: Maybe<string>,
  nextReference: Nullable<HostReference>
): void {
  if (prevElement.unmounted) {
    mountFunctionalElement(nextElement, parentReference, nextReference, context, hostNamespace);
    return;
  }

  nextElement.store = prevElement.store || createElementStore();
  nextElement.store.latestElement = nextElement;

  if (hostNamespace) {
    nextElement.store.hostNamespace = hostNamespace;
  }

  if (
    isMemo(nextElement.type) &&
    // TODO: replace with a comparing the prev and next elements cause its a unique way when we need to forcly rerender the component.
    !nextElement.type._forceRender &&
    nextElement.type._compare(prevElement.props, nextElement.props)
  ) {
    nextElement.children = prevElement.children;
    nextElement.context = prevElement.context;
    return;
  }

  if (isMemo(nextElement.type)) {
    nextElement.type._forceRender = false;
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
      });
      nextChildren = isComponentElement(nextElement)
        ? (nextElement.type as any)(nextElement.props || emptyObject, nextElement.store.componentStore?.renderContext)
        : (nextElement.type as any)(nextElement.props || emptyObject);
      lifecycleEventBus.publish({
        type: 'afterRender',
        element: nextElement,
        phase: 'updating',
      });
    } while (triedToRerender);

    normalizeRoot(nextElement, nextChildren, false);
  } catch (error) {
    const parentChildren = prevElement.parent?.children;

    if (prevElement.parent?.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
      (parentChildren as SimpElement[]).splice((parentChildren as SimpElement[]).indexOf(prevElement), 1);
    } else if (prevElement.parent) {
      prevElement.parent.children = null;
    }

    remove(prevElement, parentReference);

    const event: LifecycleEvent = { type: 'errored', element: nextElement, error, phase: 'updating', handled: false };

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
    hostNamespace
  );
  lifecycleEventBus.publish({ type: 'updated', element: nextElement });
}

function patchTextElement(prevElement: SimpElement, nextElement: SimpElement): void {
  nextElement.reference = prevElement.reference;

  if (nextElement.children !== prevElement.children) {
    hostAdapter.setTextContent(nextElement.reference, nextElement.children as string);
  }
}

function patchFragment(
  prevElement: SimpElement,
  nextElement: SimpElement,
  context: unknown,
  parentReference: HostReference,
  hostNamespace: Maybe<string>
): void {
  let nextReference: Nullable<HostReference> = null;

  if (
    prevElement.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST &&
    nextElement.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT
  ) {
    nextReference = hostAdapter.findNextSiblingReference(
      findHostReferenceFromElement((prevElement.children as SimpElement[]).at(-1)!)
    );
  }

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children,
    nextElement.children,
    nextReference,
    nextElement,
    parentReference,
    context,
    hostNamespace
  );
}

export function patchPortal(prevElement: SimpElement, nextElement: SimpElement, context: unknown): void {
  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children,
    nextChildren,
    null,
    prevContainer as HostReference,
    nextElement,
    context,
    hostAdapter.getHostNamespaces(nextChildren, undefined)?.self
  );

  nextElement.reference = prevElement.reference;

  if (prevContainer !== nextContainer && nextChildren != null) {
    hostAdapter.removeChild(prevContainer, nextChildren.reference);
    hostAdapter.appendChild(nextContainer, nextChildren.reference);
  }
}

export function updateFunctionalComponent(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  patchFunctionalComponent(element, element, context, parentReference, hostNamespace, nextReference);
}

function patchChildren(
  prevChildFlag: number,
  nextChildFlag: number,
  prevChildren: SimpNode,
  nextChildren: SimpNode,
  nextReference: Nullable<HostReference>,
  parentElement: SimpElement,
  parentReference: HostReference,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  switch (prevChildFlag) {
    case SIMP_ELEMENT_CHILD_FLAG_LIST: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          for (const child of nextChildren as SimpElement[]) {
            (child as SimpElement).parent = parentElement;
          }
          patchKeyedChildren(
            prevChildren as SimpElement[],
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          patchKeyedChildren(
            prevChildren as SimpElement[],
            [nextChildren] as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          unmount(prevChildren as SimpElement[]);
          hostAdapter.setTextContent(parentReference, nextChildren as string);
          break;
        }
        default: {
          unmount(prevChildren as SimpElement[]);
          hostAdapter.clearNode(parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          patchKeyedChildren(
            [prevChildren] as SimpElement[],
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;
          patch(
            prevChildren as SimpElement,
            nextChildren as SimpElement,
            parentReference,
            nextReference,
            context,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          unmount(prevChildren as SimpElement);
          hostAdapter.setTextContent(parentReference, nextChildren as string);
          break;
        }
        default: {
          remove(prevChildren as SimpElement, parentReference);
        }
      }
      break;
    }
    case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
      if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_LIST) {
        hostAdapter.clearNode(parentReference);
        mountArrayChildren(
          nextChildren as SimpElement[],
          parentReference,
          nextReference,
          context,
          parentElement,
          hostNamespace
        );
        break;
      } else if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
        hostAdapter.clearNode(parentReference);
        (nextChildren as SimpElement).parent = parentReference;
        mount(nextChildren as SimpElement, parentReference, nextReference, context, hostNamespace);
      } else if (nextChildFlag === SIMP_ELEMENT_CHILD_FLAG_TEXT) {
        if (prevChildren !== nextChildren) {
          hostAdapter.setTextContent(parentReference, nextChildren as string, true);
        }
      }
      break;
    }
    default: {
      switch (nextChildFlag) {
        case SIMP_ELEMENT_CHILD_FLAG_LIST: {
          mountArrayChildren(
            nextChildren as SimpElement[],
            parentReference,
            nextReference,
            context,
            parentElement,
            hostNamespace
          );
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_ELEMENT: {
          (nextChildren as SimpElement).parent = parentElement;
          mount(nextChildren as SimpElement, parentReference, nextReference, context, hostNamespace);
          break;
        }
        case SIMP_ELEMENT_CHILD_FLAG_TEXT: {
          hostAdapter.setTextContent(parentReference, nextChildren as string);
        }
      }
    }
  }
}

export function patchKeyedChildren(
  prevChildren: SimpElement[],
  nextChildren: SimpElement[],
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  context: unknown,
  hostNamespace: Maybe<string>
): void {
  let prevStart = 0;
  let nextStart = 0;
  let prevEnd = prevChildren.length - 1;
  let nextEnd = nextChildren.length - 1;

  // Step 1: Sync from start
  while (
    prevStart <= prevEnd &&
    nextStart <= nextEnd &&
    prevChildren[prevStart]!.key === nextChildren[nextStart]!.key
  ) {
    patch(prevChildren[prevStart]!, nextChildren[nextStart]!, parentReference, null, context, hostNamespace);
    prevStart++;
    nextStart++;
  }

  // Step 2: Sync from end
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    patch(prevChildren[prevEnd]!, nextChildren[nextEnd]!, parentReference, null, context, hostNamespace);
    prevEnd--;
    nextEnd--;
  }

  // Step 3: Mount new nodes if prev list is exhausted
  if (prevStart > prevEnd) {
    const before = findHostReferenceFromElement(nextChildren[nextEnd + 1]!) || nextReference;
    for (let i = nextStart; i <= nextEnd; i++) {
      mount(nextChildren[i]!, parentReference, before, context, hostNamespace);
    }
    // Step 4: Remove prev nodes if next list is exhausted
  } else if (nextStart > nextEnd) {
    for (let i = prevStart; i <= prevEnd; i++) {
      remove(prevChildren[i]!, parentReference);
    }
  }

  // Step 5: Full diff with keyed lookup and movement
  else {
    // Create map of keys to indices for prev children
    const keyToPrevIndexMap = new Map<Key, number>();
    for (let i = prevStart; i <= prevEnd; i++) {
      const key = prevChildren[i]!.key;
      if (key != null) {
        keyToPrevIndexMap.set(key, i);
      }
    }

    // Track reused indices and move plan
    const toMove = new Array(nextEnd - nextStart + 1);
    const usedIndices = new Set<number>();

    // Match and patch/mount
    for (let i = nextStart; i <= nextEnd; i++) {
      const nextChild = nextChildren[i];
      const prevIndex = keyToPrevIndexMap.get(nextChild!.key!);
      if (prevIndex != null) {
        const prevElement = prevChildren[prevIndex];
        patch(prevElement!, nextChild!, parentReference, null, context, hostNamespace);
        toMove[i - nextStart] = prevIndex;
        usedIndices.add(prevIndex);
      } else {
        mount(
          nextChild!,
          parentReference,
          findHostReferenceFromElement(nextChildren[i + 1]!) || nextReference,
          context,
          hostNamespace
        );
        toMove[i - nextStart] = -1;
      }
    }

    // Remove nodes not matched
    for (let i = prevStart; i <= prevEnd; i++) {
      if (!usedIndices.has(i)) {
        remove(prevChildren[i]!, parentReference);
      }
    }

    // Insert in correct order
    for (let i = nextEnd; i >= nextStart; i--) {
      const currentChild = nextChildren[i]!;
      const reference = findHostReferenceFromElement(nextChildren[i + 1]!) || nextReference;
      if (toMove[i - nextStart] !== -1) {
        hostAdapter.insertBefore(parentReference, currentChild.reference!, reference!);
      }
    }
  }
}

export function findParentReferenceFromElement(element: SimpElement): Nullable<HostReference> {
  let flag: number;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if ((flag & SIMP_ELEMENT_FLAG_HOST) !== 0) {
      return temp.reference as HostReference;
    }

    temp = temp.parent;
  }

  return null;
}

export function findHostReferenceFromElement(element: SimpElement): Nullable<HostReference> {
  let flag: number;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if (
      (flag & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
      (flag & SIMP_ELEMENT_FLAG_PORTAL) !== 0
    ) {
      return temp.reference as HostReference;
    }

    temp =
      temp.childFlag === SIMP_ELEMENT_CHILD_FLAG_LIST
        ? (temp.children as SimpElement[])[0]!
        : (temp.children as SimpElement);
  }

  return null;
}
