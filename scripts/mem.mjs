// Memory benchmark: per-instance retained heap across vDOM libraries.
// Run via: npm run mem | npm run mem:save | npm run mem:compare

import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

if (!globalThis.gc) {
  console.error('Missing --expose-gc. Run via: npm run mem');
  process.exit(1);
}

const args = process.argv.slice(2);
const saveFile = argVal(args, '--save');
const compareFile = argVal(args, '--compare');

function argVal(argv, flag) {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : null;
}

// ─── jsdom setup ─────────────────────────────────────────────────────────────
// Must happen before importing DOM-dependent libraries.
// navigator is a read-only getter on Node 22 globalThis, so we skip it.

const { window: w } = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
globalThis.window = w;
globalThis.document = w.document;
globalThis.Element = w.Element;
globalThis.HTMLElement = w.HTMLElement;
globalThis.SVGElement = w.SVGElement;
globalThis.Text = w.Text;
globalThis.Comment = w.Comment;
globalThis.DocumentFragment = w.DocumentFragment;
globalThis.MutationObserver = w.MutationObserver;
globalThis.CustomEvent = w.CustomEvent;
globalThis.Event = w.Event;
globalThis.Node = w.Node;

// ─── library imports ─────────────────────────────────────────────────────────
// Dynamic so jsdom globals are visible when each library initialises.

await import('../lib/hooks/index.js');
const { createElement, createRenderRuntime, Fragment } = await import('../lib/core/internal.js');
const { domAdapter } = await import('../lib/dom/domAdapter.js');
const { createCreateRoot } = await import('../lib/dom/render.js');

const React = (await import('react')).default;
const { flushSync } = await import('react-dom');
const { createRoot } = await import('react-dom/client');
const { h, render: preactRender, Fragment: PreactFragment } = await import('preact');
const { render: infernoRender, Fragment: InfernoFragment } = await import('inferno');
const { createElement: iEl } = await import('inferno-create-element');

const simpRuntime = createRenderRuntime(domAdapter, (type, el) => type(el.props ?? {}));
const mkSimp = createCreateRoot(simpRuntime);

// ─── helpers ─────────────────────────────────────────────────────────────────

function gc() {
  globalThis.gc();
  globalThis.gc(); // two passes: young + old generation
}

function fmt(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1_048_576) return `${sign}${(abs / 1024).toFixed(1)} KB`;
  return `${sign}${(abs / 1_048_576).toFixed(2)} MB`;
}

// ─── measurement ─────────────────────────────────────────────────────────────

// mountFn() mounts a tree and returns an unmount callback.
// Returns { mounted, leaked } byte deltas per instance.
async function measure(mountFn, { n = 500, warmup = 20 } = {}) {
  const tmp = [];
  for (let i = 0; i < warmup; i++) tmp.push(mountFn());
  for (const u of tmp) u();
  tmp.length = 0;
  gc();

  const base = process.memoryUsage().heapUsed;

  const unmounts = [];
  for (let i = 0; i < n; i++) unmounts.push(mountFn());
  gc();
  const mountedHeap = process.memoryUsage().heapUsed;

  for (const u of unmounts) u();
  unmounts.length = 0;
  gc();
  const cleanHeap = process.memoryUsage().heapUsed;

  return {
    mounted: Math.round((mountedHeap - base) / n),
    leaked: Math.round((cleanHeap - base) / n),
  };
}

// ─── component definitions ───────────────────────────────────────────────────

const SimpFC = () => createElement('div');
const ReactFC = () => React.createElement('div');
const PreactFC = () => h('div', null);
const InfernoFC = () => iEl('div', null);

const SimpFC10 = () =>
  createElement('ul', null, ...Array.from({ length: 10 }, (_, i) => createElement('li', null, String(i))));
const ReactFC10 = () =>
  React.createElement('ul', null, ...Array.from({ length: 10 }, (_, i) => React.createElement('li', null, String(i))));
const PreactFC10 = () => h('ul', null, ...Array.from({ length: 10 }, (_, i) => h('li', null, String(i))));
const InfernoFC10 = () => iEl('ul', null, ...Array.from({ length: 10 }, (_, i) => iEl('li', null, String(i))));

const keys100 = Array.from({ length: 100 }, (_, i) => i);
const simpKeyed = () => createElement(Fragment, null, ...keys100.map(k => createElement('div', { key: k }, String(k))));
const reactKeyed = () =>
  React.createElement(React.Fragment, null, ...keys100.map(k => React.createElement('div', { key: k }, String(k))));
const preactKeyed = () => h(PreactFragment, null, ...keys100.map(k => h('div', { key: k }, String(k))));
const infernoKeyed = () => iEl(InfernoFragment, null, ...keys100.map(k => iEl('div', { key: k }, String(k))));

// ─── scenarios ───────────────────────────────────────────────────────────────

const N = 500;

const SCENARIOS = [
  {
    name: '1 HOST element',
    simp: () => {
      const r = mkSimp(document.createElement('div'));
      r.render(createElement('div'));
      return () => r.unmount();
    },
    react: () => {
      const c = document.createElement('div');
      const r = createRoot(c);
      flushSync(() => r.render(React.createElement('div')));
      return () => r.unmount();
    },
    preact: () => {
      const c = document.createElement('div');
      preactRender(h('div', null), c);
      return () => preactRender(null, c);
    },
    inferno: () => {
      const c = document.createElement('div');
      infernoRender(iEl('div', null), c);
      return () => infernoRender(null, c);
    },
  },
  {
    name: '1 FC → 1 HOST',
    simp: () => {
      const r = mkSimp(document.createElement('div'));
      r.render(createElement(SimpFC));
      return () => r.unmount();
    },
    react: () => {
      const c = document.createElement('div');
      const r = createRoot(c);
      flushSync(() => r.render(React.createElement(ReactFC)));
      return () => r.unmount();
    },
    preact: () => {
      const c = document.createElement('div');
      preactRender(h(PreactFC, null), c);
      return () => preactRender(null, c);
    },
    inferno: () => {
      const c = document.createElement('div');
      infernoRender(iEl(InfernoFC, null), c);
      return () => infernoRender(null, c);
    },
  },
  {
    name: 'FC → 10 HOST children',
    simp: () => {
      const r = mkSimp(document.createElement('div'));
      r.render(createElement(SimpFC10));
      return () => r.unmount();
    },
    react: () => {
      const c = document.createElement('div');
      const r = createRoot(c);
      flushSync(() => r.render(React.createElement(ReactFC10)));
      return () => r.unmount();
    },
    preact: () => {
      const c = document.createElement('div');
      preactRender(h(PreactFC10, null), c);
      return () => preactRender(null, c);
    },
    inferno: () => {
      const c = document.createElement('div');
      infernoRender(iEl(InfernoFC10, null), c);
      return () => infernoRender(null, c);
    },
  },
  {
    name: 'keyed list N=100',
    simp: () => {
      const r = mkSimp(document.createElement('div'));
      r.render(simpKeyed());
      return () => r.unmount();
    },
    react: () => {
      const c = document.createElement('div');
      const r = createRoot(c);
      flushSync(() => r.render(reactKeyed()));
      return () => r.unmount();
    },
    preact: () => {
      const c = document.createElement('div');
      preactRender(preactKeyed(), c);
      return () => preactRender(null, c);
    },
    inferno: () => {
      const c = document.createElement('div');
      infernoRender(infernoKeyed(), c);
      return () => infernoRender(null, c);
    },
  },
];

// ─── run ─────────────────────────────────────────────────────────────────────

const LIBS = ['simp', 'react', 'preact', 'inferno'];
const HEADERS = ['simpreact', 'react', 'preact', 'inferno'];

const results = [];
for (const s of SCENARIOS) {
  process.stdout.write(`measuring ${s.name}…`);
  const row = { name: s.name };
  for (const lib of LIBS) row[lib] = await measure(s[lib], { n: N });
  process.stdout.write(' done\n');
  results.push(row);
}

// ─── save ─────────────────────────────────────────────────────────────────────

if (saveFile) {
  const payload = { date: new Date().toISOString(), n: N, scenarios: results };
  writeFileSync(saveFile, JSON.stringify(payload, null, 2));
  console.log(`\nBaseline written to ${saveFile}`);
}

// ─── output ───────────────────────────────────────────────────────────────────

const RED = '\x1b[31m';
const GRN = '\x1b[32m';
const DIM = '\x1b[2m';
const RST = '\x1b[0m';

// Returns a coloured Δ% tag, or empty string when within the noise threshold.
function delta(now, base, threshold = 0.03) {
  if (base === 0) return '';
  const d = (now - base) / Math.abs(base);
  if (Math.abs(d) < threshold) return `${DIM}(=)${RST}`;
  const tag = `(${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%)`;
  return d > 0 ? `${RED}${tag}${RST}` : `${GRN}${tag}${RST}`;
}

const baseline = compareFile ? JSON.parse(readFileSync(compareFile, 'utf8')) : null;

// Build a lookup map from the baseline for quick access.
const baseMap = Object.fromEntries((baseline?.scenarios ?? []).map(s => [s.name, s]));

const COL = 11;
const DTAG = 7; // width reserved for the Δ tag (plain chars, no ANSI)
const LABEL = 20;
const SEP = '  ';

const headerRow = ' '.repeat(LABEL + 8) + SEP + HEADERS.map(h => h.padStart(COL)).join(SEP);
const rule = '─'.repeat(headerRow.length + (baseline ? LIBS.length * (DTAG + 1) : 0));

if (baseline) {
  console.log(`\nMemory vs ${compareFile}  (saved ${baseline.date.slice(0, 10)})\n`);
} else {
  console.log(`\nMemory per mounted instance  (N=${N})\n`);
}
console.log(headerRow);
console.log(rule);

for (const row of results) {
  const base = baseMap[row.name];

  function cell(lib, metric) {
    const val = fmt(row[lib][metric]).padStart(COL);
    if (!base) return val;
    const tag = delta(row[lib][metric], base[lib][metric]);
    // pad the visible part of the tag to DTAG chars (ANSI codes don't count)
    const visible = tag.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = ' '.repeat(Math.max(0, DTAG - visible.length));
    return val + ' ' + tag + padding;
  }

  const mountedCols = LIBS.map(l => cell(l, 'mounted')).join(SEP);
  const leakedCols = LIBS.map(l => cell(l, 'leaked')).join(SEP);
  console.log(`  ${row.name.padEnd(LABEL)}  mounted ${SEP}${mountedCols}`);
  console.log(`  ${''.padEnd(LABEL)}  leaked  ${SEP}${leakedCols}`);
}

console.log();
