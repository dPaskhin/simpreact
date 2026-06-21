import { withSyncRerender } from '@simpreact/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from '../../main/compat/core.js';
import { render } from '../../main/compat/dom.js';
import { renderRuntime } from '../../main/compat/index.js';

describe('compat renderRuntime renderer', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('calls a plain function component with its props', () => {
    const received = [];
    const FC = props => {
      received.push(props);
      return createElement('div', null, props.label);
    };
    render(createElement(FC, { label: 'hello' }), container);
    expect(received[0]).toMatchObject({ label: 'hello' });
    expect(container.textContent).toBe('hello');
  });

  it('instantiates a class with isReactComponent=true and calls render()', () => {
    class MyComponent {
      constructor(props) {
        this.props = props;
      }
      render() {
        return createElement('span', null, this.props.text);
      }
    }
    MyComponent.prototype.isReactComponent = true;
    render(createElement(MyComponent, { text: 'class-component' }), container);
    expect(container.textContent).toBe('class-component');
  });

  it('instantiates a class with a render() method (no isReactComponent) and calls render()', () => {
    class LegacyComponent {
      constructor(props) {
        this.props = props;
      }
      render() {
        return createElement('p', null, this.props.value);
      }
    }
    render(createElement(LegacyComponent, { value: 'legacy' }), container);
    expect(container.textContent).toBe('legacy');
  });

  it('persists the instance across re-renders (state is not reset)', () => {
    let capturedInst;
    class Stateful {
      constructor(props) {
        this.props = props;
        this.state = { x: 1 };
        capturedInst = this;
      }
      render() {
        return createElement('span', null, String(this.state.x));
      }
    }
    Stateful.prototype.isReactComponent = true;

    render(createElement(Stateful, {}), container);
    expect(container.textContent).toBe('1');

    // Mutate state directly and trigger a re-render; the same instance must be reused
    capturedInst.state = { x: 99 };
    withSyncRerender(renderRuntime, () => capturedInst.forceUpdate());
    expect(container.textContent).toBe('99');
  });

  it('injects setState that merges state and triggers a re-render', () => {
    let capturedInst;
    class Counter {
      constructor(props) {
        this.props = props;
        this.state = { count: 0 };
        capturedInst = this;
      }
      render() {
        return createElement('span', null, String(this.state.count));
      }
    }
    Counter.prototype.isReactComponent = true;

    render(createElement(Counter, {}), container);
    expect(container.textContent).toBe('0');

    withSyncRerender(renderRuntime, () => capturedInst.setState({ count: 7 }));
    expect(container.textContent).toBe('7');
  });

  it('setState with an updater function receives previous state', () => {
    let capturedInst;
    class Counter {
      constructor(props) {
        this.props = props;
        this.state = { n: 10 };
        capturedInst = this;
      }
      render() {
        return createElement('span', null, String(this.state.n));
      }
    }
    Counter.prototype.isReactComponent = true;

    render(createElement(Counter, {}), container);
    withSyncRerender(renderRuntime, () => capturedInst.setState(prev => ({ n: prev.n * 2 })));
    expect(container.textContent).toBe('20');
  });
});
