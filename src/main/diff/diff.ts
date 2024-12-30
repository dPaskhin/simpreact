import type { Maybe } from '../types';
import {
  forEachElement,
  forEachElementPair,
  isFragmentElement,
  isFunctionTypeElement,
  isHostTypeElement,
  normalizeChildren,
  type SimpElement,
  traverseElement,
} from '../element';
import type { LifecycleManager } from '../lifecycleManager';
import { createDiffTask, type DiffTask, EFFECT_TAG } from './diffTask';

export interface DiffResult {
  tasks: DiffTask[];
  renderedElements: SimpElement[];
  deletedElements: SimpElement[];
  renderedRefElements: SimpElement[];
  deletedRefElements: SimpElement[];
}

export function diff(
  prevElement: Maybe<SimpElement>,
  nextElement: Maybe<SimpElement>,
  lifecycleManager: LifecycleManager,
  result: DiffResult = {
    tasks: [],
    renderedElements: [],
    deletedElements: [],
    renderedRefElements: [],
    deletedRefElements: [],
  }
): DiffResult {
  // REMOVE PHASE
  if (prevElement && !nextElement) {
    removePhase(prevElement, lifecycleManager, result);
    return result;
  }

  // INSERT PHASE
  else if (!prevElement && nextElement) {
    insertPhase(nextElement, lifecycleManager, result);
    return result;
  }

  // Early return in situation when we have neither prevElement nor nextElement
  else if (!prevElement || !nextElement) {
    return result;
  }

  // REPLACE PHASE
  else if (prevElement.type !== nextElement.type) {
    removePhase(prevElement, lifecycleManager, result);
    insertPhase(nextElement, lifecycleManager, result);
    return result;
  }

  // UPDATE PHASE
  updatePhase(prevElement, nextElement, lifecycleManager, result);
  return result;
}

export function insertPhase(element: SimpElement, lifecycleManager: LifecycleManager, result: DiffResult): DiffResult {
  obtainChildren(element, lifecycleManager);

  if (isHostTypeElement(element)) {
    result.tasks.push(createDiffTask(EFFECT_TAG.INSERT, null, element));

    if (element?.props?.ref != null) {
      result.renderedRefElements.unshift(element);
    }
  } else if (!isFragmentElement(element)) {
    result.renderedElements.unshift(element);
  }

  forEachElement(element._children, (child, index) => {
    child._parent = element;
    child._index = index;

    insertPhase(child, lifecycleManager, result);
  });

  return result;
}

export function removePhase(element: SimpElement, lifecycleManager: LifecycleManager, result: DiffResult): DiffResult {
  if (isFunctionTypeElement(element)) {
    if (!isFragmentElement(element)) {
      // Place the FC element in the deleted elements list
      result.deletedElements.push(element);
    }
    // Go inside to find the closest HOST element to add it in the tasks list
    forEachElement(element._children, child => {
      removePhase(child, lifecycleManager, result);
    });
  } else {
    // If we find the nearest host element it means we don't need to go farther and can stop the diffing
    result.tasks.push(createDiffTask(EFFECT_TAG.REMOVE, element, null));
    // We use traverseElement for:
    traverseElement(element, element => {
      // collecting all possibly left FC elements in a subtree
      if (isFunctionTypeElement(element) && !isFragmentElement(element)) {
        result.deletedElements.push(element);
      }
      // collecting all possibly left host elements with refs in a subtree
      if (isHostTypeElement(element) && element?.props?.ref != null) {
        result.deletedRefElements.push(element);
      }
    });
  }

  return result;
}

export function updatePhase(
  prevElement: SimpElement,
  nextElement: SimpElement,
  lifecycleManager: LifecycleManager,
  result: DiffResult
): DiffResult {
  nextElement._reference ||= prevElement._reference;
  nextElement._store = prevElement._store ?? null;

  obtainChildren(nextElement, lifecycleManager);

  if (!isFunctionTypeElement(nextElement)) {
    result.tasks.push(createDiffTask(EFFECT_TAG.UPDATE, prevElement, nextElement));

    if (nextElement?.props?.ref != null) {
      result.renderedRefElements.unshift(nextElement);
    }
  } else if (!isFragmentElement(nextElement)) {
    result.renderedElements.unshift(nextElement);
  }

  forEachElementPair(prevElement._children, nextElement._children, (prevChild, nextChild, index) => {
    if (nextChild) {
      nextChild._parent = nextElement;
      nextChild._index = index;
    }

    diff(prevChild, nextChild, lifecycleManager, result);
  });

  return result;
}

export function obtainChildren(element: SimpElement, lifecycleManager: LifecycleManager): void {
  if (isFunctionTypeElement(element)) {
    lifecycleManager.beforeRender(element);

    element._children = normalizeChildren(element.type(element.props || {}), true);

    lifecycleManager.afterRender(element);
  } else {
    element._children = normalizeChildren(element.props?.children);
  }
}
