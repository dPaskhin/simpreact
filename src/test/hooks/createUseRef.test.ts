import { createElement, createRenderRuntime, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { domAdapter } from '../../main/dom/index.js';
import { createRenderer } from '../../main/dom/render.js';
import { createUseRef, createUseState } from '../../main/hooks/index.js';

function makeRuntime() {
  return createRenderRuntime(domAdapter, (type: any, el: any) => type(el.props || emptyObject));
}

describe('createUseRef', () => {
  let runtime: ReturnType<typeof makeRuntime>;
  let render: ReturnType<typeof createRenderer>;
  let container: HTMLDivElement;
  let useRef: ReturnType<typeof createUseRef>;
  let useState: ReturnType<typeof createUseState>;

  beforeEach(() => {
    runtime = makeRuntime();
    render = createRenderer(runtime);
    useRef = createUseRef(runtime);
    useState = createUseState(runtime);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('returns an object with the given initial value', () => {
    let ref: any;
    const Comp = () => {
      ref = useRef(42);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(ref).toEqual({ current: 42 });
  });

  it('works with undefined initial value', () => {
    let ref: any;
    const Comp = () => {
      ref = useRef(undefined);
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    expect(ref.current).toBeUndefined();
  });

  it('returns the same ref object identity across re-renders', () => {
    const refs: any[] = [];
    let dispatch: any;
    const Comp = () => {
      const [, set] = useState(0);
      dispatch = set;
      refs.push(useRef('initial'));
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    withSyncRerender(runtime, () => dispatch(1));
    expect(refs.length).toBe(2);
    expect(refs[0]).toBe(refs[1]);
  });

  it('mutations to .current persist across re-renders', () => {
    let ref: any;
    let dispatch: any;
    const Comp = () => {
      const [, set] = useState(0);
      dispatch = set;
      ref = useRef('initial');
      return createElement('div');
    };
    render(createElement(Comp, {}), container);
    ref.current = 'mutated';
    withSyncRerender(runtime, () => dispatch(1));
    expect(ref.current).toBe('mutated');
  });
});
