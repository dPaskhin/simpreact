// noinspection ES6UnusedImports
import * as SimpReact from '../../src/main/core';
import * as SimpReactHooks from '../../src/main/hooks';
import { Game } from './components/tic-tac-toe';
import { Todo } from './components/todo';

const Page = {
  TIC_TAC_TOE: 'TIC_TAC_TOE',
  TODO: 'TODO',
};

export const App = () => {
  const pageRef = SimpReactHooks.useRef(Page.TODO);
  const rerender = SimpReactHooks.useRerender();

  const handleGoToStep = page => {
    pageRef.current = page;
    rerender();
  };

  return (
    <>
      <button onClick={() => handleGoToStep(Page.TIC_TAC_TOE)}>{'Tic Tac Toe'}</button>
      <button onClick={() => handleGoToStep(Page.TODO)}>{'Todo'}</button>

      <hr />

      {pageRef.current === Page.TIC_TAC_TOE && <Game />}
      {pageRef.current === Page.TODO && <Todo />}

      <hr />

      <div>{'Footer'}</div>
    </>
  );
};
