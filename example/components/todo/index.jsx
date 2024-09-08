// noinspection ES6UnusedImports
import * as SimpReact from '../../../src/main';
import * as SimpReactHooks from '../../../src/main/hooks';

export const Todo = () => {
  const [state, setState] = SimpReactHooks.useState([
    { name: '1', done: true },
    { name: '2', done: false },
  ]);
  const [value, setValue] = SimpReactHooks.useState('123');

  const handleTodoToggle = SimpReactHooks.useCallback(index => {
    setState(prevState => {
      const copy = prevState.slice();
      const todo = prevState.find((_, i) => index === i);

      todo.done = !todo.done;

      return copy;
    });
  }, []);

  const handleTodoDelete = SimpReactHooks.useCallback(index => {
    setState(prevState => prevState.filter((_, i) => i !== index));
  }, []);

  return (
    <div>
      <input id={'123'} onInput={event => setValue(event.currentTarget.value)} ariaLabel={'123'} data={'11'} />

      <button
        onClick={() => {
          setState(prevState => [...prevState, { name: value, done: false }]);
        }}
      >
        {'Submit'}
      </button>

      {state.map((item, index) => {
        return (
          <div>
            {item.name}

            <button onClick={() => handleTodoToggle(index)}>{item.done ? 'Done' : 'To do'}</button>
            {item.done && <button onClick={() => handleTodoDelete(index)}>{'Delete'}</button>}
          </div>
        );
      })}
    </div>
  );
};
