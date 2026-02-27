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

  // if (nextReference == null) {
  //   const elementReference = findHostReferenceFromElement(prevElement, false);
  // }

  patchChildren(
    prevElement.childFlag,
    nextElement.childFlag,
    prevElement.children,
    nextElement.children,
    nextReference,
    nextElement,
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

// export function patchKeyedChildrenNew(
//   a: SimpElement[],
//   b: SimpElement[],
//   dom: any,
//   context: any,
//   hostNamespace: Maybe<string>,
//   aLength: number,
//   bLength: number,
//   outerEdge: HostReference,
//   parentVNode: SimpElement,
//   renderRuntime: SimpRenderRuntime
// ): void {
//   let aEnd = aLength - 1;
//   let bEnd = bLength - 1;
//   let j: number = 0;
//   let aNode: SimpElement = a[j]!;
//   let bNode: SimpElement = b[j]!;
//   let nextPos: number;
//   let nextNode;
//
//   // Step 1
//   outer: {
//     // Sync nodes with the same key at the beginning.
//     while (aNode.key === bNode.key) {
//       patch(aNode, bNode, dom, outerEdge, context, hostNamespace, renderRuntime);
//       a[j] = bNode;
//       ++j;
//       if (j > aEnd || j > bEnd) {
//         break outer;
//       }
//       aNode = a[j]!;
//       bNode = b[j]!;
//     }
//
//     aNode = a[aEnd]!;
//     bNode = b[bEnd]!;
//
//     // Sync nodes with the same key at the end.
//     while (aNode.key === bNode.key) {
//       patch(aNode, bNode, dom, outerEdge, context, hostNamespace, renderRuntime);
//       a[aEnd] = bNode;
//       aEnd--;
//       bEnd--;
//       if (j > aEnd || j > bEnd) {
//         break outer;
//       }
//       aNode = a[aEnd]!;
//       bNode = b[bEnd]!;
//     }
//   }
//
//   if (j > aEnd) {
//     if (j <= bEnd) {
//       nextPos = bEnd + 1;
//       nextNode = nextPos < bLength ? findHostReferenceFromElement(b[nextPos]!) : outerEdge;
//
//       while (j <= bEnd) {
//         bNode = b[j]!;
//         ++j;
//         mount(bNode, dom, nextNode, context, hostNamespace, renderRuntime);
//       }
//     }
//   } else if (j > bEnd) {
//     while (j <= aEnd) {
//       remove(a[j++]!, dom, renderRuntime);
//     }
//   } else {
//     patchKeyedChildrenComplex(
//       a,
//       b,
//       context,
//       aLength,
//       bLength,
//       aEnd,
//       bEnd,
//       j,
//       dom,
//       hostNamespace,
//       outerEdge,
//       parentVNode,
//       renderRuntime
//     );
//   }
// }
//
// export function patchKeyedChildrenComplex(
//   a: SimpElement[],
//   b: SimpElement[],
//   context: any,
//   aLength: number,
//   bLength: number,
//   aEnd: number,
//   bEnd: number,
//   j: number,
//   parentReference: Element,
//   hostNamespace: Maybe<string>,
//   outerEdge: HostReference,
//   parentVNode: SimpElement,
//   renderRuntime: SimpRenderRuntime
// ): void {
//   let aNode: SimpElement;
//   let bNode: SimpElement;
//   let nextPos = 0;
//   let i;
//   let aStart: number = j;
//   const bStart: number = j;
//   const aLeft: number = aEnd - j + 1;
//   const bLeft: number = bEnd - j + 1;
//   const sources = new Int32Array(bLeft + 1);
//   // Keep track if it is possible to remove the whole DOM using textContent = '';
//   let canRemoveWholeContent: boolean = aLeft === aLength;
//   let moved: boolean = false;
//   let pos: number = 0;
//   let patched: number = 0;
//
//   // When sizes are small, just loop them through
//   if (bLength < 4 || (aLeft | bLeft) < 32) {
//     for (i = aStart; i <= aEnd; ++i) {
//       aNode = a[i]!;
//       if (patched < bLeft) {
//         for (j = bStart; j <= bEnd; j++) {
//           bNode = b[j]!;
//           if (aNode.key === bNode.key) {
//             sources[j - bStart] = i + 1;
//             if (canRemoveWholeContent) {
//               canRemoveWholeContent = false;
//               while (aStart < i) {
//                 remove(a[aStart++]!, parentReference, renderRuntime);
//               }
//             }
//             if (pos > j) {
//               moved = true;
//             } else {
//               pos = j;
//             }
//             patch(aNode, bNode, parentReference, outerEdge, context, hostNamespace, renderRuntime);
//             ++patched;
//             break;
//           }
//         }
//         if (!canRemoveWholeContent && j > bEnd) {
//           remove(aNode, parentReference, renderRuntime);
//         }
//       } else if (!canRemoveWholeContent) {
//         remove(aNode, parentReference, renderRuntime);
//       }
//     }
//   } else {
//     const keyIndex: Record<string, number> = {};
//
//     // Map keys by their index
//     for (i = bStart; i <= bEnd; ++i) {
//       keyIndex[b[i]!.key as string | number] = i;
//     }
//
//     // Try to patch the same keys
//     for (i = aStart; i <= aEnd; ++i) {
//       aNode = a[i]!;
//
//       if (patched < bLeft) {
//         j = keyIndex[aNode.key as string | number]!;
//
//         if (j !== void 0) {
//           if (canRemoveWholeContent) {
//             canRemoveWholeContent = false;
//             while (i > aStart) {
//               remove(a[aStart++]!, parentReference, renderRuntime);
//             }
//           }
//           sources[j - bStart] = i + 1;
//           if (pos > j) {
//             moved = true;
//           } else {
//             pos = j;
//           }
//           bNode = b[j]!;
//           patch(aNode, bNode, parentReference, outerEdge, context, hostNamespace, renderRuntime);
//           ++patched;
//         } else if (!canRemoveWholeContent) {
//           remove(aNode, parentReference, renderRuntime);
//         }
//       } else if (!canRemoveWholeContent) {
//         remove(aNode, parentReference, renderRuntime);
//       }
//     }
//   }
//   // fast-path: if nothing patched remove all old and add all new
//   if (canRemoveWholeContent) {
// if ((parentVNode.flag & SIMP_ELEMENT_FLAG_FRAGMENT) !== 1) {
//       clearElementHostReference(parentVNode, parentReference, renderRuntime);
//     } else {
//       renderRuntime.hostAdapter.clearNode(parentReference);
//     }
//
//     mountArrayChildren(a, parentReference, outerEdge, context, parentVNode, hostNamespace, renderRuntime);
//   } else if (moved) {
//     const seq = lisAlgorithm(sources);
//     j = seq.length - 1;
//     for (i = bLeft - 1; i >= 0; i--) {
//       if (sources[i] === 0) {
//         pos = i + bStart;
//         bNode = b[pos]!;
//         nextPos = pos + 1;
//         mount(
//           bNode,
//           parentReference,
//           nextPos < bLength ? findHostReferenceFromElement(b[nextPos]!) : outerEdge,
//           context,
//           hostNamespace,
//           renderRuntime
//         );
//       } else if (j < 0 || i !== seq[j]) {
//         pos = i + bStart;
//         bNode = b[pos]!;
//         nextPos = pos + 1;
//
//         // --- the DOM node is moved by a call to insertAppend
//         moveReference(
//           parentVNode,
//           bNode,
//           parentReference,
//           nextPos < bLength ? findHostReferenceFromElement(b[nextPos]!) : outerEdge,
//           renderRuntime
//         );
//       } else {
//         j--;
//       }
//     }
//   } else if (patched !== bLeft) {
//     // when patched count doesn't match b length we need to insert those new ones
//     // loop backwards so we can use insertBefore
//     for (i = bLeft - 1; i >= 0; i--) {
//       if (sources[i] === 0) {
//         pos = i + bStart;
//         bNode = b[pos]!;
//         nextPos = pos + 1;
//         mount(
//           bNode,
//           parentReference,
//           nextPos < bLength ? findHostReferenceFromElement(b[nextPos]!) : outerEdge,
//           context,
//           hostNamespace,
//           renderRuntime
//         );
//       }
//     }
//   }
// }
//
// export function moveReference(
//   parentElement: SimpElement,
//   element: SimpElement,
//   parentReference: HostReference,
//   nextReference: HostReference,
//   renderRuntime: SimpRenderRuntime
// ): void {
//   while (element != null) {
//     const flags = element.flag;
//
//     if (
//       (flags & SIMP_ELEMENT_FLAG_HOST) !== 0 ||
//       (flags & SIMP_ELEMENT_FLAG_TEXT) !== 0 ||
//       (flags & SIMP_ELEMENT_FLAG_PORTAL) !== 0
//     ) {
//       renderRuntime.hostAdapter.insertOrAppend(parentReference, element.reference, nextReference);
//       return;
//     }
//
//     const children = element.children;
//
//     if ((flags & SIMP_ELEMENT_FLAG_FC) !== 0) {
//       element = children as SimpElement;
//     } else if ((flags & SIMP_ELEMENT_FLAG_FRAGMENT) !== 0) {
//       if (element.childFlag === SIMP_ELEMENT_CHILD_FLAG_ELEMENT) {
//         element = children as SimpElement;
//       } else {
//         for (let i = 0, len = (children as SimpElement[]).length; i < len; ++i) {
//           moveReference(
//             parentElement,
//             (children as SimpElement[])[i] as SimpElement,
//             parentReference,
//             nextReference,
//             renderRuntime
//           );
//         }
//         return;
//       }
//     }
//   }
// }

// let result: Int32Array;
// let p: Int32Array;
// let maxLen = 0;
// // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
//
// function lisAlgorithm(arr: Int32Array): Int32Array {
//   let arrI = 0;
//   let i = 0;
//   let j = 0;
//   let k = 0;
//   let u = 0;
//   let v = 0;
//   let c = 0;
//   const len = arr.length;
//
//   if (len > maxLen) {
//     maxLen = len;
//     result = new Int32Array(len);
//     p = new Int32Array(len);
//   }
//
//   for (; i < len; ++i) {
//     arrI = arr[i]!;
//
//     if (arrI !== 0) {
//       j = result[k]!;
//       if (arr[j]! < arrI) {
//         p[i] = j;
//         result[++k] = i;
//         continue;
//       }
//
//       u = 0;
//       v = k;
//
//       while (u < v) {
//         c = (u + v) >> 1;
//         if (arr[result[c]!]! < arrI) {
//           u = c + 1;
//         } else {
//           v = c;
//         }
//       }
//
//       if (arrI < arr[result[u]!]!) {
//         if (u > 0) {
//           p[i] = result[u - 1]!;
//         }
//         result[u] = i;
//       }
//     }
//   }
//
//   u = k + 1;
//   const seq = new Int32Array(u);
//   v = result[u - 1]!;
//
//   while (u-- > 0) {
//     seq[u] = v;
//     v = p[v]!;
//     result[u] = 0;
//   }
//
//   return seq;
// }
