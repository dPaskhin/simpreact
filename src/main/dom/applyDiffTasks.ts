import { EFFECT_TAG, findParentReference, findSiblingReference, isHostTypeElement, isTextElement } from '../internal';
import type { DiffTask, DomNode, SimpElement } from './types';
import { updateDomNodeAttrs } from './updateDomAttrs';

export function applyDiffTasks(diffTasks: DiffTask[]) {
  for (const task of diffTasks) {
    switch (task.effectTag) {
      case EFFECT_TAG.INSERT: {
        if (!isHostTypeElement(task.nextElement)) {
          return;
        }

        task.nextElement._reference = createDomNodeByElement(task.nextElement);

        updateDomNodeAttrs(task.nextElement._reference, undefined, task.nextElement.props);

        const siblingReference = findSiblingReference<Element>(task.nextElement);

        findParentReference<Element>(task.nextElement)?.insertBefore(task.nextElement._reference, siblingReference);

        break;
      }
      case EFFECT_TAG.REMOVE: {
        if (!task.prevElement || !task.prevElement._reference) {
          break;
        }
        findParentReference<Element>(task.prevElement)?.removeChild(task.prevElement._reference);
        break;
      }
      case EFFECT_TAG.UPDATE: {
        if (!task.prevElement || !task.nextElement) {
          break;
        }

        updateDomNodeAttrs(task.prevElement._reference, task.prevElement.props, task.nextElement.props);
        break;
      }
    }
  }
}

function createDomNodeByElement(element: SimpElement): DomNode {
  return isTextElement(element) ? document.createTextNode('') : document.createElement(element.type as string);
}
