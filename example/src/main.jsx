/** @jsxImportSource SimpReact */
// noinspection ES6UnusedImports
import * as SimpReact from '../../src/main/core';
import { createRoot } from '../../src/main/dom';
import { App } from './App.jsx';
// import { observeMutations } from '../observeDomMutations.js';

// observeMutations();

const root = createRoot(document.getElementById('root'));

// root.render(createElement('div', null, 'Hello World!'));
// root.render(
//   <div
//     className={'sub'}
//     key={'1'}
//   >
//     Hello jsx!!!
//   </div>
// );
root.render(<App />);
