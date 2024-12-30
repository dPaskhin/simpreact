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
  const [page, setPage] = SimpReactHooks.useState(Page.REF);

  return (
    <>
      <button onClick={() => setPage(Page.TIC_TAC_TOE)}>{'Tic Tac Toe'}</button>
      <button onClick={() => setPage(Page.TODO)}>{'TODO'}</button>
      <button onClick={() => setPage(Page.REF)}>{'REF'}</button>

      <hr />

      {page === Page.TIC_TAC_TOE && <Game />}
      {page === Page.TODO && <Todo />}
      {page === Page.REF && <RefExample />}

      <div>{'Footer'}</div>
    </>
  );
};
