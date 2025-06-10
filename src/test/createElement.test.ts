import { describe, expect, it } from 'vitest';
import type { FC, SimpElement } from '../main/core';
import { createContext, createElement, Fragment } from '../main/core';
import { createTextElement, normalizeChildren, normalizeRoot } from '../main/core/createElement';

function createMockHostElement(): SimpElement {
  return createElement('div', null, '123');
}

const MockComponent: FC = props => {
  return createElement('div', props);
};

describe('createElement and utils', () => {
  describe('normalizeChildren', () => {
    it('returns undefined for null, undefined, boolean, or empty arrays', () => {
      expect(normalizeChildren(null)).toBeUndefined();
      expect(normalizeChildren(undefined)).toBeUndefined();
      expect(normalizeChildren(true)).toBeUndefined();
      expect(normalizeChildren(false)).toBeUndefined();
      expect(normalizeChildren([])).toBeUndefined();
      expect(
        normalizeChildren([
          [[], [[], [], []], []],
          [false, undefined],
        ])
      ).toBeUndefined();
      expect(normalizeChildren([undefined, null, false, true])).toBeUndefined();
      // TODO: maybe it should be discarded as well?
      expect(normalizeChildren('')).toEqual({ flag: 'TEXT', children: '' });
    });

    it('wraps string and number into text elements', () => {
      expect(normalizeChildren('hello')).toEqual({
        flag: 'TEXT',
        children: 'hello',
      });
      expect(normalizeChildren(42)).toEqual({
        flag: 'TEXT',
        children: 42,
      });
      expect(normalizeChildren(42n)).toEqual({
        flag: 'TEXT',
        children: 42n,
      });
    });

    it('returns the element itself if valid SimpElement', () => {
      const el = createMockHostElement();
      expect(normalizeChildren(el)).toBe(el);
    });

    it('flattens nested arrays of strings and numbers', () => {
      const result = normalizeChildren(['a', [1, ['b']]]);
      expect(result).toEqual([
        {
          flag: 'TEXT',
          children: 'a',
        },
        {
          flag: 'TEXT',
          children: 1,
        },
        {
          flag: 'TEXT',
          children: 'b',
        },
      ]);
    });

    it('flattens mixed array of elements and text', () => {
      const el = createMockHostElement();
      const result = normalizeChildren(['a', el, 2]);
      expect(result).toEqual([
        {
          flag: 'TEXT',
          children: 'a',
        },
        el,
        {
          flag: 'TEXT',
          children: 2,
        },
      ]);
    });

    it('returns single element directly', () => {
      const el = createMockHostElement();
      expect(normalizeChildren(el)).toBe(el);
    });

    it('returns array if more than one element after normalization', () => {
      const el1 = createMockHostElement();
      const el2 = createMockHostElement();
      const result = normalizeChildren([el1, el2]);
      expect(result).toEqual([el1, el2]);
    });

    it('throws in development if object lacks flag', () => {
      expect(() => normalizeChildren({ notAValidElement: true } as any)).toThrow(TypeError);
    });
  });

  describe('createTextElement', () => {
    it('makes text element from different children types', () => {
      expect(createTextElement(1)).toEqual({ flag: 'TEXT', children: 1 });
      expect(createTextElement(0)).toEqual({ flag: 'TEXT', children: 0 });
      expect(createTextElement(-1)).toEqual({ flag: 'TEXT', children: -1 });
      expect(createTextElement(42n)).toEqual({ flag: 'TEXT', children: 42n });
      expect(createTextElement('')).toEqual({ flag: 'TEXT', children: '' });
      expect(createTextElement(true)).toEqual({ flag: 'TEXT', children: '' });
      expect(createTextElement(false)).toEqual({ flag: 'TEXT', children: '' });
      expect(createTextElement(undefined)).toEqual({ flag: 'TEXT', children: '' });
      // @ts-expect-error Just another undefined.
      expect(createTextElement()).toEqual({ flag: 'TEXT', children: '' });
      expect(createTextElement(null)).toEqual({ flag: 'TEXT', children: '' });
    });
  });

  describe('createElement', () => {
    it('creates an element with a string type and no props or children', () => {
      const element = createElement('div');
      expect(element).toEqual({
        flag: 'HOST',
        type: 'div',
      });
    });

    it('creates an element with a string type and with text children', () => {
      const element = createElement('div', null, 'child');
      expect(element).toEqual({
        flag: 'HOST',
        type: 'div',
        children: { flag: 'TEXT', children: 'child' },
      });
    });

    it('creates an element with a string type and props', () => {
      const element = createElement('div', { id: 'it' });
      expect(element).toEqual({
        flag: 'HOST',
        type: 'div',
        props: { id: 'it' },
      });
    });

    it('creates an element with a className and a key', () => {
      const element = createElement('div', { className: 'red-colored', key: 'id' });
      expect(element).toEqual({
        flag: 'HOST',
        type: 'div',
        className: 'red-colored',
        key: 'id',
      });
    });

    it('creates an element with a string type, props, and children', () => {
      expect(createElement('div', { id: 'it' }, 'child1', 'child2', createMockHostElement())).toEqual({
        flag: 'HOST',
        type: 'div',
        props: { id: 'it' },
        children: [{ flag: 'TEXT', children: 'child1' }, { flag: 'TEXT', children: 'child2' }, createMockHostElement()],
      });
      expect(createElement('div', { id: 'it', children: ['child1', 'child2', createMockHostElement()] })).toEqual({
        flag: 'HOST',
        type: 'div',
        props: { id: 'it' },
        children: [{ flag: 'TEXT', children: 'child1' }, { flag: 'TEXT', children: 'child2' }, createMockHostElement()],
      });
    });

    it('creates an element with a component type and props', () => {
      const props = { foo: 'bar' };
      const element = createElement(MockComponent, props);
      expect(element).toEqual({
        flag: 'FC',
        type: MockComponent,
        props,
      });
    });

    it('creates an element with a component type, props, children, and key', () => {
      const element = createElement(
        MockComponent,
        { foo: 'bar', key: 'KEY', className: 'red-colored' },
        'child1',
        'child2'
      );
      expect(element).toEqual({
        flag: 'FC',
        type: MockComponent,
        props: { foo: 'bar', children: ['child1', 'child2'], className: 'red-colored' },
        key: 'KEY',
      });
    });

    it('creates an element with the children only from createElement args', () => {
      const fcElement = createElement(MockComponent, { foo: 'bar', children: 'ignored children' }, 'child1', 'child2');
      const hostElement = createElement('div', { foo: 'bar', children: 'ignored children' }, 'child1', 'child2');

      expect(fcElement).toEqual({
        flag: 'FC',
        type: MockComponent,
        props: { foo: 'bar', children: ['child1', 'child2'] },
      });
      expect(hostElement).toEqual({
        flag: 'HOST',
        type: 'div',
        props: { foo: 'bar' },
        children: [
          { flag: 'TEXT', children: 'child1' },
          { flag: 'TEXT', children: 'child2' },
        ],
      });
    });

    it('creates an element with the children only from props', () => {
      const element = createElement(MockComponent, { foo: 'bar', children: ['child1', 'child2'] });

      expect(element).toEqual({
        flag: 'FC',
        type: MockComponent,
        props: { foo: 'bar', children: ['child1', 'child2'] },
      });
    });

    it('creates a Fragment element', () => {
      expect(createElement(Fragment)).toEqual({ flag: 'FRAGMENT' });
      expect(createElement(Fragment, { children: '12' })).toEqual({
        flag: 'FRAGMENT',
        children: { flag: 'TEXT', children: '12' },
      });
      expect(createElement(Fragment, { children: 'ignored children' }, '123')).toEqual({
        flag: 'FRAGMENT',
        children: { flag: 'TEXT', children: '123' },
      });
      expect(createElement(Fragment, null!, '123', '456', createMockHostElement())).toEqual({
        flag: 'FRAGMENT',
        children: [
          { flag: 'TEXT', children: '123' },
          { flag: 'TEXT', children: '456' },
          { flag: 'HOST', type: 'div', children: { flag: 'TEXT', children: '123' } },
        ],
      });
      expect(createElement(Fragment, { key: 'KEY', children: createMockHostElement() })).toEqual({
        flag: 'FRAGMENT',
        key: 'KEY',
        children: { flag: 'HOST', type: 'div', children: { flag: 'TEXT', children: '123' } },
      });
    });

    it('creates a Provider element', () => {
      const TestContext = createContext('DEFAULT_VALUE');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Provider, { value: 'PROVIDED_VALUE' }, 12)).toEqual({
        flag: 'PROVIDER',
        type: TestContext.Provider,
        children: { flag: 'TEXT', children: 12 },
        props: { value: 'PROVIDED_VALUE' },
      });
      expect(
        createElement(TestContext.Provider, {
          value: 'PROVIDED_VALUE',
          children: createMockHostElement(),
        })
      ).toEqual({
        flag: 'PROVIDER',
        type: TestContext.Provider,
        children: createMockHostElement(),
        props: { value: 'PROVIDED_VALUE' },
      });
      expect(
        createElement(TestContext.Provider, { value: 'PROVIDED_VALUE', children: 'ignored children' }, '123')
      ).toEqual({
        flag: 'PROVIDER',
        type: TestContext.Provider,
        children: { flag: 'TEXT', children: '123' },
        props: { value: 'PROVIDED_VALUE' },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Provider, { key: '123', value: 'PROVIDED_VALUE' }, '123')).toEqual({
        flag: 'PROVIDER',
        type: TestContext.Provider,
        children: { flag: 'TEXT', children: '123' },
        props: { value: 'PROVIDED_VALUE' },
        key: '123',
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Provider, { value: 'PROVIDED_VALUE' })).toEqual({
        flag: 'PROVIDER',
        type: TestContext.Provider,
        props: { value: 'PROVIDED_VALUE' },
        children: undefined,
      });
    });

    it('creates a Consumer element', () => {
      const TestContext = createContext('DEFAULT_VALUE');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer, null, MockComponent)).toEqual({
        flag: 'CONSUMER',
        type: TestContext.Consumer,
        props: { children: MockComponent },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer, { children: MockComponent })).toEqual({
        flag: 'CONSUMER',
        type: TestContext.Consumer,
        props: { children: MockComponent },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer, { key: '123', children: MockComponent })).toEqual({
        flag: 'CONSUMER',
        type: TestContext.Consumer,
        props: { children: MockComponent },
        key: '123',
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer)).toEqual({
        flag: 'CONSUMER',
        type: TestContext.Consumer,
        props: { children: null },
      });
    });
  });

  describe('normalizeRoot', () => {
    it('should wrap null in a text element', () => {
      expect(normalizeRoot(null)).toEqual(undefined);
      expect(normalizeRoot('hello')).toEqual({ flag: 'TEXT', children: 'hello' });
      expect(normalizeRoot(42)).toEqual({ flag: 'TEXT', children: 42 });
      expect(normalizeRoot(123n)).toEqual({ flag: 'TEXT', children: 123n });
      // TODO: maybe it should be discarded as well?
      expect(normalizeRoot('')).toEqual({ flag: 'TEXT', children: '' });
      expect(normalizeRoot(true)).toEqual(undefined);
    });

    it('should wrap an array in a fragment element', () => {
      const result = normalizeRoot(['a', 'b', ['c']]);
      expect(result).toEqual({
        flag: 'FRAGMENT',
        children: [
          { flag: 'TEXT', children: 'a' },
          { flag: 'TEXT', children: 'b' },
          { flag: 'TEXT', children: 'c' },
        ],
      });
    });

    it('should return node itself if it is already a SimpElement', () => {
      const node: SimpElement = { type: 'div', flag: 'HOST' };
      const result = normalizeRoot(node);
      expect(result).toBe(node);
    });
  });
});
