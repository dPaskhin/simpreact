import { bench, describe } from 'vitest';

import { createElement, Fragment, mount, unmount } from '../../../lib/core/internal.js';
import { renderRuntime } from './setup.js';

const parent = {};

const HostOnly = () => createElement('div');

const FCto10 = () =>
  createElement(
    'ul',
    null,
    createElement('li', null, '1'),
    createElement('li', null, '2'),
    createElement('li', null, '3'),
    createElement('li', null, '4'),
    createElement('li', null, '5'),
    createElement('li', null, '6'),
    createElement('li', null, '7'),
    createElement('li', null, '8'),
    createElement('li', null, '9'),
    createElement('li', null, '10')
  );

const L5 = () => createElement('div');
const L4 = () => createElement(L5);
const L3 = () => createElement(L4);
const L2 = () => createElement(L3);
const L1 = () => createElement(L2);
const L0 = () => createElement(L1);

const FragChild = () => createElement('span');
const Frag20 = () => createElement(Fragment, null, ...Array.from({ length: 20 }, () => createElement(FragChild)));

describe('mount', () => {
  bench('1 HOST element', () => {
    const root = createElement('div');
    mount(root, parent, null, null, null, renderRuntime);
    unmount(root, renderRuntime);
  });

  bench('1 FC → 1 HOST', () => {
    const root = createElement(HostOnly);
    mount(root, parent, null, null, null, renderRuntime);
    unmount(root, renderRuntime);
  });

  bench('1 FC → 10 HOST children', () => {
    const root = createElement(FCto10);
    mount(root, parent, null, null, null, renderRuntime);
    unmount(root, renderRuntime);
  });

  bench('5-level FC chain', () => {
    const root = createElement(L0);
    mount(root, parent, null, null, null, renderRuntime);
    unmount(root, renderRuntime);
  });

  bench('Fragment with 20 FC children', () => {
    const root = createElement(Frag20);
    mount(root, parent, null, null, null, renderRuntime);
    unmount(root, renderRuntime);
  });
});
