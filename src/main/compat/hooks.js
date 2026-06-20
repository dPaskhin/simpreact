import { createUseCatch, createUseEffect, createUseRef, createUseRerender, createUseState } from '@simpreact/hooks';
import { shallowEqual } from '@simpreact/shared';
import { renderRuntime } from './renderRuntime.js';

export const useRerender = createUseRerender(renderRuntime);
export const useState = createUseState(renderRuntime);
export const useEffect = createUseEffect(renderRuntime);
export const useLayoutEffect = createUseEffect(renderRuntime);
export const useInsertionEffect = createUseEffect(renderRuntime);
export const useRef = createUseRef(renderRuntime);
export const useCatch = createUseCatch(renderRuntime);

export function useSyncExternalStore(subscribe, getSnapshot) {
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

export function useReducer(reducer, initializerArg, initializer) {
  const rerender = useRerender();
  const reducerRef = useRef(reducer);

  reducerRef.current = reducer;

  const stateRef = useRef([
    initializer ? initializer(initializerArg) : initializerArg,
    function dispatch(action) {
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

export function useId(prefix = 'id') {
  const idRef = useRef('');

  if (idRef.current === '') {
    globalId += 1;
    idRef.current = `${prefix}-${globalId}`;
  }

  return idRef.current;
}

export function useMemo(factory, deps) {
  const ref = useRef({
    deps: undefined,
    value: undefined,
  });

  if (!shallowEqual(ref.current.deps, deps)) {
    ref.current.value = factory();
    ref.current.deps = deps;
  }

  return ref.current.value;
}

export function useCallback(cb, deps) {
  return useMemo(() => cb, deps);
}

export function useImperativeHandle(ref, init, deps) {
  useLayoutEffect(() => {
    if (typeof ref === 'function') {
      ref(init());
    } else if (ref != null) {
      ref.current = init();
    }
  }, deps);
}

export function useDebugValue(_value, _format) {}

export default {
  useSyncExternalStore,
  useReducer,
  useId,
  useMemo,
  useCallback,
  useImperativeHandle,
  useDebugValue,
  useState,
  useEffect,
  useLayoutEffect,
  useInsertionEffect,
  useRef,
  useRerender,
  useCatch,
};
