import { createContext } from '@simpreact/context';

import {
  createElement,
  createPortal,
  createTextElement,
  type FC,
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

function createMockHostElement(): SimpElement {
  return createElement('div', null, '123');
}

const MockComponent: FC = props => {
  return createElement('div', props);
};

const TestContext = createContext('DEFAULT_VALUE');

describe('createElement and utils', () => {
  describe('normalizeChildren', () => {
    it('returns element with children:null for null, undefined, boolean, or empty arrays', () => {
      expect(normalizeChildren(createMockHostElement(), null, false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), undefined, false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), true, false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), false, false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), [], false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(
        normalizeChildren(createMockHostElement(), [[[], [[], [], []], []], [false, undefined], [''], ''], false)
      ).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), [undefined, null, false, true], false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), '', false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), createElement(Fragment), false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
      expect(normalizeChildren(createMockHostElement(), createPortal(undefined, {}), false)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
      });
    });

    it('wraps string and number into text elements', () => {
      expect(normalizeChildren(createMockHostElement(), 'hello', true)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        },
      });
      expect(normalizeChildren(createMockHostElement(), 42, true)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        },
      });
      expect(normalizeChildren(createMockHostElement(), 42n, true)).toEqual({
        ...createMockHostElement(),
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        },
      });
    });

    it('flattens nested arrays of elements and provides proper keys to each element', () => {
      const el = createMockHostElement();
      normalizeChildren(
        el,
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

      expect(el.children).toEqual([
        {
          key: '.0',
          type: 'span',
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
      normalizeChildren(el, ['a', el, 2], true);
      expect(el.children).toEqual([
        {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        { ...el, childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST, key: '.1' },
        {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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

    it('returns array if more than one element after normalization', () => {
      const parent = createMockHostElement();
      const el1 = createMockHostElement();
      const el2 = createMockHostElement();
      normalizeChildren(parent, [el1, el2], true);
      expect(parent.children).toEqual([el1, el2]);
    });
  });

  describe('createTextElement', () => {
    it('makes text element from different children types', () => {
      expect(createTextElement(1)).toEqual({
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        type: 'div',
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        type: 'div',
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            children: 'child',
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_HOST,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        type: 'div',
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_HOST,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        type: 'div',
        props: {
          id: 'it',
        },
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            children: 'child1',
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        type: 'div',
        props: {
          id: 'it',
          children: ['child1', 'child2', { ...createMockHostElement(), key: '.2' }],
        },
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        type: MockComponent,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        type: 'div',
        props: {
          foo: 'bar',
          children: 'ignored children',
        },
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        children: {
          flag: SIMP_ELEMENT_FLAG_TEXT,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_HOST,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_ELEMENT,
        key: 'KEY',
        children: {
          flag: SIMP_ELEMENT_FLAG_HOST,
          childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
        type: TestContext.Provider,
        props: {
          value: 'PROVIDED_VALUE',
          children: {
            flag: SIMP_ELEMENT_FLAG_HOST,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        type: TestContext.Provider,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        type: TestContext.Consumer,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
        flag: SIMP_ELEMENT_FLAG_FC,
        type: TestContext.Consumer,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_UNKNOWN,
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
      expect(normalizeRoot(createMockHostElement(), 'hello', false).children).toEqual({
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
      expect(normalizeRoot(createMockHostElement(), 42, false).children).toEqual({
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
      expect(normalizeRoot(createMockHostElement(), 123n, false).children).toEqual({
        flag: SIMP_ELEMENT_FLAG_TEXT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
      expect(normalizeRoot(createMockHostElement(), '', false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), true, false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), false, false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), null, false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), undefined, false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), [''], false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), [null], false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), [], false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), [undefined, ['', [[], ['']]]], false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), createElement(Fragment), false).children).toBeNull();
      expect(normalizeRoot(createMockHostElement(), createPortal(undefined, {}), false).children).toBeNull();
    });

    it('should wrap an array in a fragment element', () => {
      expect(
        normalizeRoot(createMockHostElement(), ['a', 'b', ['c'], '', false, [[[true]], '']], true).children
      ).toEqual({
        flag: SIMP_ELEMENT_FLAG_FRAGMENT,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_LIST,
        children: [
          {
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
            flag: SIMP_ELEMENT_FLAG_TEXT,
            childFlag: SIMP_ELEMENT_CHILD_FLAG_TEXT,
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
      expect(normalizeRoot(createMockHostElement(), [createElement('a'), undefined], true).children).toEqual({
        flag: SIMP_ELEMENT_FLAG_HOST,
        childFlag: SIMP_ELEMENT_CHILD_FLAG_EMPTY,
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
      const node: SimpElement = createElement('div');
      expect(normalizeRoot(node, node, true).children).toBe(node);
    });
  });
});
