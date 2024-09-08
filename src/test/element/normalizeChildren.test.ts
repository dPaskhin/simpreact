import { createElement, Fragment, normalizeChildren, SIMP_ELEMENT_TYPE, TEXT_TYPE } from '../../main/element';

describe('normalizeChildren', () => {
  it('creates an element from a simple string or number node', () => {
    const stringNode = 'Hello, World!';
    const numberNode = 123;
    const stringElement = normalizeChildren(stringNode, true);
    const numberElement = normalizeChildren(numberNode, true);

    expect(stringElement).toEqual(createElement(TEXT_TYPE, null, stringNode));
    expect(numberElement).toEqual(createElement(TEXT_TYPE, null, numberNode));
  });

  it('returns an empty array when passed an empty array', () => {
    const nodes: any[] = [];
    const element = normalizeChildren(nodes);

    expect(element).toEqual([]);
  });

  it('returns null for a null or a boolean node', () => {
    const nullElement = normalizeChildren(null);
    const booleanElement = normalizeChildren(true);

    expect(nullElement).toBeNull();
    expect(booleanElement).toBeNull();
  });

  it('creates an element from an array of nodes', () => {
    const nodes = ['Hello', 'World'];
    const element = normalizeChildren(nodes);

    expect(element).toEqual([
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 'Hello' },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 'World' },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
    ]);
  });

  it('creates elements from a deeply nested array of nodes', () => {
    const nodes = ['Level 1', ['Level 2', ['Level 3', 'Level 3.1']], 'End'];
    const element = normalizeChildren(nodes);

    expect(element).toEqual([
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 'Level 1' },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: Fragment,
        props: { children: ['Level 2', ['Level 3', 'Level 3.1']] },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 'End' },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
    ]);
  });

  it('creates elements from a mixed array of nodes', () => {
    const nodes = ['Hello', 123, createElement('div')];
    const element = normalizeChildren(nodes);

    expect(element).toEqual([
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 'Hello' },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: TEXT_TYPE,
        props: { children: 123 },
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
      {
        $$typeof: SIMP_ELEMENT_TYPE,
        type: 'div',
        props: null,
        _children: null,
        _parent: null,
        _index: -1,
        _reference: null,
        _store: null,
      },
    ]);
  });

  it('throws an error for invalid object nodes', () => {
    const invalidNode = { foo: 'bar' };

    expect(() => normalizeChildren(invalidNode as any)).toThrow(TypeError);
  });
});
