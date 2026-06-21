import { bench, describe } from 'vitest';

import { createElement, Fragment, mount, withSyncRerender } from '../../../lib/core/internal.js';
import { renderRuntime, useState } from './setup.js';

const parent = {};
const N = 100;
const forward = Array.from({ length: N }, (_, i) => i);
const reversed = [...forward].reverse();
const withFront = [N, ...forward];
const withBack = [...forward, N];

function makeList(keys) {
  return keys.map(k => createElement('div', { key: k }, String(k)));
}

// --- reverse order ---
let setKeysReverse;
let toggleReverse = false;

const ListReverse = () => {
  const [keys, set] = useState(forward);
  setKeysReverse = set;
  return createElement(Fragment, null, ...makeList(keys));
};

mount(createElement(ListReverse), parent, null, null, null, renderRuntime);

// --- insert at front ---
let setKeysFront;
let insertedFront = false;

const ListFront = () => {
  const [keys, set] = useState(forward);
  setKeysFront = set;
  return createElement(Fragment, null, ...makeList(keys));
};

mount(createElement(ListFront), parent, null, null, null, renderRuntime);

// --- insert at back ---
let setKeysBack;
let insertedBack = false;

const ListBack = () => {
  const [keys, set] = useState(forward);
  setKeysBack = set;
  return createElement(Fragment, null, ...makeList(keys));
};

mount(createElement(ListBack), parent, null, null, null, renderRuntime);

// --- stable (same order) ---
let setKeysStable;

const ListStable = () => {
  const [keys, set] = useState(forward);
  setKeysStable = set;
  return createElement(Fragment, null, ...makeList(keys));
};

mount(createElement(ListStable), parent, null, null, null, renderRuntime);

describe('keyed reconciliation (N=100)', () => {
  bench('reverse order', () => {
    toggleReverse = !toggleReverse;
    withSyncRerender(renderRuntime, () => setKeysReverse(toggleReverse ? reversed : forward));
  });

  bench('insert at front', () => {
    insertedFront = !insertedFront;
    withSyncRerender(renderRuntime, () => setKeysFront(insertedFront ? withFront : forward));
  });

  bench('insert at back', () => {
    insertedBack = !insertedBack;
    withSyncRerender(renderRuntime, () => setKeysBack(insertedBack ? withBack : forward));
  });

  bench('stable (same order)', () => {
    withSyncRerender(renderRuntime, () => setKeysStable(forward.slice()));
  });
});
