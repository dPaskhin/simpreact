import { createCreateRoot } from '@simpreact/dom';
import { createElement, Fragment, patchKeyedChildren, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

const createRoot = createCreateRoot(renderRuntime);

describe('patchKeyedChildren (integration-ish): moving fragment/component nodes without reference', () => {
  beforeEach(() => {
    // Keep adapter calls clean per test
    (testHostAdapter.insertBefore as any)?.mockClear?.();
    (testHostAdapter.appendChild as any)?.mockClear?.();
    (testHostAdapter.removeChild as any)?.mockClear?.();
  });

  it('moves a keyed Fragment by moving its host children in reverse DOM order', () => {
    const container = document.createElement('div');

    // Current DOM: <div><c/><x/><y/><!--anchor--></div>
    const rootDiv = document.createElement('div');
    container.appendChild(rootDiv);

    const cNode = document.createElement('c');
    const xNode = document.createElement('x');
    const yNode = document.createElement('y');
    const anchor = document.createComment('anchor');

    rootDiv.appendChild(cNode);
    rootDiv.appendChild(xNode);
    rootDiv.appendChild(yNode);
    rootDiv.appendChild(anchor);

    // Build element lists using real createElement API.
    // prevChildren represent the currently mounted children in DOM order: [c, f(x,y)]
    // NOTE: Fragment itself has no reference, but its host children do.
    const prevChildren = [
      Object.assign(createElement('c', { key: 'c' }) as any, { reference: cNode }),
      Object.assign(
        createElement(Fragment, { key: 'f' }, [
          createElement('x', { key: 'x' }),
          createElement('y', { key: 'y' }),
        ]) as any,
        {
          children: [
            Object.assign(createElement('x', { key: 'x' }) as any, { reference: xNode }),
            Object.assign(createElement('y', { key: 'y' }) as any, { reference: yNode }),
          ],
        }
      ),
    ];

    // nextChildren swap Fragment and C: [f(x,y), c]
    const nextChildren = [
      createElement(Fragment, { key: 'f' }, [createElement('x', { key: 'x' }), createElement('y', { key: 'y' })]),
      createElement('c', { key: 'c' }),
    ] as any;

    patchKeyedChildren(
      prevChildren as any,
      nextChildren as any,
      rootDiv as any,
      anchor as any,
      null,
      null,
      renderRuntime
    );

    // The key behavior: moving the Fragment subtree happens by inserting its host children
    // in reverse DOM order: first `y` before `c`, then `x` before `y`.
    expect(testHostAdapter.insertBefore).toHaveBeenCalledWith(rootDiv, yNode, cNode);
    expect(testHostAdapter.insertBefore).toHaveBeenCalledWith(rootDiv, xNode, yNode);

    // The final DOM order must be: x, y, c (before the anchor)
    const tags = Array.from(rootDiv.childNodes)
      .filter(n => n.nodeType === Node.ELEMENT_NODE)
      .map(n => (n as Element).tagName.toLowerCase());

    expect(tags).toEqual(['x', 'y', 'c']);
  });

  it('new moves a keyed Fragment by moving its host children in reverse DOM order', () => {
    const container = document.createElement('div');

    createRoot(container).render(
      createElement(Fragment, { key: 'ROOT_FRAGMENT' }, [
        createElement('c', { key: 'c' }),
        createElement(Fragment, { key: 'f' }, [
          createElement('x', { key: 'x' }),
          createElement('y', { key: 'y' }),
        ]) as any,
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
