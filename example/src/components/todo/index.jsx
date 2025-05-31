// noinspection ES6UnusedImports
import * as SimpReact from '../../../../src/main/core';
import * as SimpReactHooks from '../../../../src/main/hooks';
import { EventBus } from '../../../../src/main/shared';

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
  const re = SimpReactHooks.useRef();

  SimpReactHooks.useEffect(() => {
    return todosManager.subscribe(rerender);
  }, []);

  SimpReactHooks.useEffect(() => {
    console.log('mounted');

    // document.getElementById('123').value = '123';
    // document.getElementById('123').defaultValue = '123';

    return () => {
      console.log('unmounted');
    };
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
        defaultValue={'valueRef.current'}
        ref={re}
        // onInput={event => (valueRef.current = event.currentTarget.value)}
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
          // <div key={item.name}>
          <div>
            {item.name}

            <input />

            <button onClick={() => handleTodoToggle(index)}>{item.done ? 'Done' : 'To do'}</button>
            {item.done && <button onClick={() => handleTodoDelete(index)}>{'Delete'}</button>}
          </div>
        );
      })}
    </div>
  );
};
