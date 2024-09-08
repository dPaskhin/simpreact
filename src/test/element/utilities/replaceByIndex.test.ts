import { replaceByIndex, type SimpElement } from '../../../main/element';

describe('replaceByIndex', () => {
  it('does nothing if parent or replacement is null', () => {
    const parent = null;
    const replacement = null;

    replaceByIndex(parent, replacement);

    expect(parent).toBeNull();
  });

  it('does nothing if parent._children is null or undefined', () => {
    const parent = { _children: null } as SimpElement;
    const replacement = { _index: 1 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toBeNull();
  });

  it('replaces a single child element when _index matches', () => {
    const child = { _index: 1 } as SimpElement;
    const parent = { _children: child } as SimpElement;
    const replacement = { _index: 1 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toStrictEqual(replacement);
  });

  it('does not replace a single child element when _index does not match', () => {
    const child = { _index: 1 } as SimpElement;
    const parent = { _children: child } as SimpElement;
    const replacement = { _index: 2 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toStrictEqual(child);
  });

  it('replaces the correct child in an array of children when _index matches', () => {
    const child1 = { _index: 1 } as SimpElement;
    const child2 = { _index: 2 } as SimpElement;
    const child3 = { _index: 3 } as SimpElement;
    const parent = { _children: [child1, child2, child3] } as SimpElement;
    const replacement = { _index: 2 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toStrictEqual([child1, replacement, child3]);
  });

  it('does not replace any child in an array when no _index matches', () => {
    const child1 = { _index: 1 } as SimpElement;
    const child2 = { _index: 2 } as SimpElement;
    const child3 = { _index: 3 } as SimpElement;
    const parent = { _children: [child1, child2, child3] } as SimpElement;
    const replacement = { _index: 4 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toStrictEqual([child1, child2, child3]);
  });

  it('does nothing when _children is an empty array', () => {
    const parent = { _children: [] as any[] } as SimpElement;
    const replacement = { _index: 1 } as SimpElement;

    replaceByIndex(parent, replacement);

    expect(parent._children).toStrictEqual([]);
  });

  it('does nothing if replacement is null', () => {
    const child1 = { _index: 1 } as SimpElement;
    const child2 = { _index: 2 } as SimpElement;
    const parent = { _children: [child1, child2] } as SimpElement;

    replaceByIndex(parent, null);

    expect(parent._children).toStrictEqual([child1, child2]);
  });
});
