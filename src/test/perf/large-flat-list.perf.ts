import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';
import * as Preact from 'preact';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, measure, test } from 'toofast';
import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

describe('Large flat list mounting', () => {
  test('simpreact', () => {
    const App = ({ count }: { count: number }) => {
      return SimpReact.createElement(
        'ul',
        null,
        ...Array.from({ length: count }, (_, i) => SimpReact.createElement('li', { key: i }, `Item ${i}`))
      );
    };

    let container: HTMLElement;

    measure(
      {
        beforeIteration() {
          container = document.createElement('div');
        },
      },
      () => {
        SimpReactDom.createRoot(container).render(SimpReact.createElement(App));
      }
    );
  });

  test('react', () => {
    const App = ({ count }: { count: number }) => {
      return React.createElement(
        'ul',
        null,
        ...Array.from({ length: count }, (_, i) => React.createElement('li', { key: i }, `Item ${i}`))
      );
    };

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
    const App = ({ count }: { count: number }) => {
      return Preact.createElement(
        'ul',
        null,
        ...Array.from({ length: count }, (_, i) => Preact.createElement('li', { key: i }, `Item ${i}`))
      );
    };

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
    const App = ({ count }: { count: number }) => {
      return h(
        'ul',
        null,
        Array.from({ length: count }, (_, i) => h('li', { key: i }, `Item ${i}`))
      );
    };

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
