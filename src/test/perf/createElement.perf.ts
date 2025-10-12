import { describe, measure, test } from 'toofast';

import * as SimpReact from '../../../lib/core/internal.js';

const heavyProps = {
  id: 'root',
  className: 'container',
  dataValue: 'some data',
  style: { color: 'red', fontSize: '12px' },
  'data-long': Array.from({ length: 50 }, (_, i) => i).join(','),
};

describe('createElement — performance tests', () => {
  test('create simple host element', () => {
    measure(() => {
      SimpReact.createElement('div');
    });
  });

  test('create host element with props', () => {
    measure(() => {
      SimpReact.createElement('div', heavyProps);
    });
  });

  test('create host element with text child', () => {
    measure(() => {
      SimpReact.createElement('div', null, 'Hello World');
    });
  });

  test('create element with multiple children', () => {
    measure(() => {
      SimpReact.createElement(
        'ul',
        null,
        SimpReact.createElement('li', null, 'A'),
        SimpReact.createElement('li', null, 'B'),
        SimpReact.createElement('li', null, 'C')
      );
    });
  });

  test('create fragment with children', () => {
    measure(() => {
      SimpReact.createElement(
        SimpReact.Fragment,
        null,
        SimpReact.createElement('span', null, '1'),
        SimpReact.createElement('span', null, '2')
      );
    });
  });

  test('create functional component', () => {
    measure(() => {
      SimpReact.createElement(noop as any, { text: 'Hi!' });
    });
  });

  test('create 1000 host elements', () => {
    measure(() => {
      for (let i = 0; i < 1000; i++) {
        SimpReact.createElement('div', { key: i }, `#${i}`);
      }
    });
  });

  test('baseline: raw object creation (for comparison)', () => {
    measure(() => ({ flag: 'HOST', type: 'div', parent: null }));
  });
});

function noop() {}
