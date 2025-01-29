// noinspection ES6UnusedImports
import * as SimpReact from '../src/main';
import * as SimpReactHooks from '../src/main/hooks';
// import { observeMutations } from './utils';
// import { ContextExampleNew } from './components/context/index-new';
import { Game } from './components/tic-tac-toe';
import { Todo } from './components/todo';
import { RefExample } from './components/ref';
import { ContextExample } from './components/context';

// observeMutations();

const Page = {
  TIC_TAC_TOE: 'TIC_TAC_TOE',
  TODO: 'TODO',
  REF: 'REF',
  CONTEXT: 'CONTEXT',
};

export const App = () => {
  const pageRef = SimpReactHooks.useRef(Page.CONTEXT);
  const rerender = SimpReactHooks.useRerender();

  const handleGoToStep = page => {
    pageRef.current = page;
    rerender();
  };

  return (
    <>
      <button onClick={() => handleGoToStep(Page.TIC_TAC_TOE)}>{'Tic Tac Toe'}</button>
      <button onClick={() => handleGoToStep(Page.TODO)}>{'Todo'}</button>
      <button onClick={() => handleGoToStep(Page.REF)}>{'Ref'}</button>
      <button onClick={() => handleGoToStep(Page.CONTEXT)}>{'Context'}</button>

      <hr />

      {pageRef.current === Page.TIC_TAC_TOE && <Game />}
      {pageRef.current === Page.TODO && <Todo />}
      {pageRef.current === Page.REF && <RefExample />}
      {pageRef.current === Page.CONTEXT && <ContextExample />}

      <hr />

      <div>{'Footer'}</div>
    </>
  );
};
