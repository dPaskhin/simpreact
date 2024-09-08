import { createElement, createRootElement, SIMP_ELEMENT_TYPE } from '../../main/element';

describe('createRootElement function', () => {
  it('creates a root element with a given container', () => {
    const container = {};
    const element = createElement('div');
    const rootElement = createRootElement(element, container);

    expect(rootElement).toStrictEqual(element);
    expect(rootElement._parent).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: 'root',
      props: null,
      _children: element,
      _parent: null,
      _reference: container,
      _index: -1,
      _store: null,
    });
  });

  it('overrides the parent of an element that already has a parent', () => {
    const container = {};
    const element = createElement('span');
    element._parent = createElement('div');

    const rootElement = createRootElement(element, container);

    expect(rootElement).toStrictEqual(element);
    expect(rootElement._parent).toEqual({
      $$typeof: SIMP_ELEMENT_TYPE,
      type: 'root',
      props: null,
      _children: element,
      _parent: null,
      _reference: container,
      _index: -1,
      _store: null,
    });
  });
});
