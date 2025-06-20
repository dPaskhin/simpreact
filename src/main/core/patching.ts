import type { Nullable } from '@simpreact/shared';
import { EMPTY_MAP, EMPTY_OBJECT, isPrimitive } from '@simpreact/shared';

import type { FC, Key, SimpElement, SimpElementFlag, SimpNode } from './createElement';
import { normalizeRoot } from './createElement';
import type { HostReference } from './hostAdapter';
import { hostAdapter } from './hostAdapter';
import { clearElementHostReference, remove, removeAllChildren, unmount, unmountAllChildren } from './unmounting';
import { mount, mountArrayChildren } from './mounting';
import type { SimpContext, SimpContextMap } from './context';
import { applyRef } from './ref';
import { lifecycleEventBus } from './lifecycleEventBus';

export function patch(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  if (prevElement.type !== nextElement.type || prevElement.key !== nextElement.key) {
    replaceWithNewElement(prevElement, nextElement, parentReference, contextMap);
  } else if (nextElement.flag === 'HOST') {
    patchHostElement(prevElement, nextElement, contextMap);
  } else if (nextElement.flag === 'FC') {
    patchFunctionalComponent(prevElement, nextElement, parentReference, nextReference, contextMap);
  } else if (nextElement.flag === 'TEXT') {
    patchText(prevElement, nextElement);
  } else if (nextElement.flag === 'FRAGMENT') {
    patchFragment(prevElement, nextElement, parentReference, nextReference, contextMap);
  } else if (nextElement.flag === 'PROVIDER') {
    patchProvider(prevElement, nextElement, parentReference, nextReference, contextMap);
  } else if (nextElement.flag === 'PORTAL') {
    patchPortal(prevElement, nextElement, contextMap);
  } else {
    patchConsumer(prevElement, nextElement, parentReference, nextReference, contextMap);
  }
}

function replaceWithNewElement(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>
): void {
  unmount(prevElement);

  nextElement.parent = prevElement.parent;
  if (nextElement.flag === 'HOST' && prevElement.flag === 'HOST') {
    mount(nextElement, null, null, contextMap);
    hostAdapter.replaceChild(parentReference, nextElement.reference, prevElement.reference);
  } else {
    mount(nextElement, parentReference, findHostReferenceFromElement(prevElement), contextMap);
    clearElementHostReference(prevElement, parentReference);
  }
}

function patchHostElement(prevElement: SimpElement, nextElement: SimpElement, contextMap: Nullable<SimpContextMap>) {
  if (prevElement.ref != null) {
    nextElement.ref = prevElement.ref;
  }

  const hostReference = (nextElement.reference = prevElement.reference)!;

  hostAdapter.attachElementToReference(nextElement, hostReference);

  const prevProps = prevElement.props;
  const nextProps = nextElement.props;

  for (const propName in nextProps) {
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (prevValue !== nextValue) {
      hostAdapter.patchProp(hostReference, propName, prevValue, nextValue);
    }
  }

  for (const propName in prevProps) {
    if (nextProps[propName] == null && prevProps[propName] != null) {
      hostAdapter.patchProp(hostReference, propName, prevProps[propName], null);
    }
  }

  if (prevElement.className !== nextElement.className) {
    hostAdapter.setClassname(hostReference, nextElement.className);
  }

  patchChildren(prevElement.children, nextElement.children, hostReference, null, prevElement, nextElement, contextMap);

  applyRef(nextElement);
}

function patchFunctionalComponent(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  if (prevElement.store != null) {
    nextElement.store = prevElement.store;
  }

  if (contextMap) {
    nextElement.contextMap = contextMap;
  }

  lifecycleEventBus.publish({ type: 'beforeRender', element: nextElement });
  const nextChildren = normalizeRoot((nextElement.type as FC)(nextElement.props || EMPTY_OBJECT));
  lifecycleEventBus.publish({ type: 'afterRender' });

  patchChildren(
    prevElement.children,
    nextChildren,
    parentReference,
    nextReference,
    prevElement,
    nextElement,
    contextMap
  );

  if (nextChildren != null) {
    nextElement.children = nextChildren;
  }

  lifecycleEventBus.publish({ type: 'mounted', element: nextElement });
}

function patchText(prevElement: SimpElement, nextElement: SimpElement): void {
  const nextText = nextElement.children as string;
  const reference = (nextElement.reference = prevElement.reference);

  hostAdapter.attachElementToReference(nextElement, reference);

  if (nextText !== prevElement.children) {
    hostAdapter.setTextContent(reference!, nextText);
  }
}

function patchFragment(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    prevElement,
    nextElement,
    contextMap
  );
}

function patchProvider(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  contextMap = new Map(contextMap);

  contextMap.set((nextElement.type as any).context, nextElement.props.value);

  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    prevElement,
    nextElement,
    contextMap
  );
}

function patchConsumer(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  const children = normalizeRoot(
    (nextElement.type as SimpContext<any>['Consumer'])(nextElement.props || EMPTY_OBJECT, contextMap || EMPTY_MAP)
  );

  if (children != null) {
    nextElement.children = children;
  }

  patchChildren(
    prevElement.children,
    nextElement.children,
    parentReference,
    nextReference,
    prevElement,
    nextElement,
    contextMap
  );
}

function patchPortal(prevElement: SimpElement, nextElement: SimpElement, contextMap: Nullable<SimpContextMap>): void {
  const prevContainer = prevElement.ref;
  const nextContainer = nextElement.ref;
  const nextChildren = nextElement.children as SimpElement;

  patchChildren(
    prevElement.children,
    nextChildren,
    prevContainer as HostReference,
    null,
    prevElement,
    nextElement,
    contextMap
  );

  if (prevContainer !== nextContainer && nextChildren != null) {
    hostAdapter.removeChild(prevContainer, nextChildren.reference);
    hostAdapter.appendChild(nextContainer, nextChildren.reference);
  }
}

export function updateFunctionalComponent(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  patch(element, element, parentReference, nextReference, contextMap);
}

function patchChildren(
  prevChildren: SimpNode,
  nextChildren: SimpNode,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  parentElement: SimpElement,
  nextElement: SimpElement,
  contextMap: Nullable<SimpContextMap>
): void {
  if (Array.isArray(prevChildren)) {
    if (Array.isArray(nextChildren)) {
      const prevChildrenLength = (prevChildren as SimpElement[]).length;
      const nextChildrenLength = (nextChildren as SimpElement[]).length;

      if (prevChildrenLength === 0) {
        if (nextChildrenLength > 0) {
          mountArrayChildren(nextChildren as SimpElement[], parentReference, nextReference, contextMap, nextElement);
        }
      } else if (nextChildrenLength === 0) {
        removeAllChildren(parentReference, parentElement, prevChildren as SimpElement[]);
      } else {
        for (const child of nextChildren) {
          (child as SimpElement).parent = nextElement;
        }
        patchKeyedChildren(
          prevChildren as SimpElement[],
          nextChildren as SimpElement[],
          parentReference,
          nextReference,
          contextMap
        );
      }
    } else if (isPrimitive(nextChildren)) {
      unmountAllChildren(prevChildren as SimpElement[]);
      hostAdapter.setTextContent(parentReference, (nextChildren || '') as string);
    } else {
      removeAllChildren(parentReference, parentElement, prevChildren as SimpElement[]);
      (nextChildren as SimpElement).parent = nextElement;
      mount(nextChildren as SimpElement, parentReference, nextReference, contextMap);
    }
  } else if (isPrimitive(prevChildren)) {
    if (Array.isArray(nextChildren)) {
      hostAdapter.clearNode(parentReference);
      mountArrayChildren(nextChildren as SimpElement[], parentReference, nextReference, contextMap, nextElement);
    } else if (isPrimitive(nextChildren)) {
      patchSingleTextChild(prevChildren as string, nextChildren as string, parentReference);
    } else {
      hostAdapter.clearNode(parentReference);
      nextChildren.parent = nextElement;
      mount(nextChildren, parentReference, nextReference, contextMap);
    }
  } else {
    if (Array.isArray(nextChildren)) {
      replaceOneElementWithMultipleElements(
        prevChildren,
        nextChildren as SimpElement[],
        parentReference,
        contextMap,
        nextElement
      );
    } else if (isPrimitive(nextChildren)) {
      unmount(prevChildren);
      hostAdapter.setTextContent(parentReference, nextChildren as string);
    } else {
      nextChildren.parent = nextElement;
      patch(prevChildren, nextChildren, parentReference, nextReference, contextMap);
    }
  }
}

function replaceOneElementWithMultipleElements(
  prevChildren: SimpElement,
  nextChildren: SimpElement[],
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>,
  parentElement: SimpElement
): void {
  unmount(prevChildren);
  mountArrayChildren(
    nextChildren,
    parentReference,
    findHostReferenceFromElement(prevChildren),
    contextMap,
    parentElement
  );
  clearElementHostReference(prevChildren, parentReference);
}

function patchSingleTextChild(prevChildren: string, nextChildren: string, parentReference: HostReference): void {
  if (prevChildren !== nextChildren) {
    hostAdapter.setTextContent(parentReference, nextChildren);
  }
}

export function patchKeyedChildren(
  prevChildren: SimpElement[],
  nextChildren: SimpElement[],
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
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
    patch(prevChildren[prevStart]!, nextChildren[nextStart]!, parentReference, null, contextMap);
    prevStart++;
    nextStart++;
  }

  // Step 2: Sync from end
  while (prevStart <= prevEnd && nextStart <= nextEnd && prevChildren[prevEnd]!.key === nextChildren[nextEnd]!.key) {
    patch(prevChildren[prevEnd]!, nextChildren[nextEnd]!, parentReference, null, contextMap);
    prevEnd--;
    nextEnd--;
  }

  // Step 3: Mount new nodes if prev list is exhausted
  if (prevStart > prevEnd) {
    const before = nextChildren[nextEnd + 1]?.reference || nextReference;
    for (let i = nextStart; i <= nextEnd; i++) {
      mount(nextChildren[i]!, parentReference, before, contextMap);
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
      if (key != null) keyToPrevIndexMap.set(key, i);
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
        patch(prevElement!, nextChild!, parentReference, null, contextMap);
        toMove[i - nextStart] = prevIndex;
        usedIndices.add(prevIndex);
      } else {
        mount(nextChild!, parentReference, nextChildren[i + 1]?.reference || nextReference, contextMap);
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
      const reference = nextChildren[i + 1]?.reference || nextReference;
      if (toMove[i - nextStart] !== -1) {
        hostAdapter.insertBefore(parentReference, currentChild.reference!, reference!);
      }
    }
  }
}

// export function patchNonKeyedChildren(
//   prevChildren: SimpElement[],
//   nextChildren: SimpElement[],
//   parentReference: HostReference,
//   prevChildrenLength: number,
//   nextChildrenLength: number,
//   nextReference: Nullable<HostReference>
// ): void {
//   const commonLength = prevChildrenLength > nextChildrenLength ? nextChildrenLength : prevChildrenLength;
//   let i = 0;
//   let prevChild;
//   let nextChild;
//
//   for (; i < commonLength; ++i) {
//     nextChild = nextChildren[i];
//     prevChild = prevChildren[i];
//
//     patch(prevChild as SimpElement, nextChild as SimpElement, parentReference, nextReference);
//     prevChildren[i] = nextChild!;
//   }
//   if (prevChildrenLength < nextChildrenLength) {
//     for (i = commonLength; i < nextChildrenLength; ++i) {
//       nextChild = nextChildren[i];
//       mount(nextChild as SimpElement, parentReference, nextReference);
//     }
//   } else if (prevChildrenLength > nextChildrenLength) {
//     for (i = commonLength; i < prevChildrenLength; ++i) {
//       remove(prevChildren[i] as SimpElement, parentReference);
//     }
//   }
// }

export function findHostReferenceFromElement(element: SimpElement): Nullable<HostReference> {
  let flag: SimpElementFlag;
  let temp: Nullable<SimpElement> = element;

  while (temp != null) {
    flag = temp.flag;

    if (flag === 'HOST' || flag === 'TEXT') {
      return temp.reference as HostReference;
    }

    temp = (Array.isArray(temp.children) ? temp.children[0] : temp.children) as SimpElement;
  }

  return null;
}
