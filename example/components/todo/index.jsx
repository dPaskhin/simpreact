// noinspection ES6UnusedImports
import * as SimpReact from '../../../src/main';
import * as SimpReactHooks from '../../../src/main/hooks';
import { EventBus } from '../../../src/main/EventBus';

const todosManager = {
  eventBus: new EventBus(),

  list: [
    { name: '1', done: true },
    { name: '2', done: false },
  ],

  set(list) {
    todosManager.list = list;
    todosManager.eventBus.publish();
  },

  subscribe(listener) {
    return todosManager.eventBus.subscribe(listener);
  },
};

export const Todo = () => {
  const rerender = SimpReactHooks.useRerender();

  const valueRef = SimpReactHooks.useRef('');

  SimpReactHooks.useEffect(() => {
    return todosManager.subscribe(rerender);
  }, []);

  const handleTodoToggle = index => {
    const todo = todosManager.list.find((_, i) => index === i);

    todo.done = !todo.done;

    todosManager.set(todosManager.list);
  };

  const handleTodoDelete = index => {
    todosManager.list.splice(index, 1);
    todosManager.set(todosManager.list);
  };

  return (
    <div>
      <input
        id={'123'}
        onInput={event => (valueRef.current = event.currentTarget.value)}
        ariaLabel={'123'}
        data={'11'}
      />

      <button
        onClick={() => {
          todosManager.list.push({ name: valueRef.current, done: false });
          todosManager.set(todosManager.list);
        }}
      >
        {'Submit'}
      </button>

      {todosManager.list.map((item, index) => {
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
