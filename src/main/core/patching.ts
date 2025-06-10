import type { FC, Key, SimpElement, SimpElementFlag, SimpNode } from './createElement';
import { normalizeRoot } from './createElement';
import type { Nullable } from '../shared';
import { EMPTY_MAP, EMPTY_OBJECT, isPrimitive } from '../shared';
import type { HostReference } from './hostAdapter';
import { clearElementHostReference, remove, removeAllChildren, unmount, unmountAllChildren } from './unmounting';
import { mount, mountArrayChildren } from './mounting';
import { GLOBAL } from './global';
import type { SimpContext, SimpContextMap } from './context';

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
    patchElement(prevElement, nextElement, contextMap);
  } else if (nextElement.flag === 'FC') {
    if (prevElement.store != null) {
      nextElement.store = prevElement.store;
    }

    patchFunctionalComponent(prevElement, nextElement, parentReference, nextReference, contextMap);
  } else if (nextElement.flag === 'TEXT') {
    patchText(prevElement, nextElement);
  } else if (nextElement.flag === 'FRAGMENT') {
    patchFragment(prevElement, nextElement, parentReference, nextReference, contextMap);
  } else if (nextElement.flag === 'PROVIDER') {
    patchProvider(prevElement, nextElement, parentReference, nextReference, contextMap);
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

  if (nextElement.flag === 'HOST' && prevElement.flag === 'HOST') {
    mount(nextElement, null, null, contextMap);
    GLOBAL.hostAdapter.replaceChild(parentReference, nextElement.reference, prevElement.reference);
  } else {
    mount(nextElement, parentReference, findHostReferenceFromElement(prevElement), contextMap);
    clearElementHostReference(prevElement, parentReference);
  }
}

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

function patchElement(prevElement: SimpElement, nextElement: SimpElement, contextMap: Nullable<SimpContextMap>) {
  const hostReference = (nextElement.reference = prevElement.reference)!;
  const prevProps = prevElement.props;
  const nextProps = nextElement.props;

  for (const propName in nextProps) {
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (prevValue !== nextValue) {
      GLOBAL.hostAdapter.patchProp(hostReference, propName, prevValue, nextValue);
    }
  }

  for (const propName in prevProps) {
    if (nextProps[propName] == null && prevProps[propName] != null) {
      GLOBAL.hostAdapter.patchProp(hostReference, propName, prevProps[propName], null);
    }
  }

  if (prevElement.className !== nextElement.className) {
    GLOBAL.hostAdapter.setClassname(hostReference, nextElement.className);
  }

  patchChildren(prevElement.children, nextElement.children, hostReference, null, prevElement, contextMap);
}

function patchChildren(
  prevChildren: SimpNode,
  nextChildren: SimpNode,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  parentElement: SimpElement,
  contextMap: Nullable<SimpContextMap>
) {
  if (Array.isArray(prevChildren)) {
    if (Array.isArray(nextChildren)) {
      const prevChildrenLength = (prevChildren as SimpElement[]).length;
      const nextChildrenLength = (nextChildren as SimpElement[]).length;

      if (prevChildrenLength === 0) {
        if (nextChildrenLength > 0) {
          mountArrayChildren(nextChildren as SimpElement[], parentReference, nextReference, contextMap);
        }
      } else if (nextChildrenLength === 0) {
        removeAllChildren(parentReference, parentElement, prevChildren as SimpElement[]);
      } else {
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
      GLOBAL.hostAdapter.setTextContent(parentReference, (nextChildren || '') as string);
    } else {
      removeAllChildren(parentReference, parentElement, prevChildren as SimpElement[]);
      mount(nextChildren as SimpElement, parentReference, nextReference, contextMap);
    }
  } else if (isPrimitive(prevChildren)) {
    if (Array.isArray(nextChildren)) {
      GLOBAL.hostAdapter.clearNode(parentReference);
      mountArrayChildren(nextChildren as SimpElement[], parentReference, nextReference, contextMap);
    } else if (isPrimitive(nextChildren)) {
      patchSingleTextChild(prevChildren as string, nextChildren as string, parentReference);
    } else {
      GLOBAL.hostAdapter.clearNode(parentReference);
      mount(nextChildren, parentReference, nextReference, contextMap);
    }
  } else {
    if (Array.isArray(nextChildren)) {
      replaceOneElementWithMultipleElements(prevChildren, nextChildren as SimpElement[], parentReference, contextMap);
    } else if (isPrimitive(nextChildren)) {
      unmount(prevChildren);
      GLOBAL.hostAdapter.setTextContent(parentReference, nextChildren as string);
    } else {
      patch(prevChildren, nextChildren, parentReference, nextReference, contextMap);
    }
  }
}

function replaceOneElementWithMultipleElements(
  prevChildren: SimpElement,
  nextChildren: SimpElement[],
  parentReference: HostReference,
  contextMap: Nullable<SimpContextMap>
): void {
  unmount(prevChildren);
  mountArrayChildren(nextChildren, parentReference, findHostReferenceFromElement(prevChildren), contextMap);
  clearElementHostReference(prevChildren, parentReference);
}

function patchSingleTextChild(prevChildren: string, nextChildren: string, parentReference: HostReference): void {
  if (prevChildren !== nextChildren) {
    GLOBAL.hostAdapter.setTextContent(parentReference, nextChildren);
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

function patchFunctionalComponent(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  nextElement.contextMap = contextMap;

  GLOBAL.eventBus.publish({ type: 'beforeRender', element: nextElement });
  const nextChildren = normalizeRoot((nextElement.type as FC)(nextElement.props || EMPTY_OBJECT));
  GLOBAL.eventBus.publish({ type: 'afterRender' });

  if (nextChildren != null) {
    nextElement.children = nextChildren;
  }

  patchChildren(prevElement.children, nextElement.children, parentReference, nextReference, prevElement, contextMap);

  GLOBAL.eventBus.publish({ type: 'mounted', element: nextElement });
}

function patchText(prevElement: SimpElement, nextElement: SimpElement): void {
  const nextText = nextElement.children as string;
  const reference = (nextElement.reference = prevElement.reference);

  if (nextText !== prevElement.children) {
    GLOBAL.hostAdapter.setTextContent(reference!, nextText);
  }
}

function patchFragment(
  prevElement: SimpElement,
  nextElement: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  patchChildren(prevElement.children, nextElement.children, parentReference, nextReference, prevElement, contextMap);
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

  patchChildren(prevElement.children, nextElement.children, parentReference, nextReference, prevElement, contextMap);
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

  patchChildren(prevElement.children, nextElement.children, parentReference, nextReference, prevElement, contextMap);
}

export function updateFunctionalComponent(
  element: SimpElement,
  parentReference: HostReference,
  nextReference: Nullable<HostReference>,
  contextMap: Nullable<SimpContextMap>
): void {
  patch(element, element, parentReference, nextReference, contextMap);
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
        GLOBAL.hostAdapter.insertBefore(parentReference, currentChild.reference!, reference!);
      }
    }
  }
}
