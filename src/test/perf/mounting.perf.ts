import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';
import * as Preact from 'preact';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { describe, measure, test } from 'toofast';
import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

describe('Mounting', () => {
  test('simpreact', () => {
    const App = () => {
      return SimpReact.createElement(
        'ul',
        null,
        SimpReact.createElement('li', null, 'first'),
        SimpReact.createElement('li', null, 'second'),
        SimpReact.createElement('li', null, 'third')
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
    const App = () => {
      return React.createElement(
        'ul',
        null,
        React.createElement('li', null, 'first'),
        React.createElement('li', null, 'second'),
        React.createElement('li', null, 'third')
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
    const App = () => {
      return Preact.createElement(
        'ul',
        null,
        Preact.createElement('li', null, 'first'),
        Preact.createElement('li', null, 'second'),
        Preact.createElement('li', null, 'third')
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
    const App = () => {
      return h('ul', null, [h('li', null, 'first'), h('li', null, 'second'), h('li', null, 'third')]);
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
