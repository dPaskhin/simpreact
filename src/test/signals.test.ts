import { createElement, createRenderRuntime, mount, withSyncRerender } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { createSignalFactory, effect } from '@simpreact/signals';
import { beforeEach, describe, expect, it } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime = createRenderRuntime(testHostAdapter, (type, element) => {
  return type(element.props || emptyObject);
});

let parent: Element;

beforeEach(() => {
  parent = document.createElement('div');
  renderRuntime.renderStack.length = 0;
});

const { signal, computed } = createSignalFactory(renderRuntime);

describe('createSignal', () => {
  it('returns the initial value', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it('updates the value on assignment', () => {
    const s = signal('a');
    s.value = 'b';
    expect(s.value).toBe('b');
  });

  it('ignores assignment when value is identical', () => {
    const obj = {};
    const s = signal(obj);
    const before = s.value;
    s.value = obj;
    expect(s.value).toBe(before);
  });

  it('rerenders a subscribed FC when the signal changes', () => {
    const s = signal(0);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      s.value;
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => {
      s.value = 1;
    });
    expect(renderCount).toBe(2);
  });

  it('does not rerender when the same value is assigned', () => {
    const s = signal(0);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      s.value;
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => {
      s.value = 0;
    });
    expect(renderCount).toBe(1);
  });

  it('prunes unmounted elements lazily on next assignment', () => {
    const s = signal(0);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      s.value;
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    el.unmounted = true;

    expect(() => {
      s.value = 1;
    }).not.toThrow();
  });
});

describe('createComputed', () => {
  it('derives the initial value', () => {
    const s = signal(3);
    const doubled = computed(() => s.value * 2);
    expect(doubled.value).toBe(6);
  });

  it('updates when a dep signal changes', () => {
    const s = signal(1);
    const doubled = computed(() => s.value * 2);
    s.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('composes multiple dep signals', () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(5);
    a.value = 10;
    expect(sum.value).toBe(13);
    b.value = 7;
    expect(sum.value).toBe(17);
  });

  it('chains computed signals', () => {
    const s = signal(2);
    const doubled = computed(() => s.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    expect(quadrupled.value).toBe(8);
    s.value = 3;
    expect(quadrupled.value).toBe(12);
  });

  it('rerenders a subscribed FC when a computed changes', () => {
    const s = signal(1);
    const doubled = computed(() => s.value * 2);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      doubled.value;
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => {
      s.value = 5;
    });
    expect(renderCount).toBe(2);
  });
});

describe('effect', () => {
  it('runs immediately', () => {
    const s = signal(1);
    let calls = 0;

    const dispose = effect(() => {
      s.value;
      calls++;
    });

    expect(calls).toBe(1);
    dispose();
  });

  it('re-runs when a dep changes', () => {
    const s = signal(0);
    const log: number[] = [];

    const dispose = effect(() => {
      log.push(s.value);
    });

    s.value = 1;
    s.value = 2;
    expect(log).toEqual([0, 1, 2]);
    dispose();
  });

  it('stops re-running after dispose', () => {
    const s = signal(0);
    let calls = 0;

    const dispose = effect(() => {
      s.value;
      calls++;
    });
    dispose();
    s.value = 1;

    expect(calls).toBe(1);
  });

  it('calls cleanup before each re-run', () => {
    const s = signal(0);
    const log: string[] = [];

    const dispose = effect(() => {
      const v = s.value;
      log.push(`run:${v}`);
      return () => log.push(`cleanup:${v}`);
    });

    s.value = 1;
    s.value = 2;
    expect(log).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1', 'run:2']);
    dispose();
  });

  it('calls cleanup on dispose', () => {
    const s = signal(0);
    let cleaned = false;

    const dispose = effect(() => {
      s.value;
      return () => {
        cleaned = true;
      };
    });

    expect(cleaned).toBe(false);
    dispose();
    expect(cleaned).toBe(true);
  });

  it('tracks deps conditionally', () => {
    const toggle = signal(true);
    const a = signal('a');
    const b = signal('b');
    const log: string[] = [];

    const dispose = effect(() => {
      log.push(toggle.value ? a.value : b.value);
    });

    a.value = 'A'; // tracked
    toggle.value = false;
    a.value = 'A2'; // no longer tracked
    b.value = 'B'; // now tracked

    expect(log).toEqual(['a', 'A', 'b', 'B']);
    dispose();
  });
});
