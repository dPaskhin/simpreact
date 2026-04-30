import { createCreateRoot } from '@simpreact/dom';
import { createElement, Fragment, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
  renderStack: [],
  elementToHostMap: new Map(),
  renderPhase: null,
  currentRenderingFCElement: null,
};

const createRoot = createCreateRoot(renderRuntime);

describe('patchKeyedChildren (integration-ish): moving fragment/component nodes without reference', () => {
  beforeEach(() => {
    // Keep adapter calls clean per test
    (testHostAdapter.insertOrAppend as any)?.mockClear?.();
    (testHostAdapter.removeChild as any)?.mockClear?.();
  });

  it('moves a keyed Fragment by moving its host children in reverse DOM order', () => {
    const container = document.createElement('div');

    createRoot(container).render(
      createElement(Fragment, { key: 'ROOT_FRAGMENT' }, [
        createElement('c', { key: 'c' }),
        createElement(Fragment, { key: 'f' }, [createElement('x', { key: 'x' }), createElement('y', { key: 'y' })]),
      ])
    );

    (testHostAdapter.createReference as any)?.mockClear?.();

    createRoot(container).render(
      createElement(Fragment, { key: 'ROOT_FRAGMENT' }, [
        createElement(Fragment, { key: 'f' }, [createElement('x', { key: 'x' }), createElement('y', { key: 'y' })]),
        createElement('c', { key: 'c' }),
      ])
    );

    expect(testHostAdapter.createReference).not.toHaveBeenCalled();

    expect(Array.from(container.children).map(n => n.tagName)).toEqual(['X', 'Y', 'C']);
  });
});
