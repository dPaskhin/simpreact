// noinspection ES6UnusedImports
import * as SimpReact from '../src/main';
import * as SimpReactHooks from '../src/main/hooks';
import { Game } from './components/tic-tac-toe';
import { Todo } from './components/todo';
import { RefExample } from './components/ref';

const Page = {
  TIC_TAC_TOE: 'TIC_TAC_TOE',
  TODO: 'TODO',
  REF: 'REF',
};

export const App = () => {
  const pageRef = SimpReactHooks.useRef(Page.TIC_TAC_TOE);
  const rerender = SimpReactHooks.useRerender();

  const handleGoToStep = page => {
    pageRef.current = page;
    rerender();
  };

  return (
    <>
      <button onClick={() => handleGoToStep(Page.TIC_TAC_TOE)}>{'Tic Tac Toe'}</button>
      <button onClick={() => handleGoToStep(Page.TODO)}>{'TODO'}</button>
      <button onClick={() => handleGoToStep(Page.REF)}>{'REF'}</button>

      <hr />

      {pageRef.current === Page.TIC_TAC_TOE && <Game />}
      {pageRef.current === Page.TODO && <Todo />}
      {pageRef.current === Page.REF && <RefExample />}

      <div>{'Footer'}</div>
    </>
  );
};
