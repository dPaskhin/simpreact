// noinspection ES6UnusedImports
import * as SimpReact from '../../../src/main';
import * as SimpReactHooks from '../../../src/main/hooks';
import { useRerender } from '../useRerender';

export const RefExample = () => {
  const inputRef = SimpReactHooks.useRef(null);
  const customInputRef = SimpReactHooks.useRef(null);
  const rerender = useRerender();

  return (
    <div>
      <h1>useRef Example</h1>
      <input ref={inputRef} type="text" placeholder="inner input" />
      <div
        ref={instance => {
          console.count('body');
          console.log(instance);

          return () => {
            console.count('cleanup');
          };
        }}
      >
        {'Div with functional ref'}
      </div>
      <Input ref={customInputRef} />

      <button
        onClick={() => {
          inputRef.current.focus();
        }}
      >
        {'Focus inner input'}
      </button>
      <button
        onClick={() => {
          customInputRef.current.focus();
        }}
      >
        {'Focus custom input'}
      </button>
      <button onClick={rerender}>{'Rerender'}</button>
    </div>
  );
};

const Input = ({ ref }) => {
  return <input ref={ref} type="text" placeholder="custom input" />;
};
