import { createElement, findParentReference } from '../../../main/element';

describe('findParentReference', () => {
  it('returns null when the element has no parent', () => {
    const element = createElement('div');
    const result = findParentReference(element);

    expect(result).toBeNull();
  });

  it('returns the parent when it has a _dom property', () => {
    const parent = createElement('div');
    parent._reference = {} as Element;

    const element = createElement('span');
    element._parent = parent;

    const result = findParentReference(element);

    expect(result).toBe(parent._reference);
  });

  it('returns the first ancestor with a _dom property when the parent does not have one', () => {
    const grandparent = createElement('div');
    grandparent._reference = {} as Element;

    const parent = createElement('span');
    parent._parent = grandparent;
    parent._reference = null;

    const element = createElement('a');
    element._parent = parent;

    const result = findParentReference(element);

    expect(result).toBe(grandparent._reference);
  });

  it('returns null when none of the ancestors have a _dom property', () => {
    const grandparent = createElement('div');
    const parent = createElement('span');
    parent._parent = grandparent;

    const element = createElement('b');
    element._parent = parent;

    const result = findParentReference(element);

    expect(result).toBeNull();
  });

  it('handles circular reference by returning the element itself if it has a _dom property', () => {
    const element = createElement('div');
    element._reference = {} as Element;
    element._parent = element;

    const result = findParentReference(element);

    expect(result).toBe(element._reference);
  });
});
