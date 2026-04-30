import { component, componentRenderer } from '@simpreact/component';
import { createCreateRoot } from '@simpreact/dom';
import { createElement, type SimpRenderRuntime } from '@simpreact/internal';
import { describe, expect, it, vi } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

function createTestRuntime(): SimpRenderRuntime {
  return {
    hostAdapter: testHostAdapter,
    renderer(type, element, renderRuntime) {
      return componentRenderer(type, element, renderRuntime);
    },
    elementToHostMap: new Map(),
    renderStack: [],
    renderPhase: null,
    currentRenderingFCElement: null,
  };
}

describe('component', () => {
  it('provides render context collections and rerenders when component state changes', async () => {
    const renderRuntime = createTestRuntime();
    const root = createCreateRoot(renderRuntime)(document.createElement('div'));
    const effectFn = vi.fn();
    const renderFn = vi.fn();

    const App = component((_props, ctx) => {
      renderFn();

      if (!Object.hasOwn(ctx.state, 'count')) {
        ctx.state.count = 0;
      }

      ctx.effects!.push({
        deps: [],
        effect() {
          effectFn();
          ctx.state.count = 1;
        },
      });

      return createElement('root', null, String(ctx.state.count));
    });

    root.render(createElement(App));

    await Promise.resolve();

    expect(renderFn).toHaveBeenCalledTimes(2);
    expect(effectFn).toHaveBeenCalledTimes(1);
  });

  it('runs component effect cleanup on dependency changes and unmount', () => {
    const renderRuntime = createTestRuntime();
    const root = createCreateRoot(renderRuntime)(document.createElement('div'));
    const effectFn = vi.fn();
    const cleanupFn = vi.fn();

    const App = component((props: { value: string }, ctx) => {
      ctx.effects!.push({
        deps: [props.value],
        effect() {
          effectFn(props.value);
          return () => cleanupFn(props.value);
        },
      });

      return createElement('root', null, props.value);
    });

    root.render(createElement(App, { value: 'A' }));
    root.render(createElement(App, { value: 'A' }));
    root.render(createElement(App, { value: 'B' }));
    root.unmount();

    expect(effectFn).toHaveBeenCalledTimes(2);
    expect(effectFn).toHaveBeenNthCalledWith(1, 'A');
    expect(effectFn).toHaveBeenNthCalledWith(2, 'B');
    expect(cleanupFn).toHaveBeenCalledTimes(2);
    expect(cleanupFn).toHaveBeenNthCalledWith(1, 'A');
    expect(cleanupFn).toHaveBeenNthCalledWith(2, 'B');
  });

  it('handles descendant render errors with component catchers', () => {
    const renderRuntime = createTestRuntime();
    const root = createCreateRoot(renderRuntime)(document.createElement('div'));
    const catcher = vi.fn();
    const error = new Error('boom');

    const Bad = () => {
      throw error;
    };

    const Boundary = component((_props, ctx) => {
      ctx.catchers!.push(catcher);
      return createElement(Bad);
    });

    expect(() => root.render(createElement(Boundary))).not.toThrow();
    expect(catcher).toHaveBeenCalledTimes(1);
    expect(catcher).toHaveBeenCalledWith(error);
  });
});
