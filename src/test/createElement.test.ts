import { createContext } from '@simpreact/context';

import type { FC, SimpElement } from '@simpreact/internal';
import {
  createElement,
  createPortal,
  createTextElement,
  Fragment,
  normalizeChildren,
  normalizeRoot,
  SimpElementFlag,
} from '@simpreact/internal';
import { describe, expect, it } from 'vitest';

function createMockHostElement(): SimpElement {
  return createElement('div', null, '123');
}

const MockComponent: FC = props => {
  return createElement('div', props);
};

const TestContext = createContext('DEFAULT_VALUE');

describe('createElement and utils', () => {
  describe('normalizeChildren', () => {
    it('returns undefined for null, undefined, boolean, or empty arrays', () => {
      expect(normalizeChildren(null, false)).toBeNull();
      expect(normalizeChildren(undefined, false)).toBeNull();
      expect(normalizeChildren(true, false)).toBeNull();
      expect(normalizeChildren(false, false)).toBeNull();
      expect(normalizeChildren([], false)).toBeNull();
      expect(normalizeChildren([[[], [[], [], []], []], [false, undefined], [''], ''], false)).toBeNull();
      expect(normalizeChildren([undefined, null, false, true], false)).toBeNull();
      expect(normalizeChildren('', false)).toBeNull();
      expect(normalizeChildren(createElement(Fragment), false)).toBeNull();
      expect(normalizeChildren(createPortal(undefined, {}), false)).toBeNull();
    });

    it('wraps string and number into text elements', () => {
      expect(normalizeChildren('hello', true)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: 'hello',
        parent: null,
        key: '.0',
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(normalizeChildren(42, true)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '42',
        parent: null,
        key: '.0',
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(normalizeChildren(42n, true)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '42',
        parent: null,
        key: '.0',
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('returns the element itself if valid SimpElement', () => {
      const el = createMockHostElement();
      expect(normalizeChildren(el, true)).toBe(el);
    });

    it('flattens nested arrays of elements and provides proper keys to each element', () => {
      const result = normalizeChildren(
        [
          createElement('span'),
          createElement('span'),
          '123',
          [createElement('p'), createElement('p'), [createElement('s'), createElement('s')]],
          [createElement('b', { key: 'bKeyI' }), createElement('b', { key: 'bKeyII' })],
          createElement('b', { key: 'bKeyII' }),
          createElement('span'),
        ],
        true
      );

      expect(result).toEqual([
        {
          key: '.0',
          type: 'span',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.1',
          type: 'span',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          children: '123',
          key: '.2',
          flag: SimpElementFlag.TEXT,
          parent: null,
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.3.0',
          type: 'p',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.3.1',
          type: 'p',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.3.2.0',
          type: 's',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.3.2.1',
          type: 's',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.4bKeyI',
          type: 'b',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: { key: 'bKeyI' },
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.4bKeyII',
          type: 'b',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: { key: 'bKeyII' },
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: 'bKeyII',
          type: 'b',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: { key: 'bKeyII' },
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        {
          key: '.6',
          type: 'span',
          flag: SimpElementFlag.HOST,
          parent: null,
          props: null,
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
      ]);
    });

    it('flattens mixed array of elements and text', () => {
      const el = createMockHostElement();
      const result = normalizeChildren(['a', el, 2], true);
      expect(result).toEqual([
        {
          flag: SimpElementFlag.TEXT,
          children: 'a',
          parent: null,
          key: '.0',
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        { ...el, key: '.1' },
        {
          flag: SimpElementFlag.TEXT,
          children: '2',
          parent: null,
          key: '.2',
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
      ]);
    });

    it('returns single element directly', () => {
      const el = createMockHostElement();
      expect(normalizeChildren(el, true)).toBe(el);
    });

    it('returns array if more than one element after normalization', () => {
      const el1 = createMockHostElement();
      const el2 = createMockHostElement();
      const result = normalizeChildren([el1, el2], true);
      expect(result).toEqual([el1, el2]);
    });
  });

  describe('createTextElement', () => {
    it('makes text element from different children types', () => {
      expect(createTextElement(1)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '1',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createTextElement(0)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '0',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createTextElement(-1)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '-1',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createTextElement(42n)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '42',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createTextElement('')).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });
  });

  describe('createElement', () => {
    it('creates an element with a string type and no props or children', () => {
      const element = createElement('div');
      expect(element).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        parent: null,
        key: null,
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a string type and with text children', () => {
      expect(createElement('div', null, 'child')).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: { children: 'child' },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement('div', null, '')).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        parent: null,
        key: null,
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement('div', null, 0)).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: { children: '0' },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a string type and with combined children', () => {
      expect(createElement('div', null, ['child'])).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        children: {
          flag: SimpElementFlag.TEXT,
          children: 'child',
          parent: null,
          key: '.0',
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        parent: null,
        key: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement('div', null, 'child', createMockHostElement(), 'tail')).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'child',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.HOST,
            type: 'div',
            props: { children: '123' },
            parent: null,
            key: '.1',
            children: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'tail',
            parent: null,
            key: '.2',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        ],
        parent: null,
        key: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement('div', null, ['child', createMockHostElement(), 'tail'])).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'child',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.HOST,
            type: 'div',
            props: { children: '123' },
            parent: null,
            key: '.1',
            children: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'tail',
            parent: null,
            key: '.2',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        ],
        parent: null,
        key: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a string type and props', () => {
      const element = createElement('div', { id: 'it' });
      expect(element).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: { id: 'it' },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a className and a key', () => {
      const element = createElement('div', {
        className: 'red-colored',
        key: 'id',
      });
      expect(element).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        className: 'red-colored',
        key: 'id',
        parent: null,
        props: { className: 'red-colored', key: 'id' },
        children: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a string type, props, and children', () => {
      expect(createElement('div', { id: 'it' }, 'child1', 'child2', createMockHostElement())).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: {
          id: 'it',
        },
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'child1',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'child2',
            parent: null,
            key: '.1',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          { ...createMockHostElement(), key: '.2' },
        ],
        parent: null,
        key: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(
        createElement('div', {
          id: 'it',
          children: ['child1', 'child2', createMockHostElement()],
        })
      ).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: {
          id: 'it',
          children: ['child1', 'child2', { ...createMockHostElement(), key: '.2' }],
        },
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'child1',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'child2',
            parent: null,
            key: '.1',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          { ...createMockHostElement(), key: '.2' },
        ],
        parent: null,
        key: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with a component type and props', () => {
      const props = { foo: 'bar' };
      const element = createElement(MockComponent, props);
      expect(element).toEqual({
        flag: SimpElementFlag.FC,
        type: MockComponent,
        props,
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
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
        flag: SimpElementFlag.FC,
        type: MockComponent,
        props: {
          foo: 'bar',
          children: ['child1', 'child2'],
          className: 'red-colored',
          key: 'KEY',
        },
        key: 'KEY',
        parent: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with the children only from createElement args', () => {
      const fcElement = createElement(MockComponent, { foo: 'bar', children: 'ignored children' }, 'child1', 'child2');
      const hostElement = createElement('div', { foo: 'bar', children: 'ignored children' }, 'child1', 'child2');

      expect(fcElement).toEqual({
        flag: SimpElementFlag.FC,
        type: MockComponent,
        props: { foo: 'bar', children: ['child1', 'child2'] },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(hostElement).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'div',
        props: {
          foo: 'bar',
          children: 'ignored children',
        },
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'child1',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'child2',
            parent: null,
            key: '.1',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        ],
        parent: null,
        key: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates an element with the children only from props', () => {
      const element = createElement(MockComponent, {
        foo: 'bar',
        children: ['child1', 'child2'],
      });

      expect(element).toEqual({
        flag: SimpElementFlag.FC,
        type: MockComponent,
        props: { foo: 'bar', children: ['child1', 'child2'] },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates a Fragment element', () => {
      expect(createElement(Fragment)).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        parent: null,
        key: null,
        type: null,
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement(Fragment, { children: '12' })).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        children: {
          flag: SimpElementFlag.TEXT,
          children: '12',
          parent: null,
          key: '.0',
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement(Fragment, { children: 'ignored children' }, '123')).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        children: {
          flag: SimpElementFlag.TEXT,
          children: '123',
          parent: null,
          key: '.0',
          type: null,
          props: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement(Fragment, null!, '123', '456', createMockHostElement())).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: '123',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: '456',
            parent: null,
            key: '.1',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.HOST,
            type: 'div',
            props: { children: '123' },
            parent: null,
            key: '.2',
            children: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        ],
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(
        createElement(Fragment, {
          key: 'KEY',
          children: createMockHostElement(),
        })
      ).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        key: 'KEY',
        children: {
          flag: SimpElementFlag.HOST,
          type: 'div',
          props: { children: '123' },
          parent: null,
          key: '.0',
          children: null,
          className: null,
          reference: null,
          store: null,
          context: null,
          ref: null,
          unmounted: null,
        },
        parent: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates a Provider element', () => {
      expect(createElement(TestContext.Provider, { value: 'PROVIDED_VALUE' }, 12)).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Provider,
        props: { value: 'PROVIDED_VALUE', children: 12 },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(
        createElement(TestContext.Provider, {
          value: 'PROVIDED_VALUE',
          children: createMockHostElement(),
        })
      ).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Provider,
        props: {
          value: 'PROVIDED_VALUE',
          children: {
            flag: SimpElementFlag.HOST,
            parent: null,
            props: { children: '123' },
            type: 'div',
            key: null,
            children: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(
        createElement(TestContext.Provider, { value: 'PROVIDED_VALUE', children: 'ignored children' }, '123')
      ).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Provider,
        props: { value: 'PROVIDED_VALUE', children: '123' },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement(TestContext.Provider, { key: '123', value: 'PROVIDED_VALUE' }, '123')).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Provider,
        props: { value: 'PROVIDED_VALUE', children: '123', key: '123' },
        key: '123',
        parent: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(createElement(TestContext.Provider, { value: 'PROVIDED_VALUE' })).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Provider,
        props: { value: 'PROVIDED_VALUE' },
        children: null,
        parent: null,
        key: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('creates a Consumer element', () => {
      const TestContext = createContext('DEFAULT_VALUE');

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer, null, MockComponent)).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Consumer,
        props: { children: MockComponent },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer, { children: MockComponent })).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Consumer,
        props: { children: MockComponent },
        parent: null,
        key: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });

      expect(
        createElement(
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          TestContext.Consumer,
          {
            key: '123',
            children: MockComponent,
          }
        )
      ).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Consumer,
        props: { children: MockComponent, key: '123' },
        key: '123',
        parent: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      expect(createElement(TestContext.Consumer)).toEqual({
        flag: SimpElementFlag.FC,
        type: TestContext.Consumer,
        parent: null,
        key: null,
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });
  });

  describe('normalizeRoot', () => {
    it('should wrap null in a text element or return nothing', () => {
      expect(normalizeRoot('hello', false)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: 'hello',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(normalizeRoot(42, false)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '42',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(normalizeRoot(123n, false)).toEqual({
        flag: SimpElementFlag.TEXT,
        children: '123',
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
      expect(normalizeRoot('', false)).toBeNull();
      expect(normalizeRoot(true, false)).toBeNull();
      expect(normalizeRoot(false, false)).toBeNull();
      expect(normalizeRoot(null, false)).toBeNull();
      expect(normalizeRoot(undefined, false)).toBeNull();
      expect(normalizeRoot([''], false)).toBeNull();
      expect(normalizeRoot([null], false)).toBeNull();
      expect(normalizeRoot([], false)).toBeNull();
      expect(normalizeRoot([undefined, ['', [[], ['']]]], false)).toBeNull();
      expect(normalizeRoot(createElement(Fragment), false)).toBeNull();
      expect(normalizeRoot(createPortal(undefined, {}), false)).toBeNull();
    });

    it('should wrap an array in a fragment element', () => {
      const result = normalizeRoot(['a', 'b', ['c'], '', false, [[[true]], '']], true);
      expect(result).toEqual({
        flag: SimpElementFlag.FRAGMENT,
        children: [
          {
            flag: SimpElementFlag.TEXT,
            children: 'a',
            parent: null,
            key: '.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'b',
            parent: null,
            key: '.1',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
          {
            flag: SimpElementFlag.TEXT,
            children: 'c',
            parent: null,
            key: '.2.0',
            type: null,
            props: null,
            className: null,
            reference: null,
            store: null,
            context: null,
            ref: null,
            unmounted: null,
          },
        ],
        parent: null,
        key: null,
        type: null,
        props: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('should not wrap elements which left single element after normalization', () => {
      const result = normalizeRoot([createElement('a'), undefined], true);
      expect(result).toEqual({
        flag: SimpElementFlag.HOST,
        type: 'a',
        parent: null,
        key: '.0',
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      });
    });

    it('should return node itself if it is already a SimpElement', () => {
      const node: SimpElement = {
        type: 'div',
        flag: SimpElementFlag.HOST,
        parent: null,
        key: null,
        props: null,
        children: null,
        className: null,
        reference: null,
        store: null,
        context: null,
        ref: null,
        unmounted: null,
      };
      const result = normalizeRoot(node, true);
      expect(result).toBe(node);
    });
  });
});
