import { beforeEach, describe, measure, test } from 'toofast';

import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

import React from 'react';
import ReactDOM from 'react-dom/client';

import * as Preact from 'preact';

import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';

describe('Reorder list items', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('simpreact', () => {
    const items1 = ['a', 'b', 'c', 'd'];
    const items2 = ['d', 'c', 'b', 'a'];

    const App = (items: string[]) => {
      return SimpReact.createElement(
        'ul',
        null,
        ...items.map(text => SimpReact.createElement('li', { key: text }, text))
      );
    };

    const root = SimpReactDom.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(App(items1));
        },
      },
      () => {
        root.render(App(items2));
      }
    );
  });

  test('react', () => {
    const items1 = ['a', 'b', 'c', 'd'];
    const items2 = ['d', 'c', 'b', 'a'];

    const App = (items: string[]) => {
      return React.createElement('ul', null, ...items.map(text => React.createElement('li', { key: text }, text)));
    };

    const root = ReactDOM.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(App(items1));
        },
      },
      () => {
        root.render(App(items2));
      }
    );
  });

  test('preact', () => {
    const items1 = ['a', 'b', 'c', 'd'];
    const items2 = ['d', 'c', 'b', 'a'];

    const App = (items: string[]) => {
      return Preact.createElement('ul', null, ...items.map(text => Preact.createElement('li', { key: text }, text)));
    };

    measure(
      {
        beforeIteration() {
          Preact.render(App(items1), container);
        },
      },
      () => {
        Preact.render(App(items2), container);
      }
    );
  });

  test('inferno', () => {
    const items1 = ['a', 'b', 'c', 'd'];
    const items2 = ['d', 'c', 'b', 'a'];

    const App = (items: string[]) => {
      return h(
        'ul',
        null,
        items.map(text => h('li', { key: text }, text))
      );
    };

    const renderer = Inferno.createRenderer(container);

    measure(
      {
        beforeIteration() {
          renderer(null, App(items1));
        },
      },
      () => {
        renderer(null, App(items2));
      }
    );
  });
});
