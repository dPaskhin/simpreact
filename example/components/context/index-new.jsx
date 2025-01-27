// noinspection ES6UnusedImports
import * as SimpReact from '../../../src/main';
import { createContext } from '../../../src/main';
import * as SimpReactHooks from '../../../src/main/hooks';

const SimpleContext = createContext('0');

export function ContextExampleNew() {
  return (
    <div>
      <SimpleContext.Provider value={'10'}>
        {/*<CustomInner />*/}
        <Inner />
      </SimpleContext.Provider>
    </div>
  );
}

const Inner = (props, context) => {
  const rerender = SimpReactHooks.useRerender();
  const count = SimpReactHooks.useRef(0).current++;

  if (count % 2 !== 0) {
    return (
      <SimpleContext.Consumer>
        {value => (
          <div>
            <button onClick={rerender}>{value}</button>
          </div>
        )}
      </SimpleContext.Consumer>
    );
  }

  return (
    <SimpleContext.Provider value={'11'}>
      <SimpleContext.Consumer>
        {value => (
          <div>
            <button onClick={rerender}>{value}</button>
          </div>
        )}
      </SimpleContext.Consumer>
    </SimpleContext.Provider>
  );
};

const CustomInner = () => {
  const rerender = SimpReactHooks.useRerender();
  const count = SimpReactHooks.useRef(0).current++;

  if (count % 2 !== 0) {
    return (
      <SimpleContext.Consumer>
        {value => (
          <div>
            <button onClick={rerender}>{value}</button>
          </div>
        )}
      </SimpleContext.Consumer>
    );
  }

  return (
    <SimpleContext.Consumer>
      {value => (
        <div>
          <SimpleContext.Provider value={'inside'}>
            <button onClick={rerender}>{value}</button>
          </SimpleContext.Provider>
        </div>
      )}
    </SimpleContext.Consumer>
  );
};
