import { describe, expect, it, vi } from 'vitest';
import { Element } from 'flyweight-dom';

import { createElement, provideHostAdapter } from '@simpreact/internal';
import { createRoot } from '@simpreact/dom';
import { useEffect } from '@simpreact/hooks';

import { useState } from './useState.js';
import { testHostAdapter } from './test-host-adapter.js';

provideHostAdapter(testHostAdapter);

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

    const root = createRoot(new Element('div') as any);
    root.render(createElement(BadComponent));
    root.unmount(); // unmount immediately

    // wait for timer to trigger
    await new Promise(resolve => setTimeout(resolve, 1));

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('The component unmounted.'));

    consoleErrorSpy.mockRestore();
  });
});
