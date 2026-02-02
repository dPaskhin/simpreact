import {
  createUseCatch,
  createUseEffect,
  createUseRef,
  createUseRerender,
  createUseState,
  type DependencyList,
} from '@simpreact/hooks';
import * as SimpReactShared from '@simpreact/shared';
import { renderRuntime } from './renderRuntime.js';

export const useRerender = createUseRerender(renderRuntime);
export const useState = createUseState(renderRuntime);
export const useEffect = createUseEffect(renderRuntime);
export const useLayoutEffect = createUseEffect(renderRuntime);
export const useInsertionEffect = createUseEffect(renderRuntime);
export const useRef = createUseRef(renderRuntime);
export const useCatch = createUseCatch(renderRuntime);

export function useSyncExternalStore<T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T {
  const rerender = useRerender();
  const lastSnapshotRef = useRef(getSnapshot());

  useEffect(() => {
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
  const rerender = useRerender();
  const reducerRef = useRef(reducer);

  reducerRef.current = reducer;

  const stateRef = useRef<[ReturnType<R>, (action: Parameters<R>[1]) => void]>([
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
  const idRef = useRef('');

  if (idRef.current === '') {
    globalId += 1;
    idRef.current = `${prefix}-${globalId}`;
  }

  return idRef.current;
}

export function useMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{
    value: T;
    deps: DependencyList;
  }>({
    deps: undefined!,
    value: undefined!,
  });

  if (!SimpReactShared.shallowEqual(ref.current.deps, deps)) {
    ref.current.value = factory();
    ref.current.deps = deps;
  }

  return ref.current.value;
}

export function useCallback<T>(cb: T, deps: DependencyList): T {
  return useMemo(() => cb, deps);
}

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
