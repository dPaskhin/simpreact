import { LifecycleManager } from '../../main/lifecycleManager';
import { createElement, normalizeChildren, SimpElement } from '../../main/element';
import { obtainChildren } from '../../main/diff/diff';

describe('obtainChildren', () => {
  let lifecycleManager: LifecycleManager;

  beforeEach(() => {
    lifecycleManager = new LifecycleManager();
  });

  it('should normalize children for a basic element', () => {
    const element = createElement('div', null, 'child1', 'child2');

    const eventListener = jest.fn();
    lifecycleManager.subscribe(eventListener);

    obtainChildren(element, lifecycleManager);

    expect(eventListener).not.toHaveBeenCalled();

    expect(element._children).toEqual(normalizeChildren(['child1', 'child2']));
  });

  it('should trigger lifecycle events and normalize children for a function component', () => {
    const Component = jest
      .fn<SimpElement, [{ text: string }]>()
      .mockImplementation(props => createElement('span', null, props.text));

    const element = createElement(Component, { text: 'Hello' });
    element._globalContext = new Map();

    const eventListener = jest.fn();
    lifecycleManager.subscribe(eventListener);

    obtainChildren(element, lifecycleManager);

    expect(eventListener).toHaveBeenCalledWith({
      type: 'beforeRender',
      payload: { element },
    });
    expect(eventListener).toHaveBeenCalledWith({
      type: 'afterRender',
      payload: { element },
    });

    expect(Component).toHaveBeenCalledWith(element.props, element._globalContext);
    expect(element._children).toEqual(expect.objectContaining({ type: 'span', props: { children: 'Hello' } }));
  });

  it('should handle empty children gracefully', () => {
    const element = createElement('div');

    const eventListener = jest.fn();
    lifecycleManager.subscribe(eventListener);

    obtainChildren(element, lifecycleManager);

    expect(eventListener).not.toHaveBeenCalled();

    expect(element._children).toEqual(normalizeChildren(undefined));
  });
});
