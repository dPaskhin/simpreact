import { createUseEffect, createUseState } from '@simpreact/hooks';
import { createElement, createRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPortal } from '../../main/core/portal.js';
import { domAdapter } from '../../main/dom/index.js';
import { createHydrateRoot, createRenderer } from '../../main/dom/render.js';
import { renderToString } from '../../main/ssr/renderToString.js';
import { createSsrRenderRuntime } from '../../main/ssr/runtime.js';

const flushMicrotasks = () => new Promise<void>(r => setTimeout(r, 0));

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createHydrateRoot', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('adopts existing DOM nodes instead of recreating them', () => {
    createRenderer(makeRuntime())(createElement('div', null, createElement('span', null, 'hello')), container);
    const div = container.querySelector('div');
    const span = container.querySelector('span');

    createHydrateRoot(makeRuntime())(container).render(
      createElement('div', null, createElement('span', null, 'hello'))
    );

    expect(container.querySelector('div')).toBe(div);
    expect(container.querySelector('span')).toBe(span);
    expect(container.childNodes.length).toBe(1);
  });

  it('fires useEffect ("mounted") on hydration, unlike SSR', () => {
    container.innerHTML = '<span>0</span>';

    const hydrateRuntime = makeRuntime();
    const useEffect = createUseEffect(hydrateRuntime);
    const effect = vi.fn();

    const App = () => {
      useEffect(effect, []);
      return createElement('span', null, '0');
    };

    createHydrateRoot(hydrateRuntime)(container).render(createElement(App, {}));

    expect(effect).toHaveBeenCalledOnce();
  });

  it('applies an object ref to the adopted node', () => {
    createRenderer(makeRuntime())(createElement('span', null, 'x'), container);
    const existingSpan = container.querySelector('span');

    const ref: { current: unknown } = { current: null };
    createHydrateRoot(makeRuntime())(container).render(createElement('span', { ref }, 'x'));

    expect(ref.current).toBe(existingSpan);
  });

  it('applies a callback ref with the adopted node', () => {
    createRenderer(makeRuntime())(createElement('span', null, 'x'), container);
    const existingSpan = container.querySelector('span');

    const refCallback = vi.fn();
    createHydrateRoot(makeRuntime())(container).render(createElement('span', { ref: refCallback }, 'x'));

    expect(refCallback).toHaveBeenCalledWith(existingSpan);
  });

  it('recovers from a mismatched tree without throwing, producing correct final DOM', () => {
    container.innerHTML = '<div><span>only child</span></div>';

    expect(() => {
      createHydrateRoot(makeRuntime())(container).render(
        createElement('div', null, createElement('p', null, 'first'), createElement('span', null, 'second'))
      );
    }).not.toThrow();

    const div = container.querySelector('div')!;
    expect(div.children.length).toBe(2);
    expect(div.children[0]!.tagName.toLowerCase()).toBe('p');
    expect(div.children[0]!.textContent).toBe('first');
    expect(div.children[1]!.tagName.toLowerCase()).toBe('span');
    expect(div.children[1]!.textContent).toBe('second');
  });

  it('subsequent renders on a hydrated root behave like normal patches', async () => {
    container.innerHTML = '<span>0</span>';

    const hydrateRuntime = makeRuntime();
    const useState = createUseState(hydrateRuntime);
    let setCount!: (updater: (n: number) => number) => void;

    const Counter = () => {
      const [count, setter] = useState(0);
      setCount = setter;
      return createElement('span', null, String(count));
    };

    createHydrateRoot(hydrateRuntime)(container).render(createElement(Counter, {}));

    const span = container.querySelector('span');
    setCount(c => c + 1);
    await flushMicrotasks();

    expect(container.querySelector('span')).toBe(span);
    expect(span!.textContent).toBe('1');
  });

  it('does not adopt pre-existing unrelated content inside a portal target container', () => {
    const portalTarget = document.createElement('div');
    portalTarget.innerHTML = '<span>unrelated</span>';
    document.body.appendChild(portalTarget);
    container.innerHTML = '<div></div>';

    const App = () =>
      createElement('div', null, createPortal(createElement('p', null, 'portal content'), portalTarget));

    createHydrateRoot(makeRuntime())(container).render(createElement(App, {}));

    expect(portalTarget.querySelector('span')!.textContent).toBe('unrelated');
    expect(portalTarget.querySelector('p')!.textContent).toBe('portal content');

    portalTarget.remove();
  });

  it('hydrates real renderToString() output end-to-end', () => {
    const App = () => createElement('div', null, createElement('span', { className: 'label' }, 'server rendered'));

    const html = renderToString(createElement(App, {}), { renderRuntime: createSsrRenderRuntime() });
    container.innerHTML = html;
    const existingSpan = container.querySelector('span');

    createHydrateRoot(makeRuntime())(container).render(createElement(App, {}));

    expect(container.querySelector('span')).toBe(existingSpan);
    expect(container.innerHTML).toBe(html);
  });
});
