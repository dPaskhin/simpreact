import { createRootElement, type SimpElement } from '../element';
import { enqueueRender } from '../enqueueRender';
import { lifecycleManager } from '../lifecycleManager';
import { applyDiffTasks } from './applyDiffTasks';
import type { DiffTask } from './types';

let currentRoot: SimpElement | null = null;

lifecycleManager.subscribe(event => {
  if (event.type === 'mountRequired') {
    applyDiffTasks(event.payload.tasks as DiffTask[]);
  }
});

export function render(element: SimpElement, container: Element) {
  element = createRootElement<SimpElement, Element>(element, container);

  enqueueRender(currentRoot, element);

  currentRoot = element;
}
