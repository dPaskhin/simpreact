import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';
import * as Preact from 'preact';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, measure, test } from 'toofast';
import { createElement, createRoot } from '../../../lib/compat/index.js';

describe('Deep tree mounting', () => {
  test('simpreact', () => {
    // Recursive helper to create a nested tree
    const createDeepTree = (depth: number): any => {
      if (depth === 0) {
        return createElement('span', null, 'leaf');
      }
      return createElement('div', null, createDeepTree(depth - 1));
    };

    const App = () => createDeepTree(50); // depth of 50

    let container: HTMLElement;

    measure(
      {
        beforeIteration() {
          container = document.createElement('div');
        },
      },
      () => {
        createRoot(container).render(createElement(App));
      }
    );
  });

  test('react', () => {
    // Recursive helper to create a nested tree
    const createDeepTree = (depth: number): React.ReactElement => {
      if (depth === 0) {
        return React.createElement('span', null, 'leaf');
      }
      return React.createElement('div', null, createDeepTree(depth - 1));
    };

    const App = () => createDeepTree(50); // depth of 50

    let container: HTMLElement;

    measure(
      {
        beforeIteration() {
          container = document.createElement('div');
        },
      },
      () => {
        ReactDOM.createRoot(container).render(React.createElement(App));
      }
    );
  });

  test('preact', () => {
    // Recursive helper to create a nested tree
    const createDeepTree = (depth: number): Preact.VNode => {
      if (depth === 0) {
        return Preact.createElement('span', null, 'leaf');
      }
      return Preact.createElement('div', null, createDeepTree(depth - 1));
    };

    const App = () => createDeepTree(50); // depth of 50

    let container: HTMLElement;

    measure(
      {
        beforeIteration() {
          container = document.createElement('div');
        },
      },
      () => {
        Preact.render(Preact.createElement(App, null), container);
      }
    );
  });

  test('inferno', () => {
    // Recursive helper to create a nested tree
    const createDeepTree = (depth: number): any => {
      if (depth === 0) {
        return h('span', null, 'leaf');
      }
      return h('div', null, createDeepTree(depth - 1));
    };

    const App = () => createDeepTree(50); // depth of 50

    let container: HTMLElement;

    measure(
      {
        beforeIteration() {
          container = document.createElement('div');
        },
      },
      () => {
        Inferno.createRenderer(container)(null, h(App));
      }
    );
  });
});
