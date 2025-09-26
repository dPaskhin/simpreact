import type { RefObject, SimpElement } from '@simpreact/internal';
import { lifecycleEventBus, rerender as _rerender } from '@simpreact/internal';
import type { Maybe, Nullable } from '@simpreact/shared';
import { callOrGet, noop } from '@simpreact/shared';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

type EffectHookState = {
  effect: Effect;
  cleanup?: Cleanup | undefined;
  deps?: DependencyList | undefined;
};

type RerenderHookState = () => void;

type RefHookState<T = unknown> = {
  current: T;
};

type StateHookState<S = any> = [S, Dispatch<SetStateAction<S>>];

type HookState = EffectHookState | RerenderHookState | RefHookState | StateHookState;

interface HooksSimpElement extends SimpElement {
  store?: SimpElement['store'] & {
    hookStates?: HookState[];
    effectsHookStates?: EffectHookState[];
    catchHandlers?: Array<(error: any) => void>;
  };
}

let currentIndex = 0;
// In runtime this is a nullable variable.
let currentElement: HooksSimpElement;

lifecycleEventBus.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentElement = event.element as HooksSimpElement;

    if (currentElement.store?.catchHandlers) {
      currentElement.store.catchHandlers = undefined;
    }
    if (currentElement.store?.effectsHookStates) {
      currentElement.store.effectsHookStates = undefined;
    }
  }
  if (event.type === 'afterRender' || event.type === 'errored') {
    currentElement = null!;
    currentIndex = 0;
  }
  if (event.type === 'mounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = undefined;

      for (const state of effects) {
        state.cleanup = state.effect() || undefined;
      }
    }
  }
  if (event.type === 'updated') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = undefined;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || undefined;
      }
    }
  }
  if (event.type === 'unmounted') {
    const element = event.element as HooksSimpElement;
    if (element.store?.hookStates) {
      const hookStates = element.store.hookStates;
      element.store.hookStates = undefined;

      for (const state of hookStates) {
        if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
          state.cleanup();
        }
      }
    }
  }
  if (event.type === 'errored') {
    function handleError(element: Nullable<HooksSimpElement>, error: any) {
      element = findElementWithCatchHandlers(element);

      if (!element) {
        throw new Error('Error occurred during rendering a component', { cause: error });
      }

      try {
        for (const state of element.store!.catchHandlers!) {
          state(error);
        }
      } catch (error) {
        handleError(element.parent, error);
      }
    }

    handleError(event.element, event.error);
  }
});

function findElementWithCatchHandlers(element: Nullable<HooksSimpElement>): Nullable<HooksSimpElement> {
  let temp: Nullable<HooksSimpElement> = element;

  while (temp != null) {
    if (temp.store?.catchHandlers) {
      return temp;
    }

    temp = temp.parent;
  }

  return null;
}

export function useRef<T>(initialValue: T): RefObject<T>;
export function useRef<T>(initialValue: T | null): RefObject<T | null>;
export function useRef<T>(initialValue: T | undefined): RefObject<T | undefined>;
export function useRef<T>(initialValue: Maybe<T>): RefObject<Maybe<T>> {
  const hookStates = getOrCreateHookStates(currentElement);

  if (!hookStates[currentIndex]) {
    hookStates[currentIndex] = { current: initialValue };
  }

  return hookStates[currentIndex++] as RefObject<T>;
}

export function useRerender(): () => void {
  const hookStates = getOrCreateHookStates(currentElement);

  if (!hookStates[currentIndex]) {
    const elementStore = currentElement.store;
    hookStates[currentIndex] = function rerender() {
      elementStore!.forceRender = true;
      _rerender(elementStore!.latestElement!);
    };
  }

  return hookStates[currentIndex++] as RerenderHookState;
}

export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
export function useState<S>(initialState?: S | (() => S)) {
  const hookStates = getOrCreateHookStates(currentElement);

  if (!hookStates[currentIndex]) {
    const elementStore = currentElement.store;
    const state: StateHookState<S> = (hookStates[currentIndex] = [undefined!, undefined!]);

    state[0] = callOrGet(initialState)!;
    state[1] = function dispatch(action) {
      const nextValue = callOrGet(action, state[0]);

      if (Object.is(state[0], nextValue)) {
        return;
      }

      state[0] = nextValue;
      elementStore!.forceRender = true;
      _rerender(elementStore!.latestElement!);
    };
  }

  return hookStates[currentIndex++] as StateHookState<S>;
}

export function useEffect(effect: Effect, deps?: DependencyList): void {
  const hookStates = getOrCreateHookStates(currentElement);

  let state = hookStates[currentIndex] as EffectHookState | undefined;

  if (!state) {
    state = hookStates[currentIndex] = { effect };
  }

  if (!areDepsEqual(deps, state.deps)) {
    state.effect = effect;
    state.deps = deps;
    getOrCreateEffectHookStates(currentElement).push(state);
  }

  currentIndex++;
}

export function useMounted(effect: Effect): void {
  const hookStates = getOrCreateHookStates(currentElement);

  if (!hookStates[currentIndex]) {
    hookStates[currentIndex] = { effect };
    getOrCreateEffectHookStates(currentElement).push(hookStates[currentIndex] as EffectHookState);
  }

  currentIndex++;
}

export function useUnmounted(cleanup: Cleanup): void {
  const hookStates = getOrCreateHookStates(currentElement);

  if (!hookStates[currentIndex]) {
    hookStates[currentIndex] = { cleanup, effect: noop };
  }

  currentIndex++;
}

export function useCatch(cb: (error: any) => void): void {
  if (!currentElement.store) {
    currentElement.store = {};
  }

  if (!currentElement.store.catchHandlers) {
    currentElement.store.catchHandlers = [];
  }

  currentElement.store.catchHandlers.push(cb);
}

export function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean {
  if (nextDeps == null || prevDeps == null || nextDeps.length !== prevDeps.length) {
    return false;
  }
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(nextDeps[i], prevDeps[i])) {
      return false;
    }
  }
  return true;
}

function getOrCreateHookStates(element: HooksSimpElement) {
  if (!element.store) {
    element.store = {};
  }

  if (!element.store.hookStates) {
    element.store.hookStates = [];
  }

  return element.store.hookStates;
}

function getOrCreateEffectHookStates(element: HooksSimpElement) {
  if (!element.store) {
    element.store = {};
  }

  if (!element.store.effectsHookStates) {
    element.store.effectsHookStates = [];
  }

  return element.store.effectsHookStates;
}

export default {
  useRef,
  useRerender,
  useState,
  useEffect,
  useMounted,
  useUnmounted,
  useCatch,
  areDepsEqual,
};

export type * from './public.js';
