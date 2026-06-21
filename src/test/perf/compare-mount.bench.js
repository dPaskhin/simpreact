// @vitest-environment jsdom

import { render as infernoRender } from 'inferno';
import { createElement as iEl } from 'inferno-create-element';
import { h, render as preactRender } from 'preact';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { bench, describe } from 'vitest';

import '../../../lib/hooks/index.js';
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
