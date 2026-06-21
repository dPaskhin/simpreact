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

// --- text update: span with changing text ---

const sText = simp(document.createElement('div'));
sText.render(createElement('span', null, '0'));

const rTextContainer = document.createElement('div');
const rTextRoot = createRoot(rTextContainer);
flushSync(() => rTextRoot.render(React.createElement('span', null, '0')));

const pTextContainer = document.createElement('div');
preactRender(h('span', null, '0'), pTextContainer);

const iTextContainer = document.createElement('div');
infernoRender(iEl('span', null, '0'), iTextContainer);

// --- 10 children, no change ---

const ul10simp = () =>
  createElement(
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

const ul10react = () =>
  React.createElement(
    'ul',
    null,
    React.createElement('li', null, 'a'),
    React.createElement('li', null, 'b'),
    React.createElement('li', null, 'c'),
    React.createElement('li', null, 'd'),
    React.createElement('li', null, 'e'),
    React.createElement('li', null, 'f'),
    React.createElement('li', null, 'g'),
    React.createElement('li', null, 'h'),
    React.createElement('li', null, 'i'),
    React.createElement('li', null, 'j')
  );

const ul10preact = () =>
  h(
    'ul',
    null,
    h('li', null, 'a'),
    h('li', null, 'b'),
    h('li', null, 'c'),
    h('li', null, 'd'),
    h('li', null, 'e'),
    h('li', null, 'f'),
    h('li', null, 'g'),
    h('li', null, 'h'),
    h('li', null, 'i'),
    h('li', null, 'j')
  );

const ul10inferno = () =>
  iEl(
    'ul',
    null,
    iEl('li', null, 'a'),
    iEl('li', null, 'b'),
    iEl('li', null, 'c'),
    iEl('li', null, 'd'),
    iEl('li', null, 'e'),
    iEl('li', null, 'f'),
    iEl('li', null, 'g'),
    iEl('li', null, 'h'),
    iEl('li', null, 'i'),
    iEl('li', null, 'j')
  );

const s10 = simp(document.createElement('div'));
s10.render(ul10simp());

const r10Container = document.createElement('div');
const r10Root = createRoot(r10Container);
flushSync(() => r10Root.render(ul10react()));

const p10Container = document.createElement('div');
preactRender(ul10preact(), p10Container);

const i10Container = document.createElement('div');
infernoRender(ul10inferno(), i10Container);

// --- benchmarks ---

let n = 0;

describe('patch — text update', () => {
  bench('simpreact', () => {
    n++;
    sText.render(createElement('span', null, String(n)));
  });

  bench('react', () => {
    n++;
    flushSync(() => rTextRoot.render(React.createElement('span', null, String(n))));
  });

  bench('preact', () => {
    n++;
    preactRender(h('span', null, String(n)), pTextContainer);
  });

  bench('inferno', () => {
    n++;
    infernoRender(iEl('span', null, String(n)), iTextContainer);
  });
});

describe('patch — 10 children, no change', () => {
  bench('simpreact', () => {
    s10.render(ul10simp());
  });

  bench('react', () => {
    flushSync(() => r10Root.render(ul10react()));
  });

  bench('preact', () => {
    preactRender(ul10preact(), p10Container);
  });

  bench('inferno', () => {
    infernoRender(ul10inferno(), i10Container);
  });
});
