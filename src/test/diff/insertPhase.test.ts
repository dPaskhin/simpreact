import { LifecycleManager } from '../../main/lifecycleManager';
import { createElement, SimpElement } from '../../main';
import { EFFECT_TAG } from '../../main/diff';
import { insertPhase } from '../../main/diff/diff';
import { createDiffTask } from '../../main/diff/diffTask';

describe('insertPhase', () => {
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager();
  });

  it('should add task for a basic element', () => {
    const element = createElement('div', { id: 'test' });
    const result = insertPhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.INSERT, null, element));
    expect(result.deletedElements.length).toBe(0);
    expect(result.renderedElements.length).toBe(0);
    expect(result.renderedRefElements.length).toBe(0);
    expect(result.deletedRefElements.length).toBe(0);
  });

  it('should handle a function component element', () => {
    const element = createElement(props => createElement('span', null, props.text), { text: 'Hello' });
    const result = insertPhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(
      createDiffTask(
        EFFECT_TAG.INSERT,
        null,
        expect.objectContaining({
          type: 'span',
          props: { children: 'Hello' },
        })
      )
    );
    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(element);
    expect(result.deletedElements.length).toBe(0);
    expect(result.renderedRefElements.length).toBe(0);
    expect(result.deletedRefElements.length).toBe(0);
  });

  it('should handle a ref component element', () => {
    const element = createElement('span', { ref: {} });
    const result = insertPhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.INSERT, null, expect.objectContaining({ type: 'span' })));
    expect(result.renderedElements.length).toBe(0);
    expect(result.deletedElements.length).toBe(0);
    expect(result.renderedRefElements.length).toBe(1);
    expect(result.renderedRefElements[0]).toBe(element);
    expect(result.deletedRefElements.length).toBe(0);
  });

  it('should recursively add children', () => {
    const child = createElement('span', null, 'child');
    const parent = createElement('div', null, child);
    const result = insertPhase(parent, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    expect(result.tasks.length).toBe(2);
    expect(result.tasks).toEqual([
      createDiffTask(EFFECT_TAG.INSERT, null, parent),
      createDiffTask(EFFECT_TAG.INSERT, null, child),
    ]);
    expect(result.renderedElements.length).toBe(0);
    expect(result.deletedElements.length).toBe(0);
  });

  it('should trigger lifecycle events during addPhase for a function element', () => {
    const element = createElement(() => 'children');

    const eventListener = jest.fn();
    lifecycleManager.subscribe(eventListener);

    const result = insertPhase(element, lifecycleManager, {
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });

    // Expect lifecycle events for before and after rendering
    expect(eventListener).toHaveBeenCalledWith({
      type: 'beforeRender',
      payload: { element },
    });
    expect(eventListener).toHaveBeenCalledWith({
      type: 'afterRender',
      payload: { element },
    });

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual(createDiffTask(EFFECT_TAG.INSERT, null, element._children as SimpElement));
    expect(result.renderedElements[0]).toEqual(element);
    expect(result.deletedElements.length).toBe(0);
  });
});
