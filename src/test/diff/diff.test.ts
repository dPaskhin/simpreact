import { diff, EFFECT_TAG } from '../../main/diff';
import * as SimpReact from '../../main';
import { LifecycleManager } from '../../main/lifecycleManager';
import { Maybe } from '../../main/types';

describe('diff function', () => {
  it('does nothing when both prevElement and nextElement are null', () => {
    const result = diff(null, null, new LifecycleManager());

    expect(result).toEqual({
      tasks: [],
      renderedElements: [],
      deletedElements: [],
      renderedRefElements: [],
      deletedRefElements: [],
    });
  });

  it('creates an ADD task when prevElement is null and nextElement is defined', () => {
    const nextElement = SimpReact.createElement('div');
    const result = diff(null, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({ effectTag: EFFECT_TAG.INSERT, prevElement: null, nextElement });
  });

  it('creates a DELETE task when prevElement is defined and nextElement is null', () => {
    const prevElement = SimpReact.createElement('div');
    const result = diff(prevElement, null, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({ effectTag: EFFECT_TAG.REMOVE, prevElement, nextElement: null });
  });

  it('creates an UPDATE task when prevElement and nextElement have the same type', () => {
    const prevElement = SimpReact.createElement('div');
    const nextElement = SimpReact.createElement('div');
    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({ effectTag: EFFECT_TAG.UPDATE, prevElement, nextElement });
  });

  it('creates DELETE and ADD tasks when the element type changes between prevElement and nextElement', () => {
    const prevElement = SimpReact.createElement('div');
    const nextElement = SimpReact.createElement('span');
    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({ effectTag: EFFECT_TAG.REMOVE, prevElement, nextElement: null });
    expect(result.tasks[1]).toEqual({ effectTag: EFFECT_TAG.INSERT, prevElement: null, nextElement });
  });

  it('handles functional components correctly, calling lifecycleManager hooks and diffing the resulting tree', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };
    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'func' });

    const result = diff(null, nextElement, lifecycleManager);

    expect(lifecycleManager.beforeRender).toHaveBeenCalledWith(nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenCalledWith(nextElement);
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'div', props: { id: 'func' } }),
    });
  });

  it('correctly diffs nested element trees, creating appropriate tasks for each node', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement('span', { id: 'child1' }),
        SimpReact.createElement('p', { id: 'child2' })
      )
    );

    const nextElement = SimpReact.createElement(
      'div',
      null,
      SimpReact.createElement('span', { id: 'child1' }),
      SimpReact.createElement('p', { id: 'child2', className: 'updated' }),
      SimpReact.createElement('a', { id: 'child3' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(4);
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div' }),
      nextElement: expect.objectContaining({ type: 'div' }),
    });
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'span', props: { id: 'child1' } }),
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'child1' } }),
    });
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'p', props: { id: 'child2' } }),
      nextElement: expect.objectContaining({ type: 'p', props: { id: 'child2', className: 'updated' } }),
    });
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'a', props: { id: 'child3' } }),
    });
  });

  it('correctly handles elements with dynamic children, diffing the children appropriately', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'ul',
        null,
        SimpReact.createElement('li', { id: 'item1' }),
        SimpReact.createElement('li', { id: 'item2' })
      )
    );

    const nextElement = SimpReact.createElement(
      'ul',
      null,
      SimpReact.createElement('li', { id: 'item1' }),
      SimpReact.createElement('span', { id: 'item3' }),
      SimpReact.createElement('li', { id: 'item4' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(5);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'ul' }),
      nextElement: expect.objectContaining({ type: 'ul' }),
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'li', props: { id: 'item1' } }),
      nextElement: expect.objectContaining({ type: 'li', props: { id: 'item1' } }),
    });
    expect(result.tasks[2]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement: expect.objectContaining({ type: 'li', props: { id: 'item2' } }),
      nextElement: null,
    });
    expect(result.tasks[3]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'item3' } }),
    });
    expect(result.tasks[4]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'li', props: { id: 'item4' } }),
    });
  });

  it('correctly handles text nodes, creating ADD, DELETE, or UPDATE tasks as needed', () => {
    const prevElement = actualizeElementTree(SimpReact.createElement('div', null, 'Old Text'));
    const nextElement = SimpReact.createElement('div', null, 'New Text');

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div' }),
      nextElement: expect.objectContaining({ type: 'div' }),
    });
  });

  it('handles edge cases with null or undefined values in elements or props', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement('div', { id: 'prev' }, SimpReact.createElement('span', { id: 'child1' }), null, undefined)
    );

    const nextElement = SimpReact.createElement(
      'div',
      { id: 'next' },
      SimpReact.createElement('span', { id: 'child1' }),
      null,
      SimpReact.createElement('span', { id: 'child2' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(3);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div', props: expect.objectContaining({ id: 'prev' }) }),
      nextElement: expect.objectContaining({ type: 'div', props: expect.objectContaining({ id: 'next' }) }),
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'span', props: { id: 'child1' } }),
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'child1' } }),
    });
    expect(result.tasks[2]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'child2' } }),
    });
  });

  it('preserves component store across renders where applicable', () => {
    const prevElement = SimpReact.createElement('div', { id: 'prev' });
    prevElement._store = { someState: 'prevState' };

    const nextElement = SimpReact.createElement('div', { id: 'next' });
    nextElement._store = null;

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement,
      nextElement,
    });
    expect(nextElement._store).toEqual(prevElement._store);
  });

  it('correctly diffs deeply nested element trees, creating appropriate tasks at each level', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement(
          'section',
          null,
          SimpReact.createElement('article', null, SimpReact.createElement('p', { text: 'Old text' }))
        )
      )
    );

    const nextElement = SimpReact.createElement(
      'div',
      null,
      SimpReact.createElement(
        'section',
        null,
        SimpReact.createElement('article', null, SimpReact.createElement('p', { text: 'New text' }))
      )
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(4);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div' }),
      nextElement: expect.objectContaining({ type: 'div' }),
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'section' }),
      nextElement: expect.objectContaining({ type: 'section' }),
    });
    expect(result.tasks[2]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'article' }),
      nextElement: expect.objectContaining({ type: 'article' }),
    });
    expect(result.tasks[3]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'p', props: { text: 'Old text' } }),
      nextElement: expect.objectContaining({ type: 'p', props: { text: 'New text' } }),
    });
  });

  it('creates a DELETE task for an element with multiple children without separate tasks for each child', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement('span', { id: 'child1' }),
        SimpReact.createElement('span', { id: 'child2' })
      )
    );
    const result = diff(prevElement, null, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement,
      nextElement: null,
    });
  });

  it('creates DELETE and ADD tasks when replacing an element with a completely different structure', () => {
    const prevElement = actualizeElementTree(
      SimpReact.createElement('div', { id: 'old' }, SimpReact.createElement('span', { id: 'child1' }))
    );
    const nextElement = SimpReact.createElement(
      'section',
      { id: 'new' },
      SimpReact.createElement('p', { id: 'child2' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(3);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement,
      nextElement: null,
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement,
    });
    expect(result.tasks[2]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'p', props: { id: 'child2' } }),
    });
  });

  it('does not carry over component store when type changes between prevElement and nextElement', () => {
    const prevElement = SimpReact.createElement('div', { id: 'old' });
    prevElement._store = { someState: 'prevState' };

    const nextElement = SimpReact.createElement('span', { id: 'new' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement,
      nextElement: null,
    });
    expect(result.tasks).toContainEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement,
    });
    expect(nextElement._store).toBeNull(); // Ensure store is not carried over
  });

  it('correctly diffs functional components with conditional rendering', () => {
    const ConditionalComponent: SimpReact.FC<{ show: boolean }> = props => {
      return props.show
        ? SimpReact.createElement('div', { id: 'shown' })
        : SimpReact.createElement('span', { id: 'hidden' });
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(ConditionalComponent, { show: true }));
    const nextElement = SimpReact.createElement(ConditionalComponent, { show: false });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement: expect.objectContaining({ type: 'div', props: { id: 'shown' } }),
      nextElement: null,
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'hidden' } }),
    });
  });

  it('correctly diffs elements with complex props, creating tasks for deep changes', () => {
    const prevElement = SimpReact.createElement('div', { data: { key1: 'value1', key2: 'value2' } });
    const nextElement = SimpReact.createElement('div', { data: { key1: 'value1', key2: 'newValue2' } });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement,
      nextElement,
    });
  });

  it('handles a large number of elements efficiently and correctly', () => {
    const prevChildren = Array.from({ length: 1000 }, (_, i) =>
      SimpReact.createElement('div', {
        id: `item-${i}`,
        text: `Item ${i}`,
      })
    );

    const nextChildren = Array.from({ length: 1000 }, (_, i) =>
      SimpReact.createElement('div', {
        id: `item-${i}`,
        text: `Updated Item ${i}`,
      })
    );

    const prevElement = actualizeElementTree(SimpReact.createElement('div', null, prevChildren));
    const nextElement = SimpReact.createElement('div', null, nextChildren);

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1001);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: prevElement,
      nextElement: nextElement,
    });
    result.tasks.slice(1).forEach((task, i) => {
      expect(task).toEqual({
        effectTag: EFFECT_TAG.UPDATE,
        prevElement: prevChildren[i],
        nextElement: nextChildren[i],
      });
    });
  });

  it('correctly diffs elements with props containing non-primitive values like functions or objects', () => {
    const prevElement = SimpReact.createElement('button', {
      onClick: () => console.log('Clicked'),
      style: { color: 'red' },
    });

    const nextElement = SimpReact.createElement('button', {
      onClick: () => console.log('Clicked again'),
      style: { color: 'blue' },
    });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement,
      nextElement,
    });
  });

  it('transfers reference during an UPDATE operation', () => {
    const reference = {};

    const prevElement = actualizeElementTree(SimpReact.createElement('div', { id: 'id' }));
    prevElement!._reference = reference;

    const nextElement = SimpReact.createElement('div', { id: 'new' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement,
      nextElement,
    });
    expect(nextElement._reference).toBe(reference);
  });

  it('correctly transfers and updates reference for nested elements during diffing', () => {
    const parentReference = {};
    const childReference = {};

    const prevElement = actualizeElementTree(
      SimpReact.createElement('div', null, SimpReact.createElement('span', { id: 'child' }))
    );

    prevElement!._reference = parentReference;
    (prevElement!._children as SimpReact.SimpElement)._reference = childReference;

    const nextElement = SimpReact.createElement('div', null, SimpReact.createElement('span', { id: 'updated-child' }));

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(nextElement._reference).toBe(parentReference);
    expect((nextElement._children as SimpReact.SimpElement)._reference).toBe(childReference);
  });

  it('reuses reference during an ADD operation if already present', () => {
    const reference = {};

    const nextElement = SimpReact.createElement('div', { id: 'new' });
    nextElement._reference = reference;

    const result = diff(null, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement,
    });
    expect(nextElement._reference).toBe(reference);
  });

  it('transfers and maintains references across sibling elements during diffing', () => {
    const ref1 = {};
    const ref2 = {};
    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement('span', { id: 'child1' }),
        SimpReact.createElement('span', { id: 'child2' })
      )
    );
    (prevElement!._children as any)[0]._reference = ref1;
    (prevElement!._children as any)[1]._reference = ref2;

    const nextElement = SimpReact.createElement(
      'div',
      null,
      SimpReact.createElement('span', { id: 'child1-updated' }),
      SimpReact.createElement('span', { id: 'child2-updated' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(3);
    expect((nextElement._children as SimpReact.SimpElement[])[0]._reference).toBe(ref1);
    expect((nextElement._children as SimpReact.SimpElement[])[1]._reference).toBe(ref2);
  });

  it('does not transfer reference if the type changes between prevElement and nextElement', () => {
    const reference = {};

    const prevElement = SimpReact.createElement('div', { id: 'old' });
    prevElement._reference = reference;

    const nextElement = SimpReact.createElement('span', { id: 'new' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement,
      nextElement: null,
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement,
    });
    expect(nextElement._reference).not.toBe(reference);
  });

  it('correctly manages references in a complex component tree with nested elements', () => {
    const parentRef = {};
    const childRef1 = {};
    const childRef2 = {};

    const prevElement = actualizeElementTree(
      SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement('span', { id: 'child1' }),
        SimpReact.createElement('p', { id: 'child2' })
      )
    );

    prevElement!._reference = parentRef;
    (prevElement!._children as SimpReact.SimpElement[])[0]._reference = childRef1;
    (prevElement!._children as SimpReact.SimpElement[])[1]._reference = childRef2;

    const nextElement = SimpReact.createElement(
      'div',
      null,
      SimpReact.createElement('span', { id: 'child1-updated' }),
      SimpReact.createElement('p', { id: 'child2-updated' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(3);
    expect(nextElement._reference).toBe(parentRef);
    expect((nextElement._children as SimpReact.SimpElement[])[0]._reference).toBe(childRef1);
    expect((nextElement._children as SimpReact.SimpElement[])[1]._reference).toBe(childRef2);
  });

  it('creates an ADD task for a new functional component and correctly renders it', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => SimpReact.createElement('div', { id: props.id });

    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'new-component' });

    const result = diff(null, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'div', props: { id: 'new-component' } }),
    });
  });

  it('creates an UPDATE task for an updated functional component and correctly updates the output', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => SimpReact.createElement('div', { id: props.id });

    const prevElement = actualizeElementTree(SimpReact.createElement(FunctionalComponent, { id: 'old-component' }));
    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'new-component' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div', props: { id: 'old-component' } }),
      nextElement: expect.objectContaining({ type: 'div', props: { id: 'new-component' } }),
    });
  });

  it('creates DELETE and ADD tasks when the output type of a functional component changes', () => {
    const FunctionalComponentOld: SimpReact.FC = () => SimpReact.createElement('div', { id: 'old-component' });

    const FunctionalComponentNew: SimpReact.FC = () => SimpReact.createElement('span', { id: 'new-component' });

    const prevElement = actualizeElementTree(SimpReact.createElement(FunctionalComponentOld, { id: 'old-component' }));
    const nextElement = SimpReact.createElement(FunctionalComponentNew, { id: 'new-component' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement: expect.objectContaining({ type: 'div', props: { id: 'old-component' } }),
      nextElement: null,
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.INSERT,
      prevElement: null,
      nextElement: expect.objectContaining({ type: 'span', props: { id: 'new-component' } }),
    });
  });

  it('correctly diffs nested functional components and transfers references', () => {
    const ChildComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('span', { id: props.id });
    };

    const ParentComponent: SimpReact.FC = () => {
      return SimpReact.createElement('div', null, SimpReact.createElement(ChildComponent, { id: 'child' }));
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(ParentComponent, null));
    const nextElement = SimpReact.createElement(ParentComponent, null);

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div' }),
      nextElement: expect.objectContaining({ type: 'div' }),
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'span' }),
      nextElement: expect.objectContaining({ type: 'span' }),
    });
    expect((nextElement._children as any)._children._reference).toBe(
      (prevElement!._children as any)._children._reference
    );
  });

  it('correctly diffs a functional component that conditionally renders children', () => {
    const ConditionalComponent: SimpReact.FC<{ show: boolean }> = props => {
      return SimpReact.createElement('div', null, props.show ? SimpReact.createElement('span', { id: 'child' }) : null);
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(ConditionalComponent, { show: true }));
    const nextElement = SimpReact.createElement(ConditionalComponent, { show: false });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.tasks.length).toBe(2);
    expect(result.tasks[0]).toEqual({
      effectTag: EFFECT_TAG.UPDATE,
      prevElement: expect.objectContaining({ type: 'div' }),
      nextElement: expect.objectContaining({ type: 'div' }),
    });
    expect(result.tasks[1]).toEqual({
      effectTag: EFFECT_TAG.REMOVE,
      prevElement: expect.objectContaining({ type: 'span', props: { id: 'child' } }),
      nextElement: null,
    });
  });

  it('calls beforeRender and afterRender for a new functional component during ADD operation', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };

    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'id' });

    const result = diff(null, nextElement, lifecycleManager);

    expect(result.tasks.length).toBe(1);
    expect(lifecycleManager.beforeRender).toHaveBeenCalledWith(nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenCalledWith(nextElement);
  });

  it('calls beforeRender and afterRender for an updated functional component during UPDATE operation', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };

    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const prevElement = SimpReact.createElement(FunctionalComponent, { id: 'old-component' });
    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'new-component' });

    const result = diff(prevElement, nextElement, lifecycleManager);

    expect(result.tasks.length).toBe(1);
    expect(lifecycleManager.beforeRender).toHaveBeenCalledWith(nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenCalledWith(nextElement);
  });

  it('calls beforeRender and afterRender in the correct order for nested functional components', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const ChildComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('span', { id: props.id });
    };

    const ParentComponent: SimpReact.FC = () => {
      return SimpReact.createElement('div', null, SimpReact.createElement(ChildComponent, { id: 'child' }));
    };

    const nextElement = SimpReact.createElement(ParentComponent, null);

    diff(null, nextElement, lifecycleManager);

    expect(lifecycleManager.beforeRender).toHaveBeenNthCalledWith(1, nextElement);
    expect(lifecycleManager.beforeRender).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: ChildComponent }));
    expect(lifecycleManager.afterRender).toHaveBeenNthCalledWith(1, nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: ChildComponent }));
  });

  it('does not call beforeRender and afterRender for non-functional components', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const prevElement = SimpReact.createElement('div', { id: 'old' }, SimpReact.createElement('span', { id: 'child' }));
    const nextElement = SimpReact.createElement(
      'div',
      { id: 'new' },
      SimpReact.createElement('span', { id: 'child-updated' })
    );

    const result = diff(prevElement, nextElement, lifecycleManager);

    expect(result.tasks.length).toBe(2);
    expect(lifecycleManager.beforeRender).not.toHaveBeenCalled();
    expect(lifecycleManager.afterRender).not.toHaveBeenCalled();
  });

  it('handles lifecycle events correctly when functional component output changes type', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const FunctionalComponent: SimpReact.FC<{ change: boolean }> = props => {
      return props.change
        ? SimpReact.createElement('span', { id: 'new-component' })
        : SimpReact.createElement('div', { id: 'old-component' });
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(FunctionalComponent, { change: false }));
    const nextElement = SimpReact.createElement(FunctionalComponent, { change: true });

    const result = diff(prevElement, nextElement, lifecycleManager);

    expect(result.tasks.length).toBe(2);
    expect(lifecycleManager.beforeRender).toHaveBeenCalledWith(nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenCalledWith(nextElement);
  });

  it('calls beforeRender and afterRender exactly once per component', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const FunctionalComponent: SimpReact.FC = () => {
      return SimpReact.createElement(
        'div',
        null,
        SimpReact.createElement('span', { id: 'child1' }),
        SimpReact.createElement('span', { id: 'child2' })
      );
    };

    const nextElement = SimpReact.createElement(FunctionalComponent);

    diff(null, nextElement, lifecycleManager);

    expect(lifecycleManager.beforeRender).toHaveBeenCalledTimes(1);
    expect(lifecycleManager.afterRender).toHaveBeenCalledTimes(1);
  });

  it('handles lifecycle events correctly when functional component children change', () => {
    const lifecycleManager = {
      beforeRender: jest.fn(),
      afterRender: jest.fn(),
    } as unknown as LifecycleManager;

    const FunctionalComponent: SimpReact.FC<{ show: boolean }> = props => {
      return SimpReact.createElement(
        'div',
        null,
        props.show ? SimpReact.createElement('span', { id: 'child1' }) : null
      );
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(FunctionalComponent, { show: true }));
    const nextElement = SimpReact.createElement(FunctionalComponent, { show: false });

    const result = diff(prevElement, nextElement, lifecycleManager);

    expect(result.tasks.length).toBe(2);
    expect(lifecycleManager.beforeRender).toHaveBeenCalledWith(nextElement);
    expect(lifecycleManager.afterRender).toHaveBeenCalledWith(nextElement);
  });

  it('collects a newly rendered functional component in renderedElements during ADD operation', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };

    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'new-component' });

    const result = diff(null, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(nextElement);
  });

  it('collects all rendered functional components in a nested structure', () => {
    const ChildComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('span', { id: props.id });
    };

    const ParentComponent = () => {
      return SimpReact.createElement('div', null, SimpReact.createElement(ChildComponent, { id: 'child' }));
    };

    const nextElement = SimpReact.createElement(ParentComponent);

    const result = diff(null, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(2);
    expect(result.renderedElements).toEqual([
      expect.objectContaining({ type: ChildComponent }),
      expect.objectContaining({ type: ParentComponent }),
    ]);
  });

  it('collects updated functional components in renderedElements during UPDATE operation', () => {
    const FunctionalComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };

    const prevElement = SimpReact.createElement(FunctionalComponent, { id: 'old-component' });
    const nextElement = SimpReact.createElement(FunctionalComponent, { id: 'new-component' });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(nextElement);
  });

  it('collects functional components in renderedElements when their type changes', () => {
    const OldComponent: SimpReact.FC<{ id: string }> = props => {
      return SimpReact.createElement('div', { id: props.id });
    };

    const NewComponent: SimpReact.FC = () => {
      return SimpReact.createElement('span', { id: 'new' });
    };

    const prevElement = SimpReact.createElement(OldComponent, { id: 'component' });
    const nextElement = SimpReact.createElement(NewComponent);

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(nextElement);
  });

  it('collects functional components in renderedElements when re-rendered with different children', () => {
    const FunctionalComponent: SimpReact.FC<{ show: boolean }> = props => {
      return SimpReact.createElement('div', null, props.show && SimpReact.createElement('span', { id: 'child' }));
    };

    const prevElement = SimpReact.createElement(FunctionalComponent, { show: true });
    const nextElement = SimpReact.createElement(FunctionalComponent, { show: false });

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(1);
    expect(result.renderedElements[0]).toEqual(nextElement);
  });

  it('does not collect non-functional components in renderedElements', () => {
    const prevElement = SimpReact.createElement('div', { id: 'old' }, SimpReact.createElement('span', { id: 'child' }));
    const nextElement = SimpReact.createElement(
      'div',
      { id: 'new' },
      SimpReact.createElement('span', { id: 'child-updated' })
    );

    const result = diff(prevElement, nextElement, new LifecycleManager());

    expect(result.renderedElements.length).toBe(0);
  });

  it('does not collect functional elements in tasks during DELETE operation', () => {
    const ChildFunctionalComponent: SimpReact.FC = () => {
      return SimpReact.createElement('span', null, "It's gonna be deleted as well");
    };
    const SecondChildFunctionalComponent: SimpReact.FC = () => {
      return SimpReact.createElement('span', null, "It's not gonna be deleted cause it's in parent host element");
    };

    const FunctionalComponent: SimpReact.FC = () => {
      return [
        SimpReact.createElement('div', null, 'GonnaBeDeleted'),
        SimpReact.createElement(ChildFunctionalComponent),
        SimpReact.createElement('div', null, SimpReact.createElement(SecondChildFunctionalComponent)),
        SimpReact.createElement('span', null, 'GonnaBeDeleted as well'),
      ];
    };

    const prevElement = actualizeElementTree(SimpReact.createElement(FunctionalComponent));

    const result = diff(prevElement, null, new LifecycleManager());

    expect(result.tasks.length).toBe(4);
    result.tasks.forEach(task => {
      expect(typeof task.prevElement?.type).toBe('string');
      expect(task.nextElement).toBeNull();
    });
  });
});

export function actualizeElementTree(element: Maybe<SimpReact.SimpElement>): Maybe<SimpReact.SimpElement> {
  // Create a tree (_children, _parent connections) for the element for normal diffing.
  diff(null, element, new LifecycleManager());
  return element;
}
