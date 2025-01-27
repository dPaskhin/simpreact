import { createElement, type FC, SIMP_ELEMENT_TYPE } from '../../main/element';

const MockComponent: FC = props => {
  return createElement('div', props);
};

describe('createElement function', () => {
  it('creates an element with a string type and no props or children', () => {
    const element = createElement('div');
    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: 'div',
      props: null,
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with a string type and props', () => {
    const element = createElement('div', { id: 'it' });
    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: 'div',
      props: { id: 'it' },
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with a string type, props, and children', () => {
    const element = createElement('div', { id: 'it' }, 'child1', 'child2');
    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: 'div',
      props: { id: 'it', children: ['child1', 'child2'] },
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with a component type and props', () => {
    const props = { foo: 'bar' };
    const element = createElement(MockComponent, props);
    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: MockComponent,
      props,
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with a component type, props, and children', () => {
    const props = { foo: 'bar' };
    const element = createElement(MockComponent, props, 'child1', 'child2');
    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: MockComponent,
      props: { foo: 'bar', children: ['child1', 'child2'] },
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with the children only from createElement args', () => {
    const props = { foo: 'bar', children: 'ignored children' };
    const element = createElement(MockComponent, props, 'child1', 'child2');

    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: MockComponent,
      props: { foo: 'bar', children: ['child1', 'child2'] },
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });

  it('creates an element with the children only from props', () => {
    const props = { foo: 'bar', children: ['child1', 'child2'] };
    const element = createElement(MockComponent, props);

    expect(element).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: MockComponent,
      props: { foo: 'bar', children: ['child1', 'child2'] },
      _children: null,
      _parent: null,
      _index: -1,
      _reference: null,
      _store: null,
      _globalContext: null,
    });
  });
});
