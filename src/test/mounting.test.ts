import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Element, Text } from 'flyweight-dom';

import type { HostReference, SimpContextMap, SimpElement } from '@simpreact/internal';
import {
  createContext,
  createElement,
  createTextElement,
  lifecycleEventBus,
  mountConsumer,
  mountFunctionalElement,
  mountHostElement,
  mountProvider,
  mountTextElement,
  provideHostAdapter,
} from '@simpreact/internal';
import { testHostAdapter } from './test-host-adapter';

provideHostAdapter(testHostAdapter);

describe('mounting', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('mountHostElement', () => {
    it('should create host element with minimal props', () => {
      const element = createElement('div');

      mountHostElement(element, null, null, null);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div');
      expect(element.reference).instanceof(Element);
      expect(testHostAdapter.setClassname).not.toHaveBeenCalled();
      expect(testHostAdapter.insertOrAppend).not.toHaveBeenCalled();
      expect(testHostAdapter.mountProps).not.toHaveBeenCalled();
    });

    it('should handle className when provided', () => {
      const element = createElement('div', { className: 'test-class' });

      mountHostElement(element, null, null, null);

      expect(testHostAdapter.setClassname).toHaveBeenCalledWith(element.reference, 'test-class');
    });

    it('should mount single child', () => {
      const childElement = createElement('span', null, 'child');
      const element = createElement('div', null, childElement);

      mountHostElement(element, null, null, null);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span');
      expect(element.reference).instanceof(Element);
      expect((element.reference as unknown as Element).nodeName).toEqual('div');
      expect((element.children as SimpElement).reference).instanceof(Element);
      expect(((element.children as SimpElement).reference as unknown as Element).nodeName).toEqual('span');
    });

    it('should mount array of children', () => {
      const child1 = createElement('span');
      const child2 = createElement('p');
      const element = createElement('div', null, child1, child2);

      mountHostElement(element, null, null, null);

      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('p');
      expect(element.reference).instanceof(Element);
      expect((element.reference as unknown as Element).nodeName).toEqual('div');
      expect((element.children as SimpElement[])[0]!.reference).instanceof(Element);
      expect((element.children as SimpElement[])[1]!.reference).instanceof(Element);
      expect(((element.children as SimpElement[])[0]!.reference as unknown as Element).nodeName).toEqual('span');
      expect(((element.children as SimpElement[])[1]!.reference as unknown as Element).nodeName).toEqual('p');
    });

    it('should insert into parent when provided', () => {
      const parentRef = new Element('root');
      const nextRef = new Element('sibling');

      parentRef.appendChild(nextRef);

      const element = createElement('div');

      mountHostElement(element, parentRef as HostReference, nextRef as HostReference, null);

      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parentRef, element.reference, nextRef);
    });

    it('should mount props correctly', () => {
      const props = { id: 'test-id', onClick: vi.fn() };
      const element = createElement('button', props);

      mountHostElement(element, null, null, null);

      expect(testHostAdapter.mountProps).toHaveBeenCalledWith(element.reference, props);
    });
  });

  describe('mountFunctionalElement', () => {
    it('should call lifecycle events and mount child', async () => {
      const testFn = vi.fn(() => createElement('div'));
      const element = createElement(testFn);
      const parentRef = new Element('root');
      const nextRef = new Element('sibling');
      const contextMap = new Map();

      parentRef.appendChild(nextRef);

      const listener = vi.fn();

      lifecycleEventBus.subscribe(listener);

      mountFunctionalElement(element, parentRef as HostReference, nextRef as HostReference, contextMap);

      expect(listener).toHaveBeenCalledWith({ type: 'beforeRender', element });
      expect(listener).toHaveBeenCalledWith({ type: 'afterRender' });
      expect(listener).toHaveBeenCalledWith({ type: 'mounted', element });
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

      mountFunctionalElement(element, null, null, null);

      expect(element.children).toBe(child);
    });

    it('should pass props to functional component', () => {
      const testFn = vi.fn(props => createElement('section', props));
      const props = { id: 'main-section', custom: 42 };
      const element = createElement(testFn, props);

      mountFunctionalElement(element, null, null, null);

      expect(testFn).toHaveBeenCalledWith(props);
      expect(testHostAdapter.mountProps).toHaveBeenCalledWith((element.children as SimpElement).reference, props);
    });

    it('should assign context map to the element', () => {
      const testFn = vi.fn(() => createElement('div'));
      const contextMap: SimpContextMap = new Map();
      const element = createElement(testFn);

      mountFunctionalElement(element, null, null, contextMap);

      expect(element.contextMap).toBe(contextMap);
    });

    it('should support nested functional elements', () => {
      const innerFn = vi.fn(() => createElement('span'));
      const outerFn = vi.fn(() => createElement(innerFn));
      const element = createElement(outerFn);

      mountFunctionalElement(element, null, null, null);

      expect(outerFn).toHaveBeenCalled();
      expect(innerFn).toHaveBeenCalled();
      expect((element.children as SimpElement).type).toBe(innerFn);
    });

    it('should handle functional component returning null', () => {
      const testFn = vi.fn(() => null);
      const element = createElement(testFn);

      mountFunctionalElement(element, null, null, null);

      expect(element.children).not.toBeDefined();
    });
  });

  describe('mountTextElement', () => {
    it('should create text reference from string children', () => {
      const element = createTextElement('Hello World');

      mountTextElement(element, null, null);

      expect(element.reference).instanceof(Text);
      expect(testHostAdapter.createTextReference).toHaveBeenCalledWith('Hello World');
    });

    it('should insert into parent if provided', () => {
      const element = createTextElement('Hello');
      const parentRef = new Element('div');
      const nextRef = new Element('span');

      parentRef.appendChild(nextRef);

      mountTextElement(element, parentRef as HostReference, nextRef as HostReference);

      expect(testHostAdapter.insertOrAppend).toHaveBeenCalledWith(parentRef, element.reference, nextRef);
    });

    it('should not insert if parent is null', () => {
      const element = createTextElement('Test');

      mountTextElement(element, null, null);

      expect(testHostAdapter.insertOrAppend).not.toHaveBeenCalled();
    });

    it('should reuse existing reference if already set', () => {
      const fakeRef = {};
      const element = createTextElement('Cached');
      element.reference = fakeRef as HostReference;

      mountTextElement(element, null, null);

      expect(testHostAdapter.createTextReference).not.toHaveBeenCalled();
      expect(element.reference).toBe(fakeRef);
    });
  });

  describe('mountProvider', () => {
    it('should provide context to children FCs', () => {
      const context = {};
      // ContextMap is provided only to FC type elements.
      const child = createElement(() => null);
      const element = createElement({ context } as any, { value: 123 }, child);

      mountProvider(element, null, null, null);

      expect(child.contextMap?.get(context as any)).toBe(123);
    });

    it('should provide context to many children FCs', () => {
      const context = {};
      const child1 = createElement(() => null);
      const child2 = createElement(() => null);
      const element = createElement({ context } as any, { value: 'dark' }, child1, child2);

      mountProvider(element, null, null, new Map());

      expect(child1.contextMap?.get(context as any)).toBe('dark');
      expect(child2.contextMap?.get(context as any)).toBe('dark');
    });
  });

  describe('mountConsumer', () => {
    it('should invoke Consumer with props and contextMap and mount result', () => {
      const context = createContext('DEFAULT_VALUE');

      const spyOnConsumer = vi.spyOn(context, 'Consumer');

      const consumerProps = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        children: value => createElement('div', { fromContext: value }),
      };
      const element = createElement(context.Consumer as any, consumerProps);

      const contextMap = new Map();
      contextMap.set(context, 'PROVIDED_VALUE');

      mountConsumer(element, null, null, contextMap);

      expect(spyOnConsumer).toHaveBeenCalledWith(consumerProps, contextMap);
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('div');
      expect(testHostAdapter.mountProps).toHaveBeenCalledWith(expect.objectContaining({ nodeName: 'div' }), {
        fromContext: 'PROVIDED_VALUE',
      });
    });

    it('should handle null result from Consumer children FC gracefully', () => {
      const context = createContext('DEFAULT_VALUE');

      const element = createElement(context.Consumer as any, { children: () => null });

      mountConsumer(element, null, null, null);

      expect(element.children).not.toBeDefined();
      expect(testHostAdapter.createReference).not.toHaveBeenCalled();
    });

    it('should support array result from Consumer', () => {
      const context = createContext('DEFAULT_VALUE');

      const element = createElement(context.Consumer as any, {
        children: () => [createElement('span', { key: 'a' }), createElement('p', { key: 'b' })],
      });

      mountConsumer(element, null, null, null);

      expect(Array.isArray((element.children as SimpElement).children)).toBe(true);
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('span');
      expect(testHostAdapter.createReference).toHaveBeenCalledWith('p');
    });
  });
});
