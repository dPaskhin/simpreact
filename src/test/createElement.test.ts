import {
  createElement,
  createTextElement,
  Fragment,
  normalizeChildren,
  normalizeRoot,
  SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
  SIMP_ELEMENT_CHILD_FLAG_EMPTY,
  SIMP_ELEMENT_CHILD_FLAG_LIST,
  SIMP_ELEMENT_CHILD_FLAG_TEXT,
  SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
  SIMP_ELEMENT_FLAG_FC,
  SIMP_ELEMENT_FLAG_FRAGMENT,
  SIMP_ELEMENT_FLAG_HOST,
  SIMP_ELEMENT_FLAG_TEXT,
  type SimpElement,
} from '@simpreact/internal';
import { describe, expect, it } from 'vitest';

// ---------------------------------------------------------------------------
// createTextElement
// ---------------------------------------------------------------------------

describe('createTextElement', () => {
  it('creates a text element with correct flags', () => {
    const el = createTextElement('hello');
    expect(el.flag).toBe(SIMP_ELEMENT_FLAG_TEXT);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_TEXT);
    expect(el.children).toBe('hello');
    expect(el.key).toBeNull();
    expect(el.type).toBeNull();
    expect(el.parent).toBeNull();
  });

  it('coerces number to string via toString', () => {
    const el = createTextElement(42);
    expect(el.children).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// createElement — HOST elements
// ---------------------------------------------------------------------------

describe('createElement – HOST', () => {
  it('creates minimal host element', () => {
    const el = createElement('div');
    expect(el.flag).toBe(SIMP_ELEMENT_FLAG_HOST);
    expect(el.type).toBe('div');
    expect(el.key).toBeNull();
    expect(el.props).toBeNull();
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
    expect(el.children).toBeNull();
  });

  it('extracts key from props (coerced to string)', () => {
    const el = createElement('div', { key: 42 });
    expect(el.key).toBe('42');
  });

  it('extracts className from props', () => {
    const el = createElement('div', { className: 'foo' });
    expect(el.className).toBe('foo');
  });

  it('sets up ref wrapper when ref prop is present', () => {
    const refFn = () => {};
    const el = createElement('div', { ref: refFn });
    expect(el.ref).toEqual({ value: refFn });
  });

  it('text child stored as childFlag TEXT, not as child element', () => {
    const el = createElement('div', null, 'hello');
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_TEXT);
    expect(el.props?.children).toBe('hello');
    expect(el.children).toBeNull();
  });

  it('empty string child produces EMPTY childFlag', () => {
    const el = createElement('div', null, '');
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
    expect(el.props?.children).toBeUndefined();
  });

  it('single element child produces ELEMENT childFlag', () => {
    const child = createElement('span');
    const el = createElement('div', null, child);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('multiple element children produce LIST childFlag', () => {
    const a = createElement('a');
    const b = createElement('b');
    const el = createElement('div', null, a, b);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_LIST);
    expect(el.children).toEqual([a, b]);
  });

  it('assigns sequential indices to list children', () => {
    const a = createElement('a');
    const b = createElement('b');
    const c = createElement('c');
    createElement('div', null, a, b, c);
    expect(a.index).toBe(0);
    expect(b.index).toBe(1);
    expect(c.index).toBe(2);
  });

  it('children from props.children (no rest args)', () => {
    const child = createElement('span');
    const el = createElement('div', { children: child });
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('ignores null/undefined/boolean children', () => {
    const el = createElement('div', null, null, undefined, false, true);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
    expect(el.children).toBeNull();
  });

  it('number child stored as text content', () => {
    const el = createElement('div', null, 42);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_TEXT);
    expect(el.props?.children).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// createElement — FC elements
// ---------------------------------------------------------------------------

describe('createElement – FC', () => {
  const Fn = () => null;

  it('creates an FC element', () => {
    const el = createElement(Fn);
    expect(el.flag).toBe(SIMP_ELEMENT_FLAG_FC);
    expect(el.type).toBe(Fn);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_UNKNOWN); // children not yet resolved
    expect(el.props).toBeNull();
  });

  it('stores props (including children) on FC element', () => {
    const child = createElement('span');
    const el = createElement(Fn, { id: 'x' }, child);
    expect(el.props).toEqual({ id: 'x', children: child });
  });

  it('extracts key from FC props', () => {
    const el = createElement(Fn, { key: 'k1' });
    expect(el.key).toBe('k1');
  });
});

// ---------------------------------------------------------------------------
// createElement — Fragment elements
// ---------------------------------------------------------------------------

describe('createElement – Fragment', () => {
  it('creates an empty Fragment', () => {
    const el = createElement(Fragment);
    expect(el.flag).toBe(SIMP_ELEMENT_FLAG_FRAGMENT);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
    expect(el.children).toBeNull();
  });

  it('single child Fragment has ELEMENT childFlag', () => {
    const child = createElement('div');
    const el = createElement(Fragment, null, child);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('multi child Fragment has LIST childFlag with correct indices', () => {
    const a = createElement('a', { key: 'a' });
    const b = createElement('b', { key: 'b' });
    const el = createElement(Fragment, null, a, b);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_LIST);
    const list = el.children as SimpElement[];
    expect(list[0]).toBe(a);
    expect(list[1]).toBe(b);
    expect(a.index).toBe(0);
    expect(b.index).toBe(1);
  });

  it('throws for invalid element type', () => {
    expect(() => createElement({} as any, null)).toThrow('Invalid element type');
  });
});

// ---------------------------------------------------------------------------
// normalizeChildren
// ---------------------------------------------------------------------------

describe('normalizeChildren', () => {
  function makeHost(): SimpElement {
    return createElement('div');
  }

  it('ignored node → EMPTY', () => {
    const el = makeHost();
    normalizeChildren(el, null, false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
  });

  it('single element → ELEMENT', () => {
    const el = makeHost();
    const child = createElement('span');
    normalizeChildren(el, child, false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('multiple elements → LIST', () => {
    const el = makeHost();
    normalizeChildren(el, [createElement('a'), createElement('b')], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_LIST);
    expect((el.children as SimpElement[]).length).toBe(2);
  });

  it('array with single element → ELEMENT', () => {
    const el = makeHost();
    const child = createElement('span');
    normalizeChildren(el, [child], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('flattens nested arrays', () => {
    const el = makeHost();
    const a = createElement('a');
    const b = createElement('b');
    normalizeChildren(el, [[a, b]], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_LIST);
    const list = el.children as SimpElement[];
    expect(list[0]).toBe(a);
    expect(list[1]).toBe(b);
  });

  it('text child becomes text element in list', () => {
    const el = makeHost();
    normalizeChildren(el, 'hello', false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    const child = el.children as SimpElement;
    expect(child.flag).toBe(SIMP_ELEMENT_FLAG_TEXT);
  });

  it('skipIgnoredCheck=true still processes valid children normally', () => {
    const el = makeHost();
    const child = createElement('span');
    normalizeChildren(el, child, true);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });
});

// ---------------------------------------------------------------------------
// normalizeRoot
// ---------------------------------------------------------------------------

describe('normalizeRoot', () => {
  function makeHost(): SimpElement {
    return createElement('div');
  }

  it('null → EMPTY', () => {
    const el = makeHost();
    normalizeRoot(el, null, false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
  });

  it('text string → ELEMENT wrapping a text element', () => {
    const el = makeHost();
    normalizeRoot(el, 'hello', false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    const child = el.children as SimpElement;
    expect(child.flag).toBe(SIMP_ELEMENT_FLAG_TEXT);
    expect(child.children).toBe('hello');
  });

  it('single element → ELEMENT', () => {
    const el = makeHost();
    const child = createElement('span');
    normalizeRoot(el, child, false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('single-item array → ELEMENT (no wrapping Fragment)', () => {
    const el = makeHost();
    const child = createElement('span');
    normalizeRoot(el, [child], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    expect(el.children).toBe(child);
  });

  it('multi-item array → wraps in Fragment, childFlag = ELEMENT', () => {
    const el = makeHost();
    const a = createElement('a');
    const b = createElement('b');
    normalizeRoot(el, [a, b], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_ELEMENT);
    const child = el.children as SimpElement;
    expect(child.flag).toBe(SIMP_ELEMENT_FLAG_FRAGMENT);
  });

  it('empty array → EMPTY', () => {
    const el = makeHost();
    normalizeRoot(el, [], false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
  });

  it('boolean → EMPTY', () => {
    const el = makeHost();
    normalizeRoot(el, false, false);
    expect(el.childFlag).toBe(SIMP_ELEMENT_CHILD_FLAG_EMPTY);
  });
});

// ---------------------------------------------------------------------------
// Key normalization
// ---------------------------------------------------------------------------

describe('key normalization in children', () => {
  it('keyed child in a plain array gets key preserved', () => {
    const child = createElement('div', { key: 'myKey' });
    const el = createElement('div', null, child);
    expect((el.children as SimpElement).key).toBe('myKey');
  });

  it('un-keyed children in an array get auto-generated index keys', () => {
    // When multiple children are passed, they become an array internally.
    // normalizeNode assigns path-based keys like '.0', '.1' to un-keyed elements.
    const a = createElement('a');
    const b = createElement('b');
    createElement('div', null, a, b);
    expect(a.key).toBe('.0');
    expect(b.key).toBe('.1');
  });
});
