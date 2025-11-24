import * as Inferno from 'inferno';
import { h } from 'inferno-hyperscript';
import * as Preact from 'preact';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, measure, test } from 'toofast';
import * as SimpReact from '../../../lib/core/index.js';
import * as SimpReactDom from '../../../lib/dom/index.js';

describe('Large flat list updating', () => {
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

    const initialItems = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      text: `Item ${i}`,
    }));

    const updatedItems = [...initialItems];
    updatedItems[2500] = { id: 2500, text: 'UPDATED item 2500' };

    measure(
      {
        beforeIteration() {
          root.render(SimpReact.createElement(App, { items: initialItems }));
        },
      },
      () => {
        root.render(SimpReact.createElement(App, { items: updatedItems }));
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

    const initialItems = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      text: `Item ${i}`,
    }));

    const updatedItems = [...initialItems];
    updatedItems[2500] = { id: 2500, text: 'UPDATED item 2500' };

    measure(
      {
        beforeIteration() {
          root.render(React.createElement(App, { items: initialItems }));
        },
      },
      () => {
        root.render(React.createElement(App, { items: updatedItems }));
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

    const initialItems = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      text: `Item ${i}`,
    }));

    const updatedItems = [...initialItems];
    updatedItems[2500] = { id: 2500, text: 'UPDATED item 2500' };

    measure(
      {
        beforeIteration() {
          Preact.render(Preact.createElement(App, { items: initialItems }), container);
        },
      },
      () => {
        Preact.render(Preact.createElement(App, { items: updatedItems }), container);
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

    const initialItems = Array.from({ length: 5000 }, (_, i) => ({
      id: i,
      text: `Item ${i}`,
    }));

    const updatedItems = [...initialItems];
    updatedItems[2500] = { id: 2500, text: 'UPDATED item 2500' };

    measure(
      {
        beforeIteration() {
          renderer(null, h(App, { items: initialItems }));
        },
      },
      () => {
        renderer(null, h(App, { items: updatedItems }));
      }
    );
  });
});
