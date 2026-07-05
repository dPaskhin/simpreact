// @vitest-environment jsdom

import { render as infernoRender } from 'inferno';
import { createElement as iEl } from 'inferno-create-element';
import { h, render as preactRender } from 'preact';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { bench, describe } from 'vitest';

import { createElement, createRenderRuntime } from '../../../lib/core/internal.js';
import { domAdapter } from '../../../lib/dom/domAdapter.js';
import { createCreateRoot } from '../../../lib/dom/render.js';

const simpRuntime = createRenderRuntime(domAdapter, (type, el) => type(el.props ?? {}));
const simp = createCreateRoot(simpRuntime);

// --- component definitions ---

const SimpFC = () => createElement('div');
const ReactFC = () => React.createElement('div');
const PreactFC = () => h('div', null);
const InfernoFC = () => iEl('div', null);

const SimpFC10 = () =>
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

const ReactFC10 = () =>
  React.createElement(
    'ul',
    null,
    React.createElement('li', null, '1'),
    React.createElement('li', null, '2'),
    React.createElement('li', null, '3'),
    React.createElement('li', null, '4'),
    React.createElement('li', null, '5'),
    React.createElement('li', null, '6'),
    React.createElement('li', null, '7'),
    React.createElement('li', null, '8'),
    React.createElement('li', null, '9'),
    React.createElement('li', null, '10')
  );

const PreactFC10 = () =>
  h(
    'ul',
    null,
    h('li', null, '1'),
    h('li', null, '2'),
    h('li', null, '3'),
    h('li', null, '4'),
    h('li', null, '5'),
    h('li', null, '6'),
    h('li', null, '7'),
    h('li', null, '8'),
    h('li', null, '9'),
    h('li', null, '10')
  );

const InfernoFC10 = () =>
  iEl(
    'ul',
    null,
    iEl('li', null, '1'),
    iEl('li', null, '2'),
    iEl('li', null, '3'),
    iEl('li', null, '4'),
    iEl('li', null, '5'),
    iEl('li', null, '6'),
    iEl('li', null, '7'),
    iEl('li', null, '8'),
    iEl('li', null, '9'),
    iEl('li', null, '10')
  );

const DEEP_LEVELS = 200;

function buildFCChain(createComponent, createLeaf) {
  let Chain = createLeaf;
  for (let i = 0; i < DEEP_LEVELS; i++) {
    const Inner = Chain;
    Chain = () => createComponent(Inner);
  }
  return Chain;
}

const SimpFCDeep = buildFCChain(
  Inner => createElement(Inner),
  () => createElement('div')
);
const ReactFCDeep = buildFCChain(
  Inner => React.createElement(Inner),
  () => React.createElement('div')
);
const PreactFCDeep = buildFCChain(
  Inner => h(Inner, null),
  () => h('div', null)
);
const InfernoFCDeep = buildFCChain(
  Inner => iEl(Inner, null),
  () => iEl('div', null)
);

function buildHostChain(createHost, depth) {
  let el = createHost(null);
  for (let i = 0; i < depth; i++) {
    el = createHost(el);
  }
  return el;
}

const createSimpDeepHostTree = () => buildHostChain(child => createElement('div', null, child), DEEP_LEVELS);
const createReactDeepHostTree = () => buildHostChain(child => React.createElement('div', null, child), DEEP_LEVELS);
const createPreactDeepHostTree = () => buildHostChain(child => h('div', null, child), DEEP_LEVELS);
const createInfernoDeepHostTree = () => buildHostChain(child => iEl('div', null, child), DEEP_LEVELS);

// A handful of attributes + a style object + an event handler — exercises
// attribute aliasing, style diffing and event (de)registration on mount.
// Not FC-wrapped: isolates props-handling cost from FC-dispatch cost, which
// the "1 FC → 1 HOST" / deep-chain scenarios above already cover.
const propsHandler = () => {};
const propsObj = {
  id: 'item',
  title: 'a title',
  className: 'foo bar',
  style: { color: 'red', fontSize: '14px', padding: '4px 8px', display: 'block' },
  onClick: propsHandler,
};

// --- containers ---

const s1 = simp(document.createElement('div'));
const r1 = document.createElement('div');
const p1 = document.createElement('div');
const i1 = document.createElement('div');

const sFC = simp(document.createElement('div'));
const rFC = document.createElement('div');
const pFC = document.createElement('div');
const iFC = document.createElement('div');

const s10 = simp(document.createElement('div'));
const r10 = document.createElement('div');
const p10 = document.createElement('div');
const i10 = document.createElement('div');

const sDeep = simp(document.createElement('div'));
const rDeep = document.createElement('div');
const pDeep = document.createElement('div');
const iDeep = document.createElement('div');

const sDeepHost = simp(document.createElement('div'));
const rDeepHost = document.createElement('div');
const pDeepHost = document.createElement('div');
const iDeepHost = document.createElement('div');

const sProps = simp(document.createElement('div'));
const rProps = document.createElement('div');
const pProps = document.createElement('div');
const iProps = document.createElement('div');

// --- benchmarks ---

describe('mount — 1 HOST element', () => {
  bench('simpreact', () => {
    s1.render(createElement('div'));
    s1.unmount();
  });

  bench('react', () => {
    const root = createRoot(r1);
    flushSync(() => root.render(React.createElement('div')));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(h('div', null), p1);
    preactRender(null, p1);
  });

  bench('inferno', () => {
    infernoRender(iEl('div', null), i1);
    infernoRender(null, i1);
  });
});

describe('mount — 1 FC → 1 HOST', () => {
  bench('simpreact', () => {
    sFC.render(createElement(SimpFC));
    sFC.unmount();
  });

  bench('react', () => {
    const root = createRoot(rFC);
    flushSync(() => root.render(React.createElement(ReactFC)));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(h(PreactFC, null), pFC);
    preactRender(null, pFC);
  });

  bench('inferno', () => {
    infernoRender(iEl(InfernoFC, null), iFC);
    infernoRender(null, iFC);
  });
});

describe('mount — FC → 10 HOST children', () => {
  bench('simpreact', () => {
    s10.render(createElement(SimpFC10));
    s10.unmount();
  });

  bench('react', () => {
    const root = createRoot(r10);
    flushSync(() => root.render(React.createElement(ReactFC10)));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(h(PreactFC10, null), p10);
    preactRender(null, p10);
  });

  bench('inferno', () => {
    infernoRender(iEl(InfernoFC10, null), i10);
    infernoRender(null, i10);
  });
});

describe(`mount — Deep FC chain (${DEEP_LEVELS} levels)`, () => {
  bench('simpreact', () => {
    sDeep.render(createElement(SimpFCDeep));
    sDeep.unmount();
  });

  bench('react', () => {
    const root = createRoot(rDeep);
    flushSync(() => root.render(React.createElement(ReactFCDeep)));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(h(PreactFCDeep, null), pDeep);
    preactRender(null, pDeep);
  });

  bench('inferno', () => {
    infernoRender(iEl(InfernoFCDeep, null), iDeep);
    infernoRender(null, iDeep);
  });
});

describe(`mount — Deep HOST tree (${DEEP_LEVELS} levels)`, () => {
  bench('simpreact', () => {
    sDeepHost.render(createSimpDeepHostTree());
    sDeepHost.unmount();
  });

  bench('react', () => {
    const root = createRoot(rDeepHost);
    flushSync(() => root.render(createReactDeepHostTree()));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(createPreactDeepHostTree(), pDeepHost);
    preactRender(null, pDeepHost);
  });

  bench('inferno', () => {
    infernoRender(createInfernoDeepHostTree(), iDeepHost);
    infernoRender(null, iDeepHost);
  });
});

describe('mount — HOST with props (attrs + style + event)', () => {
  bench('simpreact', () => {
    sProps.render(createElement('div', propsObj));
    sProps.unmount();
  });

  bench('react', () => {
    const root = createRoot(rProps);
    flushSync(() => root.render(React.createElement('div', propsObj)));
    root.unmount();
  });

  bench('preact', () => {
    preactRender(h('div', propsObj), pProps);
    preactRender(null, pProps);
  });

  bench('inferno', () => {
    infernoRender(iEl('div', propsObj), iProps);
    infernoRender(null, iProps);
  });
});
