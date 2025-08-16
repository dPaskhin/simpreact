import { beforeEach, describe, measure, test } from 'toofast';

import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

import React from 'react';
import ReactDOM from 'react-dom/client';

import * as Preact from 'preact';

import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';

describe('Update existing list items', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('simpreact', () => {
    const App = ({ items }: { items: string[] }) => {
      return SimpReact.createElement('ul', null, ...items.map(text => SimpReact.createElement('li', null, text)));
    };

    const root = SimpReactDom.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(SimpReact.createElement(App, { items: ['first', 'second', 'third'] }));
        },
      },
      () => {
        root.render(SimpReact.createElement(App, { items: ['one', 'two', 'three'] }));
      }
    );
  });

  test('react', () => {
    const App = ({ items }: { items: string[] }) => {
      return React.createElement('ul', null, ...items.map(text => React.createElement('li', null, text)));
    };

    const root = ReactDOM.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(React.createElement(App, { items: ['first', 'second', 'third'] }));
        },
      },
      () => {
        root.render(React.createElement(App, { items: ['one', 'two', 'three'] }));
      }
    );
  });

  test('preact', () => {
    const App = ({ items }: { items: string[] }) => {
      return Preact.createElement('ul', null, ...items.map(text => Preact.createElement('li', null, text)));
    };

    measure(
      {
        beforeIteration() {
          Preact.render(Preact.createElement(App, { items: ['first', 'second', 'third'] }), container);
        },
      },
      () => {
        Preact.render(Preact.createElement(App, { items: ['one', 'two', 'three'] }), container);
      }
    );
  });

  test('inferno', () => {
    const App = ({ items }: { items: string[] }) => {
      return h(
        'ul',
        null,
        items.map(text => h('li', null, text))
      );
    };

    const renderer = Inferno.createRenderer(container);

    measure(
      {
        beforeIteration() {
          renderer(null, h(App, { items: ['first', 'second', 'third'] }));
        },
      },
      () => {
        renderer(null, h(App, { items: ['one', 'two', 'three'] }));
      }
    );
  });
});
