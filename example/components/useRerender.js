// noinspection ES6UnusedImports
import * as SimpReact from '../../src/main';
import * as SimpReactHooks from '../../src/main/hooks';

export function useRerender() {
  const [, setState] = SimpReactHooks.useState(0);

  return () => setState(prevState => prevState + 1);
}
