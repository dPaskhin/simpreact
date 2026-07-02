import { createExecutorFactory } from '@simpreact/executor';
import { createElement, mount, unmount, withSyncRerender } from '@simpreact/internal';
import { ExecutorManager } from 'react-executor/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestRenderRuntime } from './test-host-adapter.js';

const renderRuntime = createTestRenderRuntime();

let parent: Element;
let manager: ExecutorManager;

beforeEach(() => {
  parent = document.createElement('div');
  renderRuntime.renderStack.length = 0;
  manager = new ExecutorManager();
});

const { withExecutor } = createExecutorFactory(renderRuntime);

function flushAsyncRerenders(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('withExecutor', () => {
  it('returns the same executor that was passed in', () => {
    const exec = manager.getOrCreate<number>('identity');
    const result = withExecutor(exec);
    expect(result).toBe(exec);
  });

  it('returns the executor even with no active render element', () => {
    const exec = manager.getOrCreate<number>('no-element');
    expect(withExecutor(exec)).toBe(exec);
  });
});

describe('withExecutor — state reads', () => {
  it('starts unsettled', () => {
    const exec = manager.getOrCreate<number>('unsettled');
    expect(exec.isSettled).toBe(false);
    expect(exec.isPending).toBe(false);
    expect(exec.value).toBeUndefined();
  });

  it('reflects a resolved value', () => {
    const exec = manager.getOrCreate<number>('resolved');
    exec.resolve(42);
    expect(exec.isFulfilled).toBe(true);
    expect(exec.value).toBe(42);
  });

  it('reflects a rejected reason', () => {
    const exec = manager.getOrCreate<number>('rejected');
    exec.reject(new Error('boom'));
    expect(exec.isRejected).toBe(true);
    expect(exec.reason).toBeInstanceOf(Error);
  });
});

describe('withExecutor — FC subscription', () => {
  it('rerenders a subscribed FC when the executor resolves', () => {
    const exec = manager.getOrCreate<number>('fc-resolve');
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => {
      exec.resolve(7);
    });
    expect(renderCount).toBe(2);
  });

  it('rerenders a subscribed FC when the executor rejects', () => {
    const exec = manager.getOrCreate<number>('fc-reject');
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    withSyncRerender(renderRuntime, () => {
      exec.reject(new Error('fail'));
    });
    expect(renderCount).toBe(2);
  });

  it('rerenders a subscribed FC when the executor is invalidated', () => {
    const exec = manager.getOrCreate<number>('fc-invalidate');
    exec.resolve(1);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    withSyncRerender(renderRuntime, () => {
      exec.invalidate();
    });
    expect(renderCount).toBe(2);
  });

  it('rerenders a subscribed FC when the executor is cleared', () => {
    const exec = manager.getOrCreate<number>('fc-clear');
    exec.resolve(5);
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    withSyncRerender(renderRuntime, () => {
      exec.clear();
    });
    expect(renderCount).toBe(2);
  });

  it('does not rerender on skip events (activated / deactivated)', () => {
    const exec = manager.getOrCreate<number>('fc-skip');
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    // activated / deactivated are skip events; they must not trigger a rerender
    const deactivate = exec.activate();
    deactivate();
    expect(renderCount).toBe(1);
  });

  it('does not rerender an unmounted subscriber', () => {
    const exec = manager.getOrCreate<number>('fc-unmounted');
    let renderCount = 0;

    const Comp = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    unmount(el, renderRuntime);

    withSyncRerender(renderRuntime, () => {
      exec.resolve(1);
    });
    expect(renderCount).toBe(1);
  });

  it('subscribes multiple FCs to the same executor', () => {
    const exec = manager.getOrCreate<number>('fc-multi');
    let countA = 0;
    let countB = 0;

    const CompA = () => {
      countA++;
      withExecutor(exec);
      return null;
    };
    const CompB = () => {
      countB++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(CompA), parent, null, null, null, renderRuntime);
    mount(createElement(CompB), parent, null, null, null, renderRuntime);

    withSyncRerender(renderRuntime, () => {
      exec.resolve(99);
    });

    expect(countA).toBe(2);
    expect(countB).toBe(2);
  });
});

describe('withExecutor — activation', () => {
  it('activates the executor when the first FC subscribes', () => {
    const exec = manager.getOrCreate<number>('activate-first');
    expect(exec.isActive).toBe(false);

    const Comp = () => {
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(exec.isActive).toBe(true);
  });

  it('does not reactivate for additional subscribers', () => {
    const exec = manager.getOrCreate<number>('activate-multi');
    let activations = 0;
    exec.subscribe(event => {
      if (event.type === 'activated') {
        activations++;
      }
    });

    const CompA = () => {
      withExecutor(exec);
      return null;
    };
    const CompB = () => {
      withExecutor(exec);
      return null;
    };

    mount(createElement(CompA), parent, null, null, null, renderRuntime);
    mount(createElement(CompB), parent, null, null, null, renderRuntime);

    expect(activations).toBe(1);
    expect(exec.isActive).toBe(true);
  });

  it('releases the activation as soon as the subscriber unmounts', () => {
    const exec = manager.getOrCreate<number>('activate-eager-release');

    const Comp = () => {
      withExecutor(exec);
      return null;
    };

    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    expect(exec.isActive).toBe(true);

    // No executor event needed — deactivation happens on unmount itself.
    unmount(el, renderRuntime);
    expect(exec.isActive).toBe(false);
  });

  it('stays active while at least one subscriber remains', () => {
    const exec = manager.getOrCreate<number>('activate-partial');

    const CompA = () => {
      withExecutor(exec);
      return null;
    };
    const CompB = () => {
      withExecutor(exec);
      return null;
    };

    const elA = createElement(CompA);
    mount(elA, parent, null, null, null, renderRuntime);
    mount(createElement(CompB), parent, null, null, null, renderRuntime);

    unmount(elA, renderRuntime);
    expect(exec.isActive).toBe(true);
  });

  it('reactivates after a full deactivation cycle', () => {
    const exec = manager.getOrCreate<number>('activate-cycle');

    const Comp = () => {
      withExecutor(exec);
      return null;
    };

    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    unmount(el, renderRuntime);
    expect(exec.isActive).toBe(false);

    mount(createElement(Comp), parent, null, null, null, renderRuntime);
    expect(exec.isActive).toBe(true);
  });

  it('releases the subscription when the component errors during mount', () => {
    const exec = manager.getOrCreate<number>('activate-errored');

    const Comp = () => {
      withExecutor(exec);
      throw new Error('render failed');
    };

    expect(() => {
      mount(createElement(Comp), parent, null, null, null, renderRuntime);
    }).toThrow();

    expect(exec.isActive).toBe(false);
  });
});

describe('withExecutor — detach', () => {
  it('re-subscribes when a detached executor is attached again', () => {
    const exec = manager.getOrCreate<number>('detach-revive');

    const Comp = () => {
      withExecutor(exec);
      return null;
    };

    const el = createElement(Comp);
    mount(el, parent, null, null, null, renderRuntime);
    unmount(el, renderRuntime);

    // Detach force-unsubscribes all executor listeners, including the bridge's.
    expect(manager.detach('detach-revive')).toBe(true);

    let renderCount = 0;
    const Comp2 = () => {
      renderCount++;
      withExecutor(exec);
      return null;
    };

    mount(createElement(Comp2), parent, null, null, null, renderRuntime);
    expect(renderCount).toBe(1);

    withSyncRerender(renderRuntime, () => {
      exec.resolve(42);
    });
    expect(renderCount).toBe(2);
  });
});

describe('withExecutor — multiple runtimes', () => {
  it('rerenders each subscriber through its own runtime', async () => {
    const runtimeB = createTestRenderRuntime();
    const factoryB = createExecutorFactory(runtimeB);
    const exec = manager.getOrCreate<number>('multi-runtime');

    let countA = 0;
    let countB = 0;

    const CompA = () => {
      countA++;
      withExecutor(exec);
      return null;
    };
    const CompB = () => {
      countB++;
      factoryB.withExecutor(exec);
      return null;
    };

    mount(createElement(CompA), parent, null, null, null, renderRuntime);
    mount(createElement(CompB), document.createElement('div'), null, null, null, runtimeB);

    exec.resolve(1);
    await flushAsyncRerenders();

    expect(countA).toBe(2);
    expect(countB).toBe(2);
  });
});

describe('withExecutor — async execute', () => {
  it('fulfills via execute with an async task', async () => {
    const exec = manager.getOrCreate<string>('exec-async');
    await exec.execute(async () => 'hello');
    expect(exec.isFulfilled).toBe(true);
    expect(exec.value).toBe('hello');
  });

  it('reflects pending state after execute is called', async () => {
    const exec = manager.getOrCreate<string>('exec-pending');

    let resolveTask!: (v: string) => void;
    const promise = exec.execute(
      () =>
        new Promise<string>(r => {
          resolveTask = r;
        })
    );

    expect(exec.isPending).toBe(true);
    resolveTask('done');
    await promise;
    expect(exec.isPending).toBe(false);
  });

  it('aborts the previous task when execute is called again', async () => {
    const exec = manager.getOrCreate<string>('exec-abort');
    let firstAborted = false;

    exec.execute(async signal => {
      await new Promise<void>(resolve => {
        signal.addEventListener('abort', () => {
          firstAborted = true;
          resolve();
        });
      });
      return 'first';
    });

    await exec.execute(async () => 'second');
    expect(firstAborted).toBe(true);
    expect(exec.value).toBe('second');
  });
});
