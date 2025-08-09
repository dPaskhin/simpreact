import { describe, expect, it, vi } from 'vitest';
import { createElement, provideHostAdapter } from '@simpreact/internal';
import { useEffect, useRef, useRerender } from '@simpreact/hooks';
import { createRoot } from '@simpreact/dom';
import { Element } from 'flyweight-dom';

import { testHostAdapter } from './test-host-adapter';
import { dispatchDelegatedEvent } from '../main/dom/events';

provideHostAdapter(testHostAdapter);

describe('rerender (integration tests)', () => {
  it('should batch several rerenders of one FC element (effect)', async () => {
    const renderFn = vi.fn();

    const totalRoot = createElement(function App() {
      const rerender = useRerender();

      renderFn();

      useEffect(() => {
        rerender();
        rerender();
        rerender();
        rerender();
        rerender();
        rerender();
      }, []);

      return createElement('root');
    });

    createRoot(new Element('div') as any).render(totalRoot);

    // First render happens in sync flow when root.render is ongoing.
    expect(renderFn).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    // Second render happens in async flow when asyncRenderLocker flushes.
    expect(renderFn).toHaveBeenCalledTimes(2);
  });

  it('should batch several rerenders of one FC element (delegated event handler)', async () => {
    const renderFn = vi.fn();

    const totalRoot = createElement(function App() {
      const rerender = useRerender();
      const buttonRef = useRef(null);

      renderFn();

      useEffect(() => {
        const nativeEvent = new Event('click');
        Object.defineProperty(nativeEvent, 'target', { value: buttonRef.current, writable: false });
        dispatchDelegatedEvent(nativeEvent);
      }, []);

      return createElement('button', {
        onClick: () => {
          rerender();
          rerender();
          rerender();
          rerender();
          rerender();
          rerender();
        },
        ref: buttonRef,
      });
    });

    createRoot(new Element('div') as any).render(totalRoot);

    // First render happens in sync flow when root.render is ongoing.
    expect(renderFn).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    // Second render happens in async flow when asyncRenderLocker flushes.
    expect(renderFn).toHaveBeenCalledTimes(2);
  });

  it('should batch several layers rerenders of one FC element', async () => {
    const innerElementRerenderFn = vi.fn();
    const rootElementRerenderFn = vi.fn();

    function Inner(props: { rerenderParent: () => void; index: number }) {
      const rerender = useRerender();

      innerElementRerenderFn(props.index);

      useEffect(() => {
        props.rerenderParent();
        props.rerenderParent();
        props.rerenderParent();
        rerender();
        rerender();
        rerender();
      }, []);

      return 'TEXT';
    }

    function App() {
      const countRef = useRef(0);
      const rerender = useRerender();

      rootElementRerenderFn();

      return createElement(
        'button',
        null,
        createElement(Inner, {
          rerenderParent: rerender,
          index: countRef.current++,
        })
      );
    }

    createRoot(new Element('div') as any).render(createElement(App));

    await Promise.resolve();

    expect(innerElementRerenderFn).toHaveBeenCalledTimes(3);
    expect(innerElementRerenderFn).toHaveBeenNthCalledWith(1, 0);
    expect(innerElementRerenderFn).toHaveBeenNthCalledWith(2, 1);
    expect(innerElementRerenderFn).toHaveBeenNthCalledWith(3, 1);
    expect(rootElementRerenderFn).toHaveBeenCalledTimes(2);
  });
});
