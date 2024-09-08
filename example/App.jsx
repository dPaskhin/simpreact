// noinspection ES6UnusedImports
import * as SimpReact from '../src/main';
import * as SimpReactHooks from '../src/main/hooks';
import { Game } from './components/tic-tac-toe';
import { Todo } from './components/todo';

const Page = {
  TIC_TAC_TOE: 'TIC_TAC_TOE',
  TODO: 'TODO',
};

export const App = () => {
  const [page, setPage] = SimpReactHooks.useState(Page.TODO);

  return (
    <>
      <button onClick={() => setPage(Page.TIC_TAC_TOE)}>{'Tic Tac Toe'}</button>
      <button onClick={() => setPage(Page.TODO)}>{'TODO'}</button>

      <hr />

      {page === Page.TIC_TAC_TOE && <Game />}
      {page === Page.TODO && <Todo />}

      <div>{'Footer'}</div>
    </>
  );
};
