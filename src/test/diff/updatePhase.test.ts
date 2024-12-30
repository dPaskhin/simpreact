import { LifecycleManager } from '../../main/lifecycleManager';
import { createElement } from '../../main';
import { DiffResult, EFFECT_TAG } from '../../main/diff';
import { updatePhase } from '../../main/diff/diff';
import { createDiffTask } from '../../main/diff/diffTask';

describe('updatePhase', () => {
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager();
  });

  it('should create an UPDATE task for basic elements', () => {
    const prevElement = createElement('div', { id: 'old' });
    const nextElement = createElement('div', { id: 'new' });
    const result: DiffResult = {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    };

    updatePhase(prevElement, nextElement, lifecycleManager, result);

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.UPDATE, prevElement, nextElement));
    expect(result.renderedElements.length).toBe(0);
    expect(result.deletedElements.length).toBe(0);
    expect(result.renderedRefElements.length).toBe(0);
    expect(result.deletedRefElements.length).toBe(0);
  });

  it('should update a function component and add it to renderedElements', () => {
    const FunctionComponent = (props: { text: string }) => createElement('span', {}, props.text);
    const prevElement = createElement(FunctionComponent, { text: 'old' });
    const nextElement = createElement(FunctionComponent, { text: 'new' });
    const result: DiffResult = {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    };

    updatePhase(prevElement, nextElement, lifecycleManager, result);

    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(nextElement);
  });

  it('should update a ref component and add it to renderedRefElements', () => {
    const prevElement = createElement('span', { ref: {}, text: 'old' });
    const nextElement = createElement('span', { ref: {}, text: 'new' });
    const result: DiffResult = {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    };

    updatePhase(prevElement, nextElement, lifecycleManager, result);

    expect(result.renderedRefElements.length).toBe(1);
    expect(result.renderedRefElements[0]).toEqual(nextElement);
  });

  it('should recursively update child elements', () => {
    const prevChild = createElement('span', null, 'old child');
    const nextChild = createElement('span', null, 'new child');

    const prevElement = createElement('div', null, prevChild);

    prevElement._children = prevChild;

    const nextElement = createElement('div', null, nextChild);

    const result = updatePhase(prevElement, nextElement, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.UPDATE, prevElement, nextElement));
    expect(result.tasks[1]).toEqual(createDiffTask(EFFECT_TAG.UPDATE, prevChild, nextChild));
  });

  it('should transfer _reference and _store from prevElement to nextElement', () => {
    const prevElement = createElement('div', { id: 'old' });

    prevElement._reference = { some: 'reference' };
    prevElement._store = { some: 'store' };

    const nextElement = createElement('div', { id: 'new' });

    updatePhase(prevElement, nextElement, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(nextElement._reference).toEqual(prevElement._reference);
    expect(nextElement._store).toEqual(prevElement._store);
  });
});
