import { createCreateRoot } from '@simpreact/dom';
import { createUseEffect, createUseRef, createUseRerender } from '@simpreact/hooks';
import { createElement, type SimpRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { describe, expect, it, vi } from 'vitest';
import { dispatchDelegatedEvent } from '../main/dom/events.js';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  elementToHostMap: new Map(),
  renderStack: [],
};

const createRoot = createCreateRoot(renderRuntime);
const useEffect = createUseEffect(renderRuntime);
const useRef = createUseRef(renderRuntime);
const useRerender = createUseRerender(renderRuntime);

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

    createRoot(document.createElement('div')).render(totalRoot);

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
        Object.defineProperty(nativeEvent, 'target', {
          value: buttonRef.current,
          writable: false,
        });
        dispatchDelegatedEvent(nativeEvent, renderRuntime);
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

    createRoot(document.createElement('div')).render(totalRoot);

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

    createRoot(document.createElement('div')).render(createElement(App));

    await Promise.resolve();

    expect(innerElementRerenderFn).toHaveBeenCalledTimes(2);
    expect(innerElementRerenderFn).toHaveBeenNthCalledWith(1, 0);
    expect(innerElementRerenderFn).toHaveBeenNthCalledWith(2, 1);
    expect(rootElementRerenderFn).toHaveBeenCalledTimes(2);
  });

  it('should flush sync rerenders when the scoped callback throws', async () => {
    const renderFn = vi.fn();
    let rerender: () => void;

    function App() {
      rerender = useRerender();
      renderFn();

      return createElement('root');
    }

    createRoot(document.createElement('div')).render(createElement(App));

    expect(renderFn).toHaveBeenCalledTimes(1);
    expect(() =>
      withSyncRerender(renderRuntime, () => {
        rerender();
        throw new Error('handler failed');
      })
    ).toThrow('handler failed');
    expect(renderFn).toHaveBeenCalledTimes(2);

    rerender!();
    await Promise.resolve();

    expect(renderFn).toHaveBeenCalledTimes(3);
  });

  it('should flush nested sync rerenders only after the outer scope exits', () => {
    const renderFn = vi.fn();
    let rerender: () => void;

    function App() {
      rerender = useRerender();
      renderFn();

      return createElement('root');
    }

    createRoot(document.createElement('div')).render(createElement(App));

    expect(renderFn).toHaveBeenCalledTimes(1);
    withSyncRerender(renderRuntime, () => {
      rerender();

      withSyncRerender(renderRuntime, () => {
        rerender();
        rerender();
      });

      expect(renderFn).toHaveBeenCalledTimes(1);
    });

    expect(renderFn).toHaveBeenCalledTimes(2);
  });

  it('should keep sync rerender scopes isolated by runtime', async () => {
    const secondRenderRuntime: SimpRenderRuntime = {
      hostAdapter: testHostAdapter,
      renderer(type, element) {
        return type(element.props || emptyObject);
      },
      elementToHostMap: new Map(),
      renderStack: [],
    };
    const secondCreateRoot = createCreateRoot(secondRenderRuntime);
    const secondUseRerender = createUseRerender(secondRenderRuntime);

    const firstRenderFn = vi.fn();
    const secondRenderFn = vi.fn();
    let firstRerender: () => void;
    let secondRerender: () => void;

    function FirstApp() {
      firstRerender = useRerender();
      firstRenderFn();

      return createElement('root');
    }

    function SecondApp() {
      secondRerender = secondUseRerender();
      secondRenderFn();

      return createElement('root');
    }

    createRoot(document.createElement('div')).render(createElement(FirstApp));
    secondCreateRoot(document.createElement('div')).render(createElement(SecondApp));

    expect(firstRenderFn).toHaveBeenCalledTimes(1);
    expect(secondRenderFn).toHaveBeenCalledTimes(1);

    withSyncRerender(renderRuntime, () => {
      firstRerender();
      secondRerender();
    });

    expect(firstRenderFn).toHaveBeenCalledTimes(2);
    expect(secondRenderFn).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    expect(firstRenderFn).toHaveBeenCalledTimes(2);
    expect(secondRenderFn).toHaveBeenCalledTimes(2);
  });
});
