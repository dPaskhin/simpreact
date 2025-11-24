import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';
import * as Preact from 'preact';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, measure, test } from 'toofast';
import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

describe('Mixed updating', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('simpreact', () => {
    const App = ({ items }: { items: { id: number; text: string }[] }) => {
      return SimpReact.createElement(
        'ul',
        null,
        ...items.map(item => SimpReact.createElement('li', { key: item.id }, item.text))
      );
    };

    const root = SimpReactDom.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(
            SimpReact.createElement(App, {
              items: [
                { id: 1, text: 'first' },
                { id: 2, text: 'second' },
                { id: 3, text: 'third' },
              ],
            })
          );
        },
      },
      () => {
        root.render(
          SimpReact.createElement(App, {
            items: [
              { id: 1, text: 'first' },
              { id: 2, text: 'two' },
              { id: 4, text: 'fourth' },
            ],
          })
        );
      }
    );
  });

  test('react', () => {
    const App = ({ items }: { items: { id: number; text: string }[] }) => {
      return React.createElement(
        'ul',
        null,
        ...items.map(item => React.createElement('li', { key: item.id }, item.text))
      );
    };

    const root = ReactDOM.createRoot(container);

    measure(
      {
        beforeIteration() {
          root.render(
            React.createElement(App, {
              items: [
                { id: 1, text: 'first' },
                { id: 2, text: 'second' },
                { id: 3, text: 'third' },
              ],
            })
          );
        },
      },
      () => {
        root.render(
          React.createElement(App, {
            items: [
              { id: 1, text: 'first' },
              { id: 2, text: 'two' },
              { id: 4, text: 'fourth' },
            ],
          })
        );
      }
    );
  });

  test('preact', () => {
    const App = ({ items }: { items: { id: number; text: string }[] }) => {
      return Preact.createElement(
        'ul',
        null,
        ...items.map(item => Preact.createElement('li', { key: item.id }, item.text))
      );
    };

    measure(
      {
        beforeIteration() {
          Preact.render(
            Preact.createElement(App, {
              items: [
                { id: 1, text: 'first' },
                { id: 2, text: 'second' },
                { id: 3, text: 'third' },
              ],
            }),
            container
          );
        },
      },
      () => {
        Preact.render(
          Preact.createElement(App, {
            items: [
              { id: 1, text: 'first' },
              { id: 2, text: 'two' },
              { id: 4, text: 'fourth' },
            ],
          }),
          container
        );
      }
    );
  });

  test('inferno', () => {
    const App = ({ items }: { items: { id: number; text: string }[] }) => {
      return h(
        'ul',
        null,
        items.map(item => h('li', { key: item.id }, item.text))
      );
    };

    const renderer = Inferno.createRenderer(container);

    measure(
      {
        beforeIteration() {
          renderer(
            null,
            h(App, {
              items: [
                { id: 1, text: 'first' },
                { id: 2, text: 'second' },
                { id: 3, text: 'third' },
              ],
            })
          );
        },
      },
      () => {
        renderer(
          null,
          h(App, {
            items: [
              { id: 1, text: 'first' },
              { id: 2, text: 'two' },
              { id: 4, text: 'fourth' },
            ],
          })
        );
      }
    );
  });
});
