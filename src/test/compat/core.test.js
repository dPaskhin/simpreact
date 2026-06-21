import { withSyncRerender } from '@simpreact/internal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Children,
  Component,
  cloneElement,
  createElement,
  createPortal,
  Fragment,
  flushSync,
  forwardRef,
  isValidElement,
  lazy,
  REF_SYMBOL,
  StrictMode,
  Suspense,
} from '../../main/compat/core.js';
import { render } from '../../main/compat/dom.js';
import { useState } from '../../main/compat/hooks.js';
import { renderRuntime } from '../../main/compat/index.js';

const flushMicrotasks = () => new Promise(r => setTimeout(r, 0));

describe('isValidElement', () => {
  it('returns true for a createElement result', () => {
    expect(isValidElement(createElement('div'))).toBe(true);
  });

  it('returns false for a plain string', () => {
    expect(isValidElement('hello')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidElement(null)).toBe(false);
  });

  it('returns false for a plain object without flag', () => {
    expect(isValidElement({ type: 'div', props: {} })).toBe(false);
  });

  it('returns true for a Fragment element', () => {
    expect(isValidElement(createElement(Fragment))).toBe(true);
  });
});

describe('Children', () => {
  describe('toArray', () => {
    it('returns empty array for null', () => {
      expect(Children.toArray(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(Children.toArray(undefined)).toEqual([]);
    });

    it('returns empty array for true', () => {
      expect(Children.toArray(true)).toEqual([]);
    });

    it('returns empty array for false', () => {
      expect(Children.toArray(false)).toEqual([]);
    });

    it('flattens a nested array', () => {
      const a = createElement('span');
      const b = createElement('div');
      expect(Children.toArray([[a], [b]])).toEqual([a, b]);
    });

    it('wraps a single element in an array', () => {
      const el = createElement('p');
      expect(Children.toArray(el)).toEqual([el]);
    });

    it('preserves strings and numbers', () => {
      expect(Children.toArray(['text', 42])).toEqual(['text', 42]);
    });

    it('filters out null and boolean from mixed arrays', () => {
      const el = createElement('div');
      expect(Children.toArray([null, true, el, false, undefined])).toEqual([el]);
    });
  });

  describe('map', () => {
    it('maps over children applying the function', () => {
      const result = Children.map(['a', 'b', 'c'], c => `${c}!`);
      expect(result).toEqual(['a!', 'b!', 'c!']);
    });
  });

  describe('forEach', () => {
    it('iterates over children without returning a value', () => {
      const seen = [];
      const result = Children.forEach(['x', 'y'], c => seen.push(c));
      expect(seen).toEqual(['x', 'y']);
      expect(result).toBeUndefined();
    });
  });

  describe('count', () => {
    it('counts the number of children', () => {
      expect(Children.count([createElement('a'), createElement('b')])).toBe(2);
    });

    it('returns 0 for null', () => {
      expect(Children.count(null)).toBe(0);
    });
  });

  describe('only', () => {
    it('returns the single child element', () => {
      const el = createElement('div');
      expect(Children.only(el)).toBe(el);
    });

    it('throws when there are multiple children', () => {
      expect(() => Children.only([createElement('a'), createElement('b')])).toThrow(
        'Children.only expected a single SimpElement child.'
      );
    });

    it('throws when the child is not a valid element', () => {
      expect(() => Children.only('text')).toThrow('Children.only expected a single SimpElement child.');
    });
  });
});

describe('cloneElement', () => {
  it('throws when argument is not a valid element', () => {
    expect(() => cloneElement('not-an-element', {})).toThrow('cloneElement: expected a SimpElement');
  });

  it('throws when argument is a portal', () => {
    const portal = createPortal(createElement('div'), document.createElement('div'));
    expect(() => cloneElement(portal, {})).toThrow('cloneElement: the argument must be a SimpElement');
  });

  it('merges new props over existing element props', () => {
    const el = createElement('div', { id: 'old', className: 'x' });
    const cloned = cloneElement(el, { id: 'new' });
    expect(cloned.props).toMatchObject({ id: 'new', className: 'x' });
  });

  it('uses varargs children when passed as extra arguments', () => {
    const el = createElement('div', null, createElement('span'));
    const child = createElement('p');
    const cloned = cloneElement(el, {}, child);
    expect(cloned.children).toBeDefined();
  });

  it('falls back to element.children when no children provided and props.children is undefined', () => {
    const inner = createElement('span', null, 'hello');
    const el = createElement('div', null, inner);
    const cloned = cloneElement(el, { id: 'test' });
    expect(cloned.children).toBeDefined();
  });

  it('respects falsy props.children (empty string) instead of falling back to element.children', () => {
    const el = createElement('div', null, createElement('span', null, 'original'));
    const cloned = cloneElement(el, { children: '' });
    // Empty string is a valid children value; should NOT fall back to element.children
    expect(cloned.children).toBeNull();
  });

  it('clones a Fragment element', () => {
    const el = createElement(Fragment, null, createElement('span'));
    const cloned = cloneElement(el, {});
    expect(isValidElement(cloned)).toBe(true);
  });
});

describe('StrictMode', () => {
  it('returns its children prop unchanged', () => {
    const child = createElement('div');
    expect(StrictMode({ children: child })).toBe(child);
  });
});

describe('flushSync', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('calls the callback synchronously and returns its result', () => {
    const result = flushSync(() => 42);
    expect(result).toBe(42);
  });

  it('flushes pending state updates synchronously so the DOM reflects the new state before returning', () => {
    let setState;
    const Comp = () => {
      const [count, set] = useState(0);
      setState = set;
      return createElement('span', null, String(count));
    };
    render(createElement(Comp, {}), container);
    expect(container.textContent).toBe('0');

    flushSync(() => setState(1));
    expect(container.textContent).toBe('1');
  });
});

describe('createElement (compat wrapper)', () => {
  it('strips string ref from FC props and stores under REF_SYMBOL', () => {
    const myRef = { current: null };
    const FC = () => createElement('div');
    const el = createElement(FC, { ref: myRef, label: 'hi' });
    expect(el.props.ref).toBeUndefined();
    expect(el.props[REF_SYMBOL]).toBe(myRef);
    expect(el.props.label).toBe('hi');
  });

  it('does not strip ref from HOST element props', () => {
    const myRef = { current: null };
    const el = createElement('div', { ref: myRef, id: 'x' });
    expect(el.props.ref).toBe(myRef);
  });

  it('omits REF_SYMBOL when ref is null', () => {
    const FC = () => createElement('div');
    const el = createElement(FC, { ref: null, label: 'hi' });
    expect(REF_SYMBOL in (el.props || {})).toBe(false);
  });
});

describe('forwardRef', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('passes the ref as the second argument to the wrapped component', () => {
    const receivedRefs = [];
    const Inner = (props, ref) => {
      receivedRefs.push(ref);
      return createElement('div');
    };
    const Forwarded = forwardRef(Inner);
    const myRef = { current: null };
    render(createElement(Forwarded, { ref: myRef, label: 'hi' }), container);
    expect(receivedRefs[0]).toBe(myRef);
  });

  it('strips ref from the props the inner component receives', () => {
    const receivedProps = [];
    const Inner = (props, _ref) => {
      receivedProps.push(props);
      return createElement('div');
    };
    const Forwarded = forwardRef(Inner);
    const myRef = { current: null };
    render(createElement(Forwarded, { ref: myRef, name: 'test' }), container);
    expect('ref' in receivedProps[0]).toBe(false);
    expect(receivedProps[0].name).toBe('test');
  });

  it('passes null when no ref is provided', () => {
    const receivedRefs = [];
    const Inner = (_props, ref) => {
      receivedRefs.push(ref);
      return createElement('div');
    };
    const Forwarded = forwardRef(Inner);
    render(createElement(Forwarded, { label: 'hi' }), container);
    expect(receivedRefs[0]).toBeNull();
  });

  it('works end-to-end: ref is attached to the inner HOST element', () => {
    const ref = { current: null };
    const Input = forwardRef((_props, ref) => createElement('input', { ref }));
    render(createElement(Input, { ref }), container);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('can be instantiated and initialises props and state', () => {
    const inst = new Component({ name: 'test' });
    expect(inst.props).toEqual({ name: 'test' });
    expect(inst.state).toEqual({});
  });

  it('render() throws when not overridden', () => {
    const inst = new Component({});
    expect(() => inst.render()).toThrow('Component.render() must be implemented');
  });

  it('has isReactComponent on the prototype (used for duck-type detection)', () => {
    expect(Component.prototype.isReactComponent).toBe(true);
  });

  it('subclass can override render() and mount successfully', () => {
    class Greeting extends Component {
      render() {
        return createElement('span', null, this.props.name);
      }
    }
    render(createElement(Greeting, { name: 'World' }), container);
    expect(container.textContent).toBe('World');
  });

  it('setState updates state and triggers a re-render', () => {
    let capturedInst;
    class Counter extends Component {
      constructor(props) {
        super(props);
        this.state = { count: 0 };
        capturedInst = this;
      }
      render() {
        return createElement('span', null, String(this.state.count));
      }
    }
    render(createElement(Counter, {}), container);
    expect(container.textContent).toBe('0');

    withSyncRerender(renderRuntime, () => capturedInst.setState({ count: 5 }));
    expect(container.textContent).toBe('5');
  });

  it('setState with an updater function receives previous state', () => {
    let capturedInst;
    class Counter extends Component {
      constructor(props) {
        super(props);
        this.state = { count: 10 };
        capturedInst = this;
      }
      render() {
        return createElement('span', null, String(this.state.count));
      }
    }
    render(createElement(Counter, {}), container);

    withSyncRerender(renderRuntime, () => capturedInst.setState(prev => ({ count: prev.count + 3 })));
    expect(container.textContent).toBe('13');
  });

  it('forceUpdate triggers a re-render without changing state', () => {
    let capturedInst;
    let renderCount = 0;
    class Watched extends Component {
      constructor(props) {
        super(props);
        capturedInst = this;
      }
      render() {
        renderCount++;
        return createElement('div');
      }
    }
    render(createElement(Watched, {}), container);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => capturedInst.forceUpdate());
    expect(renderCount).toBe(2);
  });

  it('re-renders receive updated props', () => {
    class ShowProp extends Component {
      render() {
        return createElement('span', null, this.props.value);
      }
    }
    render(createElement(ShowProp, { value: 'a' }), container);
    expect(container.textContent).toBe('a');
    render(createElement(ShowProp, { value: 'b' }), container);
    expect(container.textContent).toBe('b');
  });
});

describe('lazy', () => {
  it('throws the pending promise on first call', () => {
    const factory = vi.fn(() => new Promise(() => {}));
    const LazyComponent = lazy(factory);

    let thrown;
    try {
      LazyComponent({});
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Promise);
  });

  it('factory is called exactly once across multiple pending calls', () => {
    const factory = vi.fn(() => new Promise(() => {}));
    const LazyComponent = lazy(factory);

    try {
      LazyComponent({});
    } catch {
      /* pending */
    }
    try {
      LazyComponent({});
    } catch {
      /* pending */
    }
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('renders the resolved component after the factory promise resolves', async () => {
    const MockComp = props => createElement('span', null, props.label ?? 'loaded');
    const factory = () => Promise.resolve({ default: MockComp });
    const LazyComponent = lazy(factory);

    let thrownPromise;
    try {
      LazyComponent({});
    } catch (p) {
      thrownPromise = p;
    }
    await thrownPromise;

    const result = LazyComponent({ label: 'hi' });
    expect(isValidElement(result)).toBe(true);
    expect(result.type).toBe(MockComp);
  });

  it('throws the rejection reason after the factory promise rejects', async () => {
    const reason = new Error('load failed');
    const factory = () => Promise.reject(reason);
    const LazyComponent = lazy(factory);

    let thrownPromise;
    try {
      LazyComponent({});
    } catch (p) {
      thrownPromise = p;
    }
    await thrownPromise;

    expect(() => LazyComponent({})).toThrow(reason);
  });
});

describe('Suspense', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('renders children when not suspended', () => {
    render(
      createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement('div', null, 'content')
      ),
      container
    );
    expect(container.textContent).toBe('content');
  });

  it('renders fallback when a child throws a Promise, then children after resolution', async () => {
    let resolvePromise;
    const suspensePromise = new Promise(r => {
      resolvePromise = r;
    });
    let shouldThrow = true;
    const Child = () => {
      if (shouldThrow) throw suspensePromise;
      return createElement('span', null, 'loaded');
    };

    render(
      createElement(Suspense, { fallback: createElement('span', null, 'loading') }, createElement(Child, {})),
      container
    );

    await flushMicrotasks();
    expect(container.textContent).toBe('loading');

    shouldThrow = false;
    resolvePromise();
    await flushMicrotasks();
    expect(container.textContent).toBe('loaded');
  });

  it('tracks multiple concurrent promises independently', async () => {
    let resolveA, resolveB;
    const promiseA = new Promise(r => {
      resolveA = r;
    });
    const promiseB = new Promise(r => {
      resolveB = r;
    });

    let throwA = true;
    let throwB = true;

    const ChildA = () => {
      if (throwA) throw promiseA;
      return createElement('span', null, 'A');
    };
    const ChildB = () => {
      if (throwB) throw promiseB;
      return createElement('span', null, 'B');
    };

    render(
      createElement(
        Suspense,
        { fallback: createElement('span', null, 'loading') },
        createElement('div', null, createElement(ChildA, {}), createElement(ChildB, {}))
      ),
      container
    );

    await flushMicrotasks();
    expect(container.textContent).toBe('loading');

    // Resolve A first — B is still pending, must stay on fallback
    throwA = false;
    resolveA();
    await flushMicrotasks();
    expect(container.textContent).toBe('loading');

    // Resolve B — both done, show children
    throwB = false;
    resolveB();
    await flushMicrotasks();
    expect(container.textContent).toBe('AB');
  });
});
