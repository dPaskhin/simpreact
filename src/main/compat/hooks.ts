import * as SimpReactHooks from '@simpreact/hooks';
import * as SimpReactShared from '@simpreact/shared';

export function useSyncExternalStore<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  const rerender = SimpReactHooks.useRerender();
  const lastSnapshotRef = SimpReactHooks.useRef(getSnapshot());

  SimpReactHooks.useEffect(() => {
    function checkForUpdates() {
      const nextSnapshot = getSnapshot();
      if (!Object.is(lastSnapshotRef.current, nextSnapshot)) {
        lastSnapshotRef.current = nextSnapshot;
        rerender();
      }
    }

    const unsubscribe = subscribe(checkForUpdates);

    checkForUpdates();

    return unsubscribe;
  }, [subscribe, getSnapshot]);

  return lastSnapshotRef.current;
}

export function useReducer<R extends (state: any, action: any) => any, I>(
  reducer: R,
  initializerArg: I,
  initializer?: (arg: I) => ReturnType<R>
): [ReturnType<R>, (action: Parameters<R>[1]) => void] {
  const rerender = SimpReactHooks.useRerender();
  const reducerRef = SimpReactHooks.useRef(reducer);

  reducerRef.current = reducer;

  const stateRef = SimpReactHooks.useRef<[ReturnType<R>, (action: Parameters<R>[1]) => void]>([
    initializer ? initializer(initializerArg) : (initializerArg as unknown as ReturnType<R>),
    function dispatch(action: Parameters<R>[1]) {
      const newState = reducerRef.current(stateRef.current[0], action);

      if (Object.is(newState, stateRef.current[0])) {
        return;
      }

      stateRef.current[0] = newState;
      rerender();
    },
  ]);

  return stateRef.current;
}

let globalId = 0;

export function useId(prefix: string = 'id'): string {
  const idRef = SimpReactHooks.useRef('');

  if (idRef.current === '') {
    globalId += 1;
    idRef.current = `${prefix}-${globalId}`;
  }

  return idRef.current;
}

export function useMemo<T>(factory: () => T, deps: SimpReactHooks.DependencyList): T {
  const ref = SimpReactHooks.useRef<{ value: T; deps: SimpReactHooks.DependencyList }>({
    deps: undefined!,
    value: undefined!,
  });

  if (!SimpReactShared.shallowEqual(ref.current.deps, deps)) {
    ref.current.value = factory();
    ref.current.deps = deps;
  }

  return ref.current.value;
}

export function useCallback<T>(cb: T, deps: SimpReactHooks.DependencyList): T {
  return useMemo(() => cb, deps);
}

export const useState = SimpReactHooks.useState;
export const useEffect = SimpReactHooks.useEffect;
export const useLayoutEffect = SimpReactHooks.useEffect;
export const useInsertionEffect = SimpReactHooks.useEffect;
export const useRef = SimpReactHooks.useRef;

export default {
  useSyncExternalStore,
  useReducer,
  useId,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useRef,
};
