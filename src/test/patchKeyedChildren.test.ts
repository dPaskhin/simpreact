/**
 * Integration tests for _patchChildren and _patchKeyedChildren.
 * Covers all algorithm steps: prefix sync, suffix sync, next-exhausted (remove),
 * prev-exhausted (mount), LIS-based middle, and all child-mode transitions.
 */

import { createElement, mount, patch, type SimpElement, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Fragment } from '../main/core/fragment.js';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
  renderPhase: null,
  currentRenderingFCElement: null,
};

let parent: Element;

beforeEach(() => {
  vi.restoreAllMocks();
  parent = document.createElement('div');
  renderRuntime.renderStack.length = 0;
  renderRuntime.elementToHostMap.clear();
});

// Returns tags of children of a HOST element's DOM reference
function childTags(el: SimpElement): string[] {
  return Array.from((el.reference as Element).children).map(c => c.nodeName);
}

// Mount a HOST div with keyed element children, return the element
function mountList(...tags: string[]): SimpElement {
  const el = createElement('div', null, ...tags.map(t => createElement(t, { key: t })));
  mount(el, parent, null, null, null, renderRuntime);
  return el;
}

// Patch prev to a new HOST div with keyed element children
function patchList(prev: SimpElement, ...tags: string[]): SimpElement {
  const next = createElement('div', null, ...tags.map(t => createElement(t, { key: t })));
  patch(prev, next, parent, null, null, null, renderRuntime);
  return next;
}

// ---------------------------------------------------------------------------
// LIST → LIST: prefix sync (unchanged head)
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – prefix sync', () => {
  it('all same keys: props patched, no DOM creations', () => {
    const prev = mountList('a', 'b', 'c');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b', 'c');

    expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    expect(testHostAdapter.insertOrAppend).not.toHaveBeenCalled();
    // 1 for the parent div + 3 for a,b,c
    expect(testHostAdapter.patchProps).toHaveBeenCalledTimes(4);
    expect(childTags(next)).toEqual(['A', 'B', 'C']);
  });

  it('prefix matches, new nodes appended at end', () => {
    const prev = mountList('a', 'b');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b', 'c', 'd');

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('c', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('d', '');
    expect(childTags(next)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('prefix matches, trailing nodes removed', () => {
    const prev = mountList('a', 'b', 'c', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b');

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
    expect(childTags(next)).toEqual(['A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// LIST → LIST: suffix sync (unchanged tail)
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – suffix sync', () => {
  it('suffix matches, one element removed from head', () => {
    const prev = mountList('a', 'b', 'c');
    vi.resetAllMocks();

    // Remove 'a', keep 'b','c' as suffix
    const next = patchList(prev, 'b', 'c');

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(1);
    expect(childTags(next)).toEqual(['B', 'C']);
  });

  it('suffix matches, one element inserted at head', () => {
    const prev = mountList('b', 'c');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b', 'c');

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('a', '');
    expect(childTags(next)).toEqual(['A', 'B', 'C']);
  });

  it('suffix elements are patched via pushSuffixPatches', () => {
    // [A, C, D] → [X, C, D]: A removed, X new, C+D are suffix → pushSuffixPatches patches C,D
    const prev = mountList('a', 'c', 'd');
    vi.resetAllMocks();

    // After prefix/suffix sync: suffix is [c,d], middle is [a] vs [x]
    // pushSuffixPatches patches c and d (the suffix elements)
    const next = createElement(
      'div',
      null,
      createElement('x', { key: 'x' }),
      createElement('c', { key: 'c' }),
      createElement('d', { key: 'd' })
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    // patchProps: 1 for parent div + 2 for c,d (suffix patched via pushSuffixPatches)
    expect(testHostAdapter.patchProps).toHaveBeenCalledTimes(3);
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('x', '');
    expect(childTags(next)).toEqual(['X', 'C', 'D']);
  });

  it('removes some middle nodes, suffix is patched via pushSuffixPatches', () => {
    // [A, B, C, D] → [A, D]: B,C removed after prefix A, D is suffix
    const prev = mountList('a', 'b', 'c', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'd');

    // B and C removed, D patched via pushSuffixPatches
    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2); // b, c
    // patchProps: 1 for parent div + 1 for a (prefix) + 1 for d (suffix)
    expect(testHostAdapter.patchProps).toHaveBeenCalledTimes(3);
    expect(childTags(next)).toEqual(['A', 'D']);
  });
});

// ---------------------------------------------------------------------------
// LIST → LIST: step 3 – next exhausted (pure removals)
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – next exhausted (removals)', () => {
  it('removes middle nodes, keeps prefix', () => {
    // [A, B, C] → [A]: B,C removed
    const prev = mountList('a', 'b', 'c');
    vi.resetAllMocks();

    const next = patchList(prev, 'a');

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2); // b, c
    expect(childTags(next)).toEqual(['A']);
  });

  it('removes all when next list is completely empty', () => {
    const prev = mountList('a', 'b', 'c');
    const prevRef = prev.reference as Element;
    vi.resetAllMocks();

    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    // LIST→EMPTY: clearNode clears the host container
    expect(testHostAdapter.clearNode).toHaveBeenCalledWith(prevRef);
    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// LIST → LIST: step 4 – prev exhausted (pure insertions)
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – prev exhausted (insertions)', () => {
  it('inserts all new nodes after prefix', () => {
    // [A] → [A, B, C]: B,C inserted
    const prev = mountList('a');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b', 'c');

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('c', '');
    expect(childTags(next)).toEqual(['A', 'B', 'C']);
  });

  it('inserts new nodes between prefix and suffix', () => {
    // [A, D] → [A, B, C, D]: B,C inserted in middle
    const prev = mountList('a', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'a', 'b', 'c', 'd');

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('c', '');
    expect(childTags(next)).toEqual(['A', 'B', 'C', 'D']);
  });
});

// ---------------------------------------------------------------------------
// LIST → LIST: step 5 – LIS-based middle
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – LIS-based middle', () => {
  it('reorder [A,B,C] → [C,A,B]: minimal moves via LIS', () => {
    const prev = mountList('a', 'b', 'c');
    vi.resetAllMocks();

    const next = patchList(prev, 'c', 'a', 'b');

    // LIS is [a,b] → c is moved
    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledTimes(1);
    expect(childTags(next)).toEqual(['C', 'A', 'B']);
  });

  it('reorder [A,B,C,D] → [D,C,B,A]: full reversal', () => {
    const prev = mountList('a', 'b', 'c', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'd', 'c', 'b', 'a');

    expect(childTags(next)).toEqual(['D', 'C', 'B', 'A']);
  });

  it('[B,A,C] → A moved, LIS=[B,C]: one move', () => {
    // [A,B,C] → [B,A,C]: A is moved
    const prev = mountList('a', 'b', 'c');
    vi.resetAllMocks();

    const next = patchList(prev, 'b', 'a', 'c');

    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledTimes(1);
    expect(childTags(next)).toEqual(['B', 'A', 'C']);
  });

  it('moved=false: matched elements patched in place without DOM moves', () => {
    // [A,B,C,D] → [Z,B,C,W]: A+D removed, Z+W inserted, B+C matched in order (moved=false)
    const prev = mountList('a', 'b', 'c', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'z', 'b', 'c', 'w');

    // a,d removed; z,w created; b,c patched in place (no insertOrAppend for b,c)
    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2); // a, d
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('z', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('w', '');
    // patchProps: 1 for parent div + 2 for b,c (matched in place, moved=false)
    expect(testHostAdapter.patchProps).toHaveBeenCalledTimes(3);
    expect(childTags(next)).toEqual(['Z', 'B', 'C', 'W']);
  });

  it('mixed: remove + reorder + add new', () => {
    // [A,B,C,D] → [D,A,E,C]: B removed, D moved, E new, A+C reordered
    const prev = mountList('a', 'b', 'c', 'd');
    vi.resetAllMocks();

    const next = patchList(prev, 'd', 'a', 'e', 'c');

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('e', '');
    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(1); // b
    expect(childTags(next)).toEqual(['D', 'A', 'E', 'C']);
  });
});

// ---------------------------------------------------------------------------
// _patchChildren – HOST element child mode transitions
// ---------------------------------------------------------------------------

describe('_patchChildren – HOST child mode transitions', () => {
  it('LIST → TEXT: unmounts list children, sets text content', () => {
    const prev = createElement('div', null, createElement('span', { key: 'a' }), createElement('em', { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);
    const prevRef = prev.reference;
    vi.resetAllMocks();

    const next = createElement('div', null, 'hello');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(prevRef, 'hello');
  });

  it('LIST → EMPTY: unmounts list children, clears the host node', () => {
    const prev = createElement('div', null, createElement('span', { key: 'a' }), createElement('em', { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);
    const prevRef = prev.reference;
    vi.resetAllMocks();

    const next = createElement('div');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
    expect(testHostAdapter.clearNode).toHaveBeenCalledWith(prevRef);
  });

  it('ELEMENT → LIST: single child expands to multiple via keyed diff', () => {
    const prev = createElement('div', null, createElement('a', { key: 'a' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('a', { key: 'a' }), createElement('b', { key: 'b' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
    expect(childTags(next)).toEqual(['A', 'B']);
  });

  it('ELEMENT → TEXT: unmounts single child, sets text content', () => {
    const prev = createElement('div', null, createElement('span', { key: 's' }));
    mount(prev, parent, null, null, null, renderRuntime);
    const prevRef = prev.reference;
    vi.resetAllMocks();

    const next = createElement('div', null, 'world');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(1);
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(prevRef, 'world');
  });

  it('TEXT → LIST: clears text content, mounts multiple children', () => {
    const prev = createElement('div', null, 'text');
    mount(prev, parent, null, null, null, renderRuntime);
    const prevRef = prev.reference;
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('a', { key: 'a' }), createElement('b', { key: 'b' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.clearNode).toHaveBeenCalledWith(prevRef);
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('a', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('b', '');
  });

  it('EMPTY → LIST: mounts multiple new children', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement('div', null, createElement('x', { key: 'x' }), createElement('y', { key: 'y' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('x', '');
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('y', '');
    expect(childTags(next)).toEqual(['X', 'Y']);
  });

  it('EMPTY → TEXT: sets text content directly without clearNode', () => {
    const prev = createElement('div');
    mount(prev, parent, null, null, null, renderRuntime);
    const prevRef = prev.reference;
    vi.resetAllMocks();

    const next = createElement('div', null, 'hello');
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(prevRef, 'hello');
    expect(testHostAdapter.clearNode).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fragment as keyed list parent (non-host, uses subtreeRightBoundary)
// ---------------------------------------------------------------------------

describe('_patchChildren – Fragment parent', () => {
  it('Fragment LIST→LIST reorder: DOM children match next order', () => {
    const prev = createElement(
      Fragment,
      null,
      createElement('a', { key: 'a' }),
      createElement('b', { key: 'b' }),
      createElement('c', { key: 'c' })
    );
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(
      Fragment,
      null,
      createElement('c', { key: 'c' }),
      createElement('a', { key: 'a' }),
      createElement('b', { key: 'b' })
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    const tags = Array.from(parent.children).map(c => c.nodeName);
    expect(tags).toEqual(['C', 'A', 'B']);
    expect(testHostAdapter.insertOrAppend).toHaveBeenCalledTimes(1);
  });

  it('Fragment LIST→ELEMENT: collapses to single child via keyed diff', () => {
    const prev = createElement(Fragment, null, createElement('a', { key: 'a' }), createElement('b', { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, createElement('a', { key: 'a' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(1); // b removed
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]!.nodeName).toBe('A');
  });

  it('Fragment EMPTY→LIST: mounts new list children', () => {
    const prev = createElement(Fragment);
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, createElement('x', { key: 'x' }), createElement('y', { key: 'y' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(parent.children.length).toBe(2);
    expect(Array.from(parent.children).map(c => c.nodeName)).toEqual(['X', 'Y']);
  });

  it('Fragment LIST→EMPTY: unmounts all children', () => {
    const prev = createElement(Fragment, null, createElement('i', { key: 'i' }), createElement('u', { key: 'u' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment);
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.unmountProps).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// _patchTextElement – standalone TEXT element in keyed lists
// ---------------------------------------------------------------------------

describe('_patchTextElement – standalone text nodes', () => {
  it('patches text content when text string changes in Fragment list', () => {
    // Fragment children: TEXT element (.0 key) + HOST element (b key)
    const prev = createElement(Fragment, null, 'hello', createElement('b', { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, 'world', createElement('b', { key: 'b' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    // _patchTextElement called: setTextContent for standalone text node
    expect(testHostAdapter.setTextContent).toHaveBeenCalledWith(expect.any(Text), 'world');
  });

  it('no setTextContent when standalone text content is unchanged', () => {
    const prev = createElement(Fragment, null, 'same', createElement('b', { key: 'b' }));
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(Fragment, null, 'same', createElement('b', { key: 'b' }));
    patch(prev, next, parent, null, null, null, renderRuntime);

    // _patchTextElement called but text unchanged → no setTextContent
    expect(testHostAdapter.setTextContent).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveAnchorReference traverses Fragment children (utils.ts lines 108-114)
// ---------------------------------------------------------------------------

describe('resolveAnchorReference – Fragment anchor traversal', () => {
  it('Fragment anchor with LIST children: findHostReferenceFromElement pushes all list children', () => {
    // prev: Fragment([inner_Fragment([span, em])])
    // next: Fragment([x, inner_Fragment([span, em])])
    // When x is inserted, getRightSibling(x)=inner_Fragment_v2 → findHostReferenceFromElement(LIST)
    const prev = createElement(
      Fragment,
      null,
      createElement(Fragment, { key: 'inner' }, createElement('span', { key: 's' }), createElement('em', { key: 'e' }))
    );
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(
      Fragment,
      null,
      createElement('x', { key: 'x' }),
      createElement(Fragment, { key: 'inner' }, createElement('span', { key: 's' }), createElement('em', { key: 'e' }))
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    // x was inserted before span (first child of inner Fragment)
    expect(testHostAdapter.createReference).toHaveBeenCalledWith('x', '');
    const tags = Array.from(parent.children).map(c => c.nodeName);
    expect(tags).toEqual(['X', 'SPAN', 'EM']);
  });

  it('Fragment anchor with ELEMENT child: findHostReferenceFromElement traverses single child', () => {
    // prev: Fragment([inner_Fragment(span)])
    // next: Fragment([x, inner_Fragment(span)])
    // getRightSibling(x)=inner_Fragment_v2 → findHostReferenceFromElement(ELEMENT)
    const prev = createElement(
      Fragment,
      null,
      createElement(Fragment, { key: 'inner' }, createElement('span', { key: 's' }))
    );
    mount(prev, parent, null, null, null, renderRuntime);
    vi.resetAllMocks();

    const next = createElement(
      Fragment,
      null,
      createElement('x', { key: 'x' }),
      createElement(Fragment, { key: 'inner' }, createElement('span', { key: 's' }))
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    expect(testHostAdapter.createReference).toHaveBeenCalledWith('x', '');
    const tags = Array.from(parent.children).map(c => c.nodeName);
    expect(tags).toEqual(['X', 'SPAN']);
  });
});

// ---------------------------------------------------------------------------
// placeElementBeforeAnchor – Fragment element in keyed list (utils.ts 64-71)
// ---------------------------------------------------------------------------

describe('placeElementBeforeAnchor – Fragment node in keyed list', () => {
  it('Fragment with LIST children moved to end: traverses LIST branch (lines 64-68)', () => {
    // Fragment (key='f') with 2 children (LIST childFlag) starts first, then moves to end.
    // _pushHostOperationPlaceElement(frag_next, ...) → placeElementBeforeAnchor with LIST → lines 64-68.
    const frag = createElement(
      Fragment,
      { key: 'f' },
      createElement('span', { key: 's' }),
      createElement('em', { key: 'e' })
    );
    const a = createElement('div', { key: 'a' });
    const b = createElement('div', { key: 'b' });
    const prev = createElement('div', null, frag, a, b);
    mount(prev, parent, null, null, null, renderRuntime);

    const frag2 = createElement(
      Fragment,
      { key: 'f' },
      createElement('span', { key: 's' }),
      createElement('em', { key: 'e' })
    );
    const next = createElement(
      'div',
      null,
      createElement('div', { key: 'a' }),
      createElement('div', { key: 'b' }),
      frag2
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    // After reorder: a, b, then span+em (from Fragment)
    expect(childTags(next)).toEqual(['DIV', 'DIV', 'SPAN', 'EM']);
  });

  it('Fragment with ELEMENT child moved to end: traverses ELEMENT branch (lines 70-71)', () => {
    // Fragment (key='f') with 1 child (ELEMENT childFlag) starts first, then moves to end.
    // placeElementBeforeAnchor with ELEMENT → line 70.
    const frag = createElement(Fragment, { key: 'f' }, createElement('span', { key: 's' }));
    const a = createElement('div', { key: 'a' });
    const b = createElement('div', { key: 'b' });
    const prev = createElement('div', null, frag, a, b);
    mount(prev, parent, null, null, null, renderRuntime);

    const frag2 = createElement(Fragment, { key: 'f' }, createElement('span', { key: 's' }));
    const next = createElement(
      'div',
      null,
      createElement('div', { key: 'a' }),
      createElement('div', { key: 'b' }),
      frag2
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    // After reorder: a, b, then span (from Fragment)
    expect(childTags(next)).toEqual(['DIV', 'DIV', 'SPAN']);
  });
});

// ---------------------------------------------------------------------------
// FC elements in keyed lists
// ---------------------------------------------------------------------------

describe('_patchKeyedChildren – FC nodes in list', () => {
  it('FC nodes matched by key and live element stays as list child', () => {
    const Comp = (props: { label: string }) => createElement('div', null, props.label);

    const prev = createElement(
      Fragment,
      null,
      createElement(Comp, { key: 'a', label: 'A' }),
      createElement(Comp, { key: 'b', label: 'B' })
    );
    mount(prev, parent, null, null, null, renderRuntime);

    const liveA = (prev.children as SimpElement[])[0]!;
    const liveB = (prev.children as SimpElement[])[1]!;
    vi.resetAllMocks();

    const next = createElement(
      Fragment,
      null,
      createElement(Comp, { key: 'b', label: 'B2' }),
      createElement(Comp, { key: 'a', label: 'A2' })
    );
    patch(prev, next, parent, null, null, null, renderRuntime);

    // Live elements swapped into their new positions in next.children (LIST parent)
    const children = next.children as SimpElement[];
    expect(children[0]).toBe(liveB);
    expect(children[1]).toBe(liveA);
  });
});
