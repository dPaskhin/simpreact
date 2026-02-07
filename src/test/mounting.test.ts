import { createCreateContext } from '@simpreact/context';
import type { SimpElement, SimpRenderRuntime } from '@simpreact/internal';
import {
  createElement,
  createTextElement,
  lifecycleEventBus,
  mount,
  mountFunctionalElement,
  mountHostElement,
  mountTextElement,
} from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

const createContext = createCreateContext(renderRuntime);

describe('mounting', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('mountHostElement', () => {
    it('should create host element with minimal props', () => {
      const element = createElement('div');
      const parentReference = testHostAdapter.createReference('div');

      mountHostElement(element, parentReference, null, null, null, renderRuntime);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
      expect(element.reference).instanceof(Element);
      expect(testHostAdapter.setClassname).not.toHaveBeenCalled();
      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parentReference, expect.any(Element), null);
      expect(testHostAdapter.mountProps).not.toHaveBeenCalled();
    });

    it('should handle className when provided', () => {
      const element = createElement('div', { className: 'test-class' });
      const parentReference = testHostAdapter.createReference('div');

      mountHostElement(element, parentReference, null, null, null, renderRuntime);

      expect(testHostAdapter.setClassname).toHaveBeenCalledWith(element.reference, 'test-class', '');
    });

    it('should mount single child', () => {
      const childElement = createElement('span', null, 'child');
      const element = createElement('div', null, childElement);
      const parentReference = testHostAdapter.createReference('div');

      mountHostElement(element, parentReference, null, null, null, renderRuntime);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
      expect(element.reference).instanceof(Element);
      expect((element.reference as HTMLDivElement).tagName).toEqual('DIV');
      expect((element.children as SimpElement).reference).instanceof(Element);
      expect(((element.children as SimpElement).reference as HTMLSpanElement).tagName).toEqual('SPAN');
    });

    it('should mount array of children', () => {
      const child1 = createElement('span');
      const child2 = createElement('p');
      const element = createElement('div', null, child1, child2);
      const parentReference = testHostAdapter.createReference('div');

      mountHostElement(element, parentReference, null, null, null, renderRuntime);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('p', '');
      expect(element.reference).instanceof(Element);
      expect((element.reference as HTMLDivElement).nodeName).toEqual('DIV');
      expect((element.children as SimpElement[])[0]!.reference).instanceof(Element);
      expect((element.children as SimpElement[])[1]!.reference).instanceof(Element);
      expect(((element.children as SimpElement[])[0]!.reference as HTMLSpanElement).tagName).toEqual('SPAN');
      expect(((element.children as SimpElement[])[1]!.reference as HTMLParagraphElement).tagName).toEqual('P');
    });

    it('should insert into parent when provided', () => {
      const parentRef = document.createElement('root');
      const nextRef = document.createElement('sibling');

      parentRef.appendChild(nextRef);

      const element = createElement('div');

      mountHostElement(element, parentRef, nextRef, null, null, renderRuntime);

      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parentRef, element.reference, nextRef);
    });

    it('should mount props correctly', () => {
      const props = { id: 'test-id', onClick: vi.fn() };
      const element = createElement('button', props);

      mountHostElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);
      expect(testHostAdapter.mountProps).toHaveBeenCalledWith(element.reference, element, renderRuntime, '');
    });
  });

  describe('mountFunctionalElement', () => {
    it('should call lifecycle events and mount child', async () => {
      const testFn = vi.fn(() => createElement('div'));
      const element = createElement(testFn);
      const parentRef = document.createElement('root');
      const nextRef = document.createElement('sibling');
      const contextMap = new Map();

      parentRef.appendChild(nextRef);

      const listener = vi.fn();

      lifecycleEventBus.subscribe(listener);

      mountFunctionalElement(element, parentRef, nextRef, contextMap, '', renderRuntime);

      expect(listener).toHaveBeenCalledWith({
        type: 'beforeRender',
        element,
        phase: 'mounting',
        renderRuntime,
      });
      expect(listener).toHaveBeenCalledWith({
        type: 'afterRender',
        element,
        phase: 'mounting',
        renderRuntime,
      });
      expect(listener).toHaveBeenCalledWith({ type: 'mounted', element, renderRuntime });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(
        parentRef,
        (element.children as SimpElement).reference,
        nextRef
      );
      expect(testFn).toHaveBeenCalledWith({});
    });

    it('should normalize and assign children from function result', () => {
      const child = createElement('span');
      const element = createElement(() => child);

      mountFunctionalElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(element.children).toBe(child);
    });

    it('should pass props to functional component', () => {
      const testFn = vi.fn(props => createElement('section', props));
      const props = { id: 'main-section', custom: 42 };
      const element = createElement(testFn, props);

      mountFunctionalElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(testFn).toHaveBeenCalledWith(props);
      expect(testHostAdapter.mountProps).toHaveBeenCalledWith(
        (element.children as SimpElement).reference,
        element.children,
        renderRuntime,
        ''
      );
    });

    it('should assign context map to the element', () => {
      const testFn = vi.fn(() => createElement('div'));
      const context = {};
      const element = createElement(testFn);

      mountFunctionalElement(element, testHostAdapter.createReference('div'), null, context, null, renderRuntime);

      expect(element.context).toBe(context);
    });

    it('should support nested functional elements', () => {
      const innerFn = vi.fn(() => createElement('span'));
      const outerFn = vi.fn(() => createElement(innerFn));
      const element = createElement(outerFn);

      mountFunctionalElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(outerFn).toHaveBeenCalled();
      expect(innerFn).toHaveBeenCalled();
      expect((element.children as SimpElement).type).toBe(innerFn);
    });

    it('should handle functional component returning null', () => {
      const testFn = vi.fn(() => null);
      const element = createElement(testFn);

      mountFunctionalElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(element.children).toBeNull();
    });
  });

  describe('mountTextElement', () => {
    it('should create text reference from string children', () => {
      const element = createTextElement('Hello World');

      mountTextElement(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(element.reference).instanceof(Text);
      expect(testHostAdapter.createTextReference).toHaveBeenCalledWith('Hello World');
    });

    it('should insert into parent if provided', () => {
      const element = createTextElement('Hello');
      const parentRef = document.createElement('div');
      const nextRef = document.createElement('span');

      parentRef.appendChild(nextRef);

      mountTextElement(element, parentRef, nextRef, null, null, renderRuntime);

      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parentRef, element.reference, nextRef);
    });
  });

  describe('mountProvider', () => {
    it('should provide context to children FCs', () => {
      const context = createContext(0);
      const child = createElement(() => null);
      const element = createElement(context.Provider, { value: 123 }, child);

      mount(element, null, null, null, null, renderRuntime);

      expect(child.context?.get(context as any).value).toBe(123);
    });

    it('should provide context to many children FCs', () => {
      const context = createContext('');
      const child1 = createElement(() => null);
      const child2 = createElement(() => null);
      const element = createElement(context.Provider, { value: 'dark' }, child1, child2);

      mount(element, null, null, null, null, renderRuntime);

      expect(child1.context?.get(context as any).value).toBe('dark');
      expect(child2.context?.get(context as any).value).toBe('dark');
    });
  });

  describe('mountConsumer', () => {
    it('should invoke Consumer with props and contextMap and mount result', () => {
      const context = createContext('DEFAULT_VALUE');

      const spyOnConsumer = vi.spyOn(context, 'Consumer');
      const consumerRenderer = vi.fn(value => createElement('div', { fromContext: value }));

      const consumerProps = { children: consumerRenderer };
      const element = createElement(context.Consumer as any, consumerProps);

      const contextMap = new Map();
      contextMap.set(context, { value: 'PROVIDED_VALUE', subs: new Set() });

      mount(element, testHostAdapter.createReference('div'), null, contextMap, null, renderRuntime);

      expect(spyOnConsumer).toHaveBeenCalledWith(consumerProps);
      expect(consumerRenderer).toHaveBeenCalledWith('PROVIDED_VALUE');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div', '');
      expect(testHostAdapter.mountProps).toHaveBeenCalledWith(
        document.createElement('div'),
        element.children,
        renderRuntime,
        ''
      );
    });

    it('should handle null result from Consumer children FC gracefully', () => {
      const context = createContext('DEFAULT_VALUE');

      const element = createElement(context.Consumer as any, {
        children: () => null,
      });

      mount(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      (testHostAdapter.createReference as Mock).mockClear();

      expect(element.children).toBeNull();
      expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    });

    it('should support array result from Consumer', () => {
      const context = createContext('DEFAULT_VALUE');

      const element = createElement(context.Consumer as any, {
        children: () => [createElement('span', { key: 'a' }), createElement('p', { key: 'b' })],
      });

      mount(element, testHostAdapter.createReference('div'), null, null, null, renderRuntime);

      expect(Array.isArray((element.children as SimpElement).children)).toBe(true);
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span', '');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('p', '');
    });
  });
});
