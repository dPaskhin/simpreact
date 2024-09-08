import * as SimpReact from '../src/main';
import * as SimpReactDom from '../src/main/dom';
import { App } from './App';

SimpReactDom.render(SimpReact.createElement(App), document.getElementById('root'));
