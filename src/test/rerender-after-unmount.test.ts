import { createCreateRoot } from '@simpreact/dom';
import { createUseEffect, createUseState } from '@simpreact/hooks';

import { createElement, type SimpRenderRuntime } from '@simpreact/internal';
import { emptyObject } from '@simpreact/shared';
import { describe, expect, it, vi } from 'vitest';
import { testHostAdapter } from './test-host-adapter.js';

const renderRuntime: SimpRenderRuntime = {
  hostAdapter: testHostAdapter,
  renderer(type, element) {
    return type(element.props || emptyObject);
  },
};

const createRoot = createCreateRoot(renderRuntime);
const useEffect = createUseEffect(renderRuntime);
const useState = createUseState(renderRuntime);

function BadComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      setCount(c => c + 1);
    }, 0);

    // no cleanup → will cause update after unmount
  }, []);

  return createElement('div', null, `Count: ${count}`);
}

describe('BadComponent', () => {
  it('tries to update state after unmount', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const root = createRoot(document.createElement('div'));
    root.render(createElement(BadComponent));
    root.unmount(); // unmount immediately

    // wait for timer to trigger
    await new Promise(resolve => setTimeout(resolve, 1));

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('The component is unmounted.'));

    consoleErrorSpy.mockRestore();
  });
});
