// noinspection ES6UnusedImports
import * as SimpReact from '../../../src/main';
import * as SimpReactHooks from '../../../src/main/hooks';

const InnerContext = SimpReact.createContext('inner_default');

const OuterContext = SimpReact.createContext('outer_default');

const EmptyContext = SimpReact.createContext('empty_default');

export const ContextExample = () => {
  const rerender = SimpReactHooks.useRerender();
  const count = SimpReactHooks.useRef(0).current++;

  // return (
  //   <>
  //     <OuterContext.Provider value={'outer for inner consumer caught ' + count}>
  //       <InnerConsumer />
  //     </OuterContext.Provider>
  //
  //     <button onClick={() => rerender()}>{'click me'}</button>
  //   </>
  // );

  // return (
  //   <InnerContext.Provider value={'inner caught ' + count}>
  //     <OuterContext.Provider value={'outer caught ' + count}>
  //       <Inner />
  //
  //       <button onClick={() => rerender()}>{'click me'}</button>
  //     </OuterContext.Provider>
  //   </InnerContext.Provider>
  // );

  return (
    <OuterContext.Provider value={'outer skipped'}>
      <OuterContext.Provider value={'outer caught ' + count}>
        <InnerContext.Provider value={'inner skipped'}>
          <InnerContext.Provider value={'inner caught ' + count}>
            <Inner />

            <OuterContext.Provider value={'outer for inner consumer caught ' + count}>
              <InnerConsumer />
            </OuterContext.Provider>

            <button onClick={() => rerender()}>{'click me'}</button>
          </InnerContext.Provider>
        </InnerContext.Provider>
      </OuterContext.Provider>
    </OuterContext.Provider>
  );
};

const Inner = () => {
  const outerValue = SimpReactHooks.useContext(OuterContext);
  const innerValue = SimpReactHooks.useContext(InnerContext);
  const emptyValue = SimpReactHooks.useContext(EmptyContext);

  return (
    <>
      <div>{'outerValue: ' + outerValue}</div>
      <div>{'innerValue: ' + innerValue}</div>
      <div>{'emptyValue: ' + emptyValue}</div>
    </>
  );
};

const InnerConsumer = () => {
  return <OuterContext.Consumer>{value => <div>{'outerValue: ' + value}</div>}</OuterContext.Consumer>;
};
