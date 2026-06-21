import { bench, describe } from 'vitest';

import { createElement, mount, withSyncRerender } from '../../../lib/core/internal.js';
import { renderRuntime, useState } from './setup.js';

const parent = {};

// --- rerender FC — no output change ---
let tickA;
let nA = 0;

const Static = () => {
  const [, setTick] = useState(0);
  tickA = setTick;
  return createElement('div', null, createElement('span', null, 'hello'), createElement('span', null, 'world'));
};

mount(createElement(Static), parent, null, null, null, renderRuntime);

// --- rerender FC — text update ---
let setCount;

const Counter = () => {
  const [count, set] = useState(0);
  setCount = set;
  return createElement('span', null, String(count));
};

mount(createElement(Counter), parent, null, null, null, renderRuntime);

// --- rerender FC — 10 HOST children, no change ---
let tickC;
let nC = 0;

const List = () => {
  const [, setTick] = useState(0);
  tickC = setTick;
  return createElement(
    'ul',
    null,
    createElement('li', null, 'a'),
    createElement('li', null, 'b'),
    createElement('li', null, 'c'),
    createElement('li', null, 'd'),
    createElement('li', null, 'e'),
    createElement('li', null, 'f'),
    createElement('li', null, 'g'),
    createElement('li', null, 'h'),
    createElement('li', null, 'i'),
    createElement('li', null, 'j')
  );
};

mount(createElement(List), parent, null, null, null, renderRuntime);

describe('patch', () => {
  bench('rerender FC — no output change', () => {
    withSyncRerender(renderRuntime, () => tickA(++nA));
  });

  bench('rerender FC — text update', () => {
    withSyncRerender(renderRuntime, () => setCount(c => c + 1));
  });

  bench('rerender FC — 10 HOST children, no change', () => {
    withSyncRerender(renderRuntime, () => tickC(++nC));
  });
});
