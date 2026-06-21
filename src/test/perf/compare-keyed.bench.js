// @vitest-environment jsdom

import { Fragment as InfernoFragment, render as infernoRender } from 'inferno';
import { createElement as iEl } from 'inferno-create-element';
import { h, Fragment as PreactFragment, render as preactRender } from 'preact';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { bench, describe } from 'vitest';

import '../../../lib/hooks/index.js';
import { createElement, createRenderRuntime, Fragment } from '../../../lib/core/internal.js';
import { domAdapter } from '../../../lib/dom/domAdapter.js';
import { createCreateRoot } from '../../../lib/dom/render.js';

const simpRuntime = createRenderRuntime(domAdapter, (type, el) => type(el.props ?? {}));
const simp = createCreateRoot(simpRuntime);

const N = 100;
const forward = Array.from({ length: N }, (_, i) => i);
const reversed = [...forward].reverse();
const withFront = [N, ...forward];
const withBack = [...forward, N];

const simpList = keys => createElement(Fragment, null, ...keys.map(k => createElement('div', { key: k }, String(k))));
const reactList = keys =>
  React.createElement(React.Fragment, null, ...keys.map(k => React.createElement('div', { key: k }, String(k))));
const preactList = keys => h(PreactFragment, null, ...keys.map(k => h('div', { key: k }, String(k))));
const infernoList = keys => iEl(InfernoFragment, null, ...keys.map(k => iEl('div', { key: k }, String(k))));

// --- reverse order ---

const sRev = simp(document.createElement('div'));
sRev.render(simpList(forward));

const rRevContainer = document.createElement('div');
const rRevRoot = createRoot(rRevContainer);
flushSync(() => rRevRoot.render(reactList(forward)));

const pRevContainer = document.createElement('div');
preactRender(preactList(forward), pRevContainer);

const iRevContainer = document.createElement('div');
infernoRender(infernoList(forward), iRevContainer);

// --- insert at front ---

const sFront = simp(document.createElement('div'));
sFront.render(simpList(forward));

const rFrontContainer = document.createElement('div');
const rFrontRoot = createRoot(rFrontContainer);
flushSync(() => rFrontRoot.render(reactList(forward)));

const pFrontContainer = document.createElement('div');
preactRender(preactList(forward), pFrontContainer);

const iFrontContainer = document.createElement('div');
infernoRender(infernoList(forward), iFrontContainer);

// --- insert at back ---

const sBack = simp(document.createElement('div'));
sBack.render(simpList(forward));

const rBackContainer = document.createElement('div');
const rBackRoot = createRoot(rBackContainer);
flushSync(() => rBackRoot.render(reactList(forward)));

const pBackContainer = document.createElement('div');
preactRender(preactList(forward), pBackContainer);

const iBackContainer = document.createElement('div');
infernoRender(infernoList(forward), iBackContainer);

// --- benchmarks ---

let toggleRev = false;
let insertedFront = false;
let insertedBack = false;

describe('keyed (N=100) — reverse order', () => {
  bench('simpreact', () => {
    toggleRev = !toggleRev;
    sRev.render(simpList(toggleRev ? reversed : forward));
  });

  bench('react', () => {
    toggleRev = !toggleRev;
    flushSync(() => rRevRoot.render(reactList(toggleRev ? reversed : forward)));
  });

  bench('preact', () => {
    toggleRev = !toggleRev;
    preactRender(preactList(toggleRev ? reversed : forward), pRevContainer);
  });

  bench('inferno', () => {
    toggleRev = !toggleRev;
    infernoRender(infernoList(toggleRev ? reversed : forward), iRevContainer);
  });
});

describe('keyed (N=100) — insert at front', () => {
  bench('simpreact', () => {
    insertedFront = !insertedFront;
    sFront.render(simpList(insertedFront ? withFront : forward));
  });

  bench('react', () => {
    insertedFront = !insertedFront;
    flushSync(() => rFrontRoot.render(reactList(insertedFront ? withFront : forward)));
  });

  bench('preact', () => {
    insertedFront = !insertedFront;
    preactRender(preactList(insertedFront ? withFront : forward), pFrontContainer);
  });

  bench('inferno', () => {
    insertedFront = !insertedFront;
    infernoRender(infernoList(insertedFront ? withFront : forward), iFrontContainer);
  });
});

describe('keyed (N=100) — insert at back', () => {
  bench('simpreact', () => {
    insertedBack = !insertedBack;
    sBack.render(simpList(insertedBack ? withBack : forward));
  });

  bench('react', () => {
    insertedBack = !insertedBack;
    flushSync(() => rBackRoot.render(reactList(insertedBack ? withBack : forward)));
  });

  bench('preact', () => {
    insertedBack = !insertedBack;
    preactRender(preactList(insertedBack ? withBack : forward), pBackContainer);
  });

  bench('inferno', () => {
    insertedBack = !insertedBack;
    infernoRender(infernoList(insertedBack ? withBack : forward), iBackContainer);
  });
});
