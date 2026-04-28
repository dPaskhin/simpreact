import { createCreateContext } from '@simpreact/context';
import { createRenderer, domAdapter } from '@simpreact/dom';
import { createUseState } from '@simpreact/hooks';
import { createElement, memo, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Context.Consumer', () => {
  let renderRuntime: SimpRenderRuntime;
  let createContext: ReturnType<typeof createCreateContext>;
  let render: ReturnType<typeof createRenderer>;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    document.body.innerHTML = '';
    // TODO: remove this hack when the render runtime has the map of elements to their host references.
    (document.body as any).__SIMP_ELEMENT__ = undefined;
    renderRuntime = {
      hostAdapter: domAdapter,
      renderer(type, element) {
        return type(element.props || emptyObject);
      },
      renderStack: [],
      elementToHostMap: new Map(),
    };

    createContext = createCreateContext(renderRuntime);
    render = createRenderer(renderRuntime);
    useState = createUseState(renderRuntime);
  });

  it('uses the default value when there is no Provider above', () => {
    const Ctx = createContext('DEFAULT');

    render(
      createElement(Ctx.Consumer, { children: (value: string) => createElement('div', { 'data-testid': 'v' }, value) }),
      document.body
    );

    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('DEFAULT');
  });

  it('updates through a memoized component between Provider and Consumer when Provider rerenders', async () => {
    const Ctx = createContext('DEFAULT');

    const consumerRenderSpy = vi.fn();
    const memoBridgeRenderSpy = vi.fn();

    function ConsumerLeaf() {
      return createElement(Ctx.Consumer, {
        children: (value: string) => {
          consumerRenderSpy(value);
          return createElement('div', { 'data-testid': 'v' }, value);
        },
      });
    }

    const MemoBridge = memo(function MemoBridge() {
      memoBridgeRenderSpy();
      return createElement(ConsumerLeaf);
    });

    function App() {
      const [value, setValue] = useState('A');

      return createElement('div', null, [
        createElement(
          'button',
          {
            onClick: () => {
              setValue(v => (v === 'A' ? 'B' : 'A'));
            },
            'data-testid': 'toggle',
          },
          'toggle'
        ),
        createElement(Ctx.Provider, { value }, createElement(MemoBridge)),
      ]);
    }

    try {
      render(createElement(App), document.body);
    } catch (e) {
      console.error('jerer', e);
    }

    // initial
    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('A');
    expect(consumerRenderSpy).toHaveBeenCalledTimes(1);
    expect(consumerRenderSpy).toHaveBeenLastCalledWith('A');
    expect(memoBridgeRenderSpy).toHaveBeenCalledTimes(1);

    // Provider rerenders with a NEW value -> Consumer must update even though MemoBridge is memoized
    const btn = document.body.querySelector('[data-testid="toggle"]') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await sleep(0);

    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('B');
    expect(consumerRenderSpy).toHaveBeenCalledTimes(2);
    expect(consumerRenderSpy).toHaveBeenLastCalledWith('B');

    // MemoBridge should NOT rerender due to memo (context update should bypass it)
    expect(memoBridgeRenderSpy).toHaveBeenCalledTimes(1);
  });

  it('renders Consumer with Provider value (usual Provider->Consumer usage)', () => {
    const Ctx = createContext('DEFAULT');
    const consumerRenderSpy = vi.fn();

    function App() {
      return createElement(
        Ctx.Provider,
        { value: 'PROVIDED' },
        createElement(Ctx.Consumer, {
          children: (value: string) => {
            consumerRenderSpy(value);
            return createElement('div', { 'data-testid': 'v' }, value);
          },
        })
      );
    }

    render(createElement(App), document.body);

    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('PROVIDED');
    expect(consumerRenderSpy).toHaveBeenCalledTimes(1);
    expect(consumerRenderSpy).toHaveBeenLastCalledWith('PROVIDED');
  });

  it('updates Consumer when Provider value changes (usual Provider->Consumer update)', async () => {
    const Ctx = createContext('DEFAULT');
    const consumerRenderSpy = vi.fn();

    function App() {
      const [value, setValue] = useState('A');

      return createElement('div', null, [
        createElement(
          'button',
          {
            'data-testid': 'toggle',
            onClick: () => {
              setValue(v => (v === 'A' ? 'B' : 'A'));
            },
          },
          'toggle'
        ),
        createElement(
          Ctx.Provider,
          { value },
          createElement(Ctx.Consumer, {
            children: (v: string) => {
              consumerRenderSpy(v);
              return createElement('div', { 'data-testid': 'v' }, v);
            },
          })
        ),
      ]);
    }

    render(createElement(App), document.body);

    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('A');
    expect(consumerRenderSpy).toHaveBeenCalledTimes(1);
    expect(consumerRenderSpy).toHaveBeenLastCalledWith('A');

    const btn = document.body.querySelector('[data-testid="toggle"]') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await sleep(0);

    expect(document.body.querySelector('[data-testid="v"]')!.textContent).toBe('B');
    expect(consumerRenderSpy).toHaveBeenCalledTimes(2);
    expect(consumerRenderSpy).toHaveBeenLastCalledWith('B');
  });
});
