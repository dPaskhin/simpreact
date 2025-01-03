import { LifecycleManager } from '../../main/lifecycleManager';
import { createElement, Fragment } from '../../main';
import { EFFECT_TAG } from '../../main/diff';
import { removePhase } from '../../main/diff/diff';
import { createDiffTask } from '../../main/diff/diffTask';

describe('remove', () => {
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager();
  });

  it('should add DELETE task for a basic element', () => {
    const element = createElement('div', { id: 'test' });
    const result = removePhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.REMOVE, element, null));
  });

  it('should recursively delete a function component and its children', () => {
    const element = createElement(() => null);
    const child = createElement('span', null, 'child');

    element._children = child;

    const result = removePhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.deletedElements.length).toBe(1);
    expect(result.deletedElements[0]).toEqual(element);

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.REMOVE, child, null));
  });

  it('should delete a ref component', () => {
    const element = createElement('span', { ref: {} });

    const result = removePhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.REMOVE, element, null));
    expect(result.deletedRefElements.length).toBe(1);
    expect(result.deletedRefElements[0]).toEqual(element);
  });

  it('should handle fragment elements by skipping them in deletion', () => {
    const element = createElement(Fragment, {});
    const result = removePhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(0);
    expect(result.deletedElements.length).toBe(0);
  });

  it('should traverse and delete function components inside host elements', () => {
    const parent = createElement('div');
    const child = createElement(() => null);

    parent._children = [child];

    const result = removePhase(parent, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.deletedElements.length).toBe(1);
    expect(result.deletedElements[0]).toEqual(child);

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.REMOVE, parent, null));
  });

  it('should traverse and delete ref components', () => {
    const parent = createElement('div', { ref: {} });
    const child = createElement('span', { ref: {} });

    parent._children = child;

    const result = removePhase(parent, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.deletedRefElements.length).toBe(2);
    expect(result.deletedRefElements[0]).toEqual(child);
    expect(result.deletedRefElements[1]).toEqual(parent);
  });
});
