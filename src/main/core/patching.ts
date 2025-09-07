import type { Maybe, Nullable } from '@simpreact/shared';
import { emptyMap, emptyObject } from '@simpreact/shared';

import type { FC, Key, SimpElement, SimpElementFlag, SimpNode } from './createElement.js';
import { normalizeRoot } from './createElement.js';
import type { HostReference } from './hostAdapter.js';
import { hostAdapter } from './hostAdapter.js';
import { clearElementHostReference, remove, unmount } from './unmounting.js';
import { mount, mountArrayChildren } from './mounting.js';
import type { SimpContext, SimpContextMap } from './context.js';
import { applyRef } from './ref.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { syncBatchingRerenderLocker } from './rerender.js';

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  if (prevElement.type !== nextElement.type || prevElement.key !== nextElement.key) {
    replaceWithNewElement(prevElement, nextElement, parentReference, contextMap, hostNamespace);
  } else if (nextElement.flag === 'HOST') {
    patchHostElement(prevElement, nextElement, contextMap, hostNamespace);
  } else if (nextElement.flag === 'FC') {
    patchFunctionalComponent(prevElement, nextElement, parentReference, nextReference, contextMap, hostNamespace);
  } else if (nextElement.flag === 'TEXT') {
    patchTextElement(prevElement, nextElement);
  } else if (nextElement.flag === 'FRAGMENT') {
    patchFragment(prevElement, nextElement, parentReference, contextMap, hostNamespace);
  } else if (nextElement.flag === 'PROVIDER') {
    patchProvider(prevElement, nextElement, parentReference, contextMap, hostNamespace);
  } else if (nextElement.flag === 'PORTAL') {
    patchPortal(prevElement, nextElement, contextMap);
  } else {
    patchConsumer(prevElement, nextElement, parentReference, nextReference, contextMap, hostNamespace);
  }
}

function replaceWithNewElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  unmount(prevElement);

  nextElement.parent = prevElement.parent;
  if (nextElement.flag === 'HOST' && prevElement.flag === 'HOST') {
    mount(nextElement, null, null, contextMap, hostNamespace);
    hostAdapter.replaceChild(parentReference, nextElement.reference, prevElement.reference);
  } else {
    mount(nextElement, parentReference, findHostReferenceFromElement(prevElement), contextMap, hostNamespace);
    clearElementHostReference(prevElement, parentReference);
  }
}

function patchHostElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  if (prevElement.ref) {
    nextElement.ref = prevElement.ref;
  }

  const hostNamespaces = hostAdapter.getHostNamespaces(nextElement, hostNamespace);
  hostNamespace = hostNamespaces?.self;

  nextElement.reference = prevElement.reference;

  hostAdapter.attachElementToReference(nextElement, nextElement.reference);

  patchChildren(
    prevElement.children || prevElement.props?.children,
    nextElement.children || nextElement.props?.children,
    nextElement.reference,
    null,
    nextElement,
    contextMap,
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
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  (nextElement.store = !prevElement.store || prevElement.unmounted ? {} : prevElement.store).latestElement =
    nextElement;

  if (hostNamespace) {
    nextElement.store.hostNamespace = hostNamespace;
  }

  if (contextMap) {
    nextElement.contextMap = contextMap;
  }

  // FC element always has Maybe<SimpElement> children due to normalization process.
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
        lifecycleEventBus.publish({
          type: 'errored',
          element: nextElement,
          error: new Error('Too many re-renders. SimpReact limits the number of renders to prevent an infinite loop.'),
          phase: 'updating',
        });
        return;
      }
      lifecycleEventBus.publish({ type: 'beforeRender', element: nextElement, phase: 'updating' });
      syncBatchingRerenderLocker.lock();
      nextChildren = (nextElement.type as FC)(nextElement.props || emptyObject);
      syncBatchingRerenderLocker.flush();
      lifecycleEventBus.publish({ type: 'afterRender', element: nextElement, phase: 'updating' });
    } while (triedToRerender);

    nextChildren = normalizeRoot(nextChildren, false);
  } catch (error) {
    lifecycleEventBus.publish({ type: 'errored', element: nextElement, error, phase: 'updating' });
    return;
  } finally {
    triedToRerenderUnsubscribe!();
  }

  const prevChildren = prevElement.children;

  if (nextChildren) {
    nextElement.children = nextChildren;
  }

  if (!prevElement.unmounted) {
    patchChildren(prevChildren, nextChildren, parentReference, nextReference, nextElement, contextMap, hostNamespace);
    lifecycleEventBus.publish({ type: 'updated', element: nextElement });
    return;
  }

  prevElement.unmounted = false;

  if (nextChildren) {
    nextChildren.parent = nextElement;
    mount(nextChildren, parentReference, nextReference, contextMap, hostNamespace);
  }

  lifecycleEventBus.publish({ type: 'mounted', element: nextElement });
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
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  let nextReference: Nullable<HostReference> = null;

  if (Array.isArray(prevElement.children) && !Array.isArray(nextElement.children) && nextElement.children) {
    nextReference = hostAdapter.findNextSiblingReference(
      findHostReferenceFromElement(prevElement.children[prevElement.children.length - 1] as SimpElement)
    );
  }

  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    nextElement,
    contextMap,
    hostNamespace
  );
}

function patchProvider(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  let nextReference: Nullable<HostReference> = null;

  if (Array.isArray(prevElement.children) && !Array.isArray(nextElement.children) && nextElement.children) {
    nextReference = hostAdapter.findNextSiblingReference(
      findHostReferenceFromElement(prevElement.children[prevElement.children.length - 1] as SimpElement)
    );
  }

  contextMap = new Map(contextMap);
  contextMap.set((nextElement.type as any).context, nextElement.props.value);

  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    nextElement,
    contextMap,
    hostNamespace
  );
}

function patchConsumer(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  const children = normalizeRoot(
    (nextElement.type as SimpContext<any>['Consumer'])(nextElement.props || emptyObject, contextMap || emptyMap),
    false
  );

  if (children) {
    nextElement.children = children;
  }

  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    nextElement,
    contextMap,
    hostNamespace
  );
}

export function patchPortal(
  prevElement: SimpElement,
  nextElement: SimpElement,
  contextMap: Nullable<SimpContextMap>
): void {
  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  patchChildren(
    prevElement.children,
    nextChildren,
    prevContainer as HostReference,
    null,
    nextElement,
    contextMap,
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
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  patchFunctionalComponent(element, element, parentReference, nextReference, contextMap, hostNamespace);
}

function patchChildren(
  prevChildren: SimpNode,
  nextChildren: SimpNode,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  nextElement: SimpElement,
  contextMap: Nullable<SimpContextMap>,
  hostNamespace: Maybe<string>
): void {
  if (Array.isArray(prevChildren)) {
    if (Array.isArray(nextChildren)) {
      for (const child of nextChildren) {
        (child as SimpElement).parent = nextElement;
      }
      patchKeyedChildren(
        prevChildren as SimpElement[],
        nextChildren as SimpElement[],
        parentReference,
        nextReference,
        contextMap,
        hostNamespace
      );
    } else if (typeof nextChildren === 'string') {
      unmount(prevChildren as SimpElement[]);
      hostAdapter.setTextContent(parentReference, nextChildren);
    } else if (nextChildren) {
      patchKeyedChildren(
        prevChildren as SimpElement[],
        [nextChildren] as SimpElement[],
        parentReference,
        nextReference,
        contextMap,
        hostNamespace
      );
    } else {
      unmount(prevChildren as SimpElement[]);
      hostAdapter.clearNode(parentReference);
    }
  } else if (typeof prevChildren === 'string') {
    if (Array.isArray(nextChildren)) {
      hostAdapter.clearNode(parentReference);
      mountArrayChildren(
        nextChildren as SimpElement[],
        parentReference,
        nextReference,
        contextMap,
        nextElement,
        hostNamespace
      );
    } else if (typeof nextChildren === 'string') {
      if (prevChildren !== nextChildren) {
        hostAdapter.setTextContent(nextElement.reference, nextChildren as string, true);
      }
    } else if (nextChildren) {
      hostAdapter.clearNode(parentReference);
      (nextChildren as SimpElement).parent = nextElement;
      mount(nextChildren as SimpElement, parentReference, nextReference, contextMap, hostNamespace);
    } else {
      hostAdapter.clearNode(parentReference);
    }
  } else if (prevChildren) {
    if (Array.isArray(nextChildren)) {
      patchKeyedChildren(
        [prevChildren] as SimpElement[],
        nextChildren as SimpElement[],
        parentReference,
        nextReference,
        contextMap,
        hostNamespace
      );
    } else if (typeof nextChildren === 'string') {
      unmount(prevChildren as SimpElement);
      hostAdapter.setTextContent(parentReference, nextChildren);
    } else if (nextChildren) {
      (nextChildren as SimpElement).parent = nextElement;
      patch(
        prevChildren as SimpElement,
        nextChildren as SimpElement,
        parentReference,
        nextReference,
        contextMap,
        hostNamespace
      );
    } else {
      remove(prevChildren as SimpElement, parentReference);
    }
  } else {
    if (Array.isArray(nextChildren)) {
      mountArrayChildren(
        nextChildren as SimpElement[],
        parentReference,
        nextReference,
        contextMap,
        nextElement,
        hostNamespace
      );
    } else if (typeof nextChildren === 'string') {
      hostAdapter.setTextContent(parentReference, nextChildren);
    } else if (nextChildren) {
      (nextChildren as SimpElement).parent = nextElement;
      mount(nextChildren as SimpElement, parentReference, nextReference, contextMap, hostNamespace);
    }
  }
}

export function patchKeyedChildren(
  prevChildren: SimpElement[],
  nextChildren: SimpElement[],
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>,
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
    patch(prevChildren[prevStart]!, nextChildren[nextStart]!, parentReference, null, contextMap, hostNamespace);
    prevStart++;
    nextStart++;
  }

  // Step 2: Sync from end
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    patch(prevChildren[prevEnd]!, nextChildren[nextEnd]!, parentReference, null, contextMap, hostNamespace);
    prevEnd--;
    nextEnd--;
  }

  // Step 3: Mount new nodes if prev list is exhausted
  if (prevStart > prevEnd) {
    const before = findHostReferenceFromElement(nextChildren[nextEnd + 1]!) || nextReference;
    for (let i = nextStart; i <= nextEnd; i++) {
      mount(nextChildren[i]!, parentReference, before, contextMap, hostNamespace);
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
        patch(prevElement!, nextChild!, parentReference, null, contextMap, hostNamespace);
        toMove[i - nextStart] = prevIndex;
        usedIndices.add(prevIndex);
      } else {
        mount(
          nextChild!,
          parentReference,
          findHostReferenceFromElement(nextChildren[i + 1]!) || nextReference,
          contextMap,
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
  let flag: SimpElementFlag;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if (flag === 'HOST') {
      return temp.reference as HostReference;
    }

    temp = temp.parent;
  }

  return null;
}

export function findHostReferenceFromElement(element: SimpElement): Nullable<HostReference> {
  let flag: SimpElementFlag;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if (flag === 'HOST' || flag === 'TEXT' || flag === 'PORTAL') {
      return temp.reference as HostReference;
    }

    temp = (Array.isArray(temp.children) ? temp.children[0] : temp.children) as SimpElement;
  }

  return null;
}
