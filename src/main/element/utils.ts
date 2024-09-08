import type { Many, Maybe, Nullable } from '../types';
import type { FunctionComponent, SimpElement } from './types';
import { TEXT_TYPE } from './constants';

export function replaceByIndex(parent: Maybe<SimpElement>, replacement: Maybe<SimpElement>): void {
  if (parent?._children == null || replacement == null) {
    return;
  }

  if (!Array.isArray(parent._children)) {
    if (parent._children._index === replacement._index) {
      parent._children = replacement;
    }
    return;
  }

  for (let i = 0; i < parent._children.length; i++) {
    if (parent._children[i]._index === replacement._index) {
      parent._children[i] = replacement;
      break;
    }
  }
}

export function elementsToArray(elements: Maybe<Many<SimpElement>>): SimpElement[] {
  if (elements == null) {
    return [];
  } else {
    return Array.isArray(elements) ? elements : [elements];
  }
}

export function forEachElementPair(
  elements1: Maybe<Many<SimpElement>>,
  elements2: Maybe<Many<SimpElement>>,
  cb: (element1: Maybe<SimpElement>, element2: Maybe<SimpElement>, index: number) => void
): void {
  const elements1Array = elementsToArray(elements1);
  const elements2Array = elementsToArray(elements2);

  const length = Math.max(elements1Array.length, elements2Array.length);

  for (let i = 0; i < length; i++) {
    cb(elements1Array[i], elements2Array[i], i);
  }
}

export function forEachElement(
  elements: Maybe<Many<SimpElement>>,
  cb: (element: SimpElement, index: number) => void
): void {
  const elementsArray = elementsToArray(elements);

  for (let i = 0; i < elementsArray.length; i++) {
    cb(elementsArray[i], i);
  }
}

/**
 * Finds all sibling elements to the right of the given element in its parent's child list,
 * traversing up the hierarchy if necessary, until reaching a parent with *a reference* or *no parent*.
 *
 * @param {Maybe<SimpElement>} element - The starting element to find right siblings for.
 * @returns {SimpElement[]} An array of sibling elements to the right of the given element, including those from ancestor levels when applicable.
 */
export function findRightSiblings(element: Maybe<SimpElement>): SimpElement[] {
  if (!element) {
    return [];
  }

  let current = element;

  let res: SimpElement[] = [];

  while (current._parent != null) {
    const parentChildren = elementsToArray(current._parent._children);

    if (parentChildren.length > 1) {
      res.push(...parentChildren.slice(current._index + 1, parentChildren.length));
    }

    if (current._parent._reference) {
      break;
    }

    current = current._parent;
  }

  return res;
}

export function findSiblingReference<Ref>(element: Maybe<SimpElement>): Nullable<Ref> {
  const rightSiblings = findRightSiblings(element);

  const closestReferenceSibling = findElementInTree(
    rightSiblings,
    child => child._reference != null && child !== element
  );

  return (closestReferenceSibling?._reference as Ref) || null;
}

export function findParentReference<Ref>(element: SimpElement): Ref | null {
  let parent = element._parent;

  while (parent != null && parent._reference == null) {
    parent = parent._parent;
  }

  return (parent?._reference as Ref) || null;
}

/**
 * Traverses a tree of elements using the Depth-First Search (DFS) algorithm
 * to find the first element that satisfies the provided predicate function.
 *
 * The traversal evaluates the predicate in pre-order,
 * processing each element before its children.
 *
 * @param {Maybe<Many<SimpElement>>} elements - The root or roots of the tree to traverse.
 * @param {(element: SimpElement, index: number) => boolean} predicate - A function that evaluates each element and returns `true` for the desired element.
 *
 * @returns {Maybe<SimpElement>} The first element that satisfies the predicate.
 *
 * @see https://en.wikipedia.org/wiki/Depth-first_search
 */
export function findElementInTree(
  elements: Maybe<Many<SimpElement>>,
  predicate: (element: SimpElement, index: number) => boolean
): Maybe<SimpElement> {
  for (const element of elementsToArray(elements)) {
    if (predicate(element, 0)) {
      return element;
    } else {
      const res = findElementInTree(element._children, predicate);
      if (res) {
        return res;
      }
    }
  }
}

/**
 * Traverses a tree of elements using the Depth-First Search (DFS) algorithm.
 *
 * The traversal invokes the callback function (`cb`) in post-order,
 * ensuring child elements are processed before their parent.
 *
 * @param {Maybe<Many<SimpElement>>} elements - The root or roots of the tree to traverse.
 * @param {(element: SimpElement) => void} cb - A callback function to process each element.
 *
 * @see https://en.wikipedia.org/wiki/Tree_traversal
 */
export function traverseElement(elements: Maybe<Many<SimpElement>>, cb: (element: SimpElement) => void): void {
  forEachElement(elements, element => {
    traverseElement(element._children, cb);
    cb(element);
  });
}

export function isTextElement(element: SimpElement): boolean {
  return element.type === TEXT_TYPE;
}

export function isFunctionTypeElement<P = any>(
  element: Maybe<SimpElement<P>>
): element is Omit<SimpElement<P>, 'type'> & {
  type: FunctionComponent<P>;
} {
  return typeof element?.type === 'function';
}

export function isHostTypeElement(element: Maybe<SimpElement>): element is Omit<SimpElement, 'type'> & {
  type: string;
} {
  return element != null && !isFunctionTypeElement(element);
}
