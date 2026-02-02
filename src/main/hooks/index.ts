import {
  rerender as _rerender,
  lifecycleEventBus,
  type RefObject,
  type SimpElement,
  type SimpRenderRuntime,
} from '@simpreact/internal';
import type { Maybe, Nullable } from '@simpreact/shared';
import { callOrGet, shallowEqual } from '@simpreact/shared';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

type EffectHookState = {
  effect: Effect;
  cleanup: Nullable<Cleanup>;
  deps: Nullable<DependencyList>;
};

type RerenderHookState = () => void;

type RefHookState<T = unknown> = {
  current: T;
};

type StateHookState<S = any> = [S, Dispatch<SetStateAction<S>>];

type HookState = EffectHookState | RerenderHookState | RefHookState | StateHookState;

interface HooksSimpRenderRuntime extends SimpRenderRuntime {
  currentIndex: number;
  // In runtime this is a nullable variable.
  currentElement: HooksSimpElement;
}

interface HooksSimpElement extends SimpElement {
  store: SimpElement['store'] &
    Nullable<{
      hookStates: Nullable<HookState[]>;
      effectsHookStates: Nullable<EffectHookState[]>;
      catchHandlers: Nullable<Array<(error: any) => void>>;
    }>;
}

lifecycleEventBus.subscribe(event => {
  const renderRuntime = event.renderRuntime as HooksSimpRenderRuntime;

  if (event.type === 'beforeRender') {
    renderRuntime.currentIndex = 0;
    renderRuntime.currentElement = event.element as HooksSimpElement;

    if (renderRuntime.currentElement.store?.catchHandlers) {
      renderRuntime.currentElement.store.catchHandlers = null;
    }
    if (renderRuntime.currentElement.store?.effectsHookStates) {
      renderRuntime.currentElement.store.effectsHookStates = null;
    }
  }
  if (event.type === 'afterRender' || event.type === 'errored') {
    renderRuntime.currentElement = null!;
    renderRuntime.currentIndex = 0;
  }
  if (event.type === 'mounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = null;

      for (const state of effects) {
        state.cleanup = state.effect() || null;
      }
    }
  }
  if (event.type === 'updated') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = null;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || null;
      }
    }
  }
  if (event.type === 'unmounted') {
    const element = event.element as HooksSimpElement;
    if (element.store?.hookStates) {
      const hookStates = element.store.hookStates;
      element.store.hookStates = null;

      for (const state of hookStates) {
        if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
          state.cleanup();
        }
      }
    }
  }
  if (event.type === 'errored' && !event.handled) {
    let element = event.element as Nullable<HooksSimpElement>;
    let curError = event.error;
    let catchers: Maybe<Array<(error: any) => void>> = null;

    while (element) {
      if (!(catchers = element.store?.catchHandlers)) {
        element = element.parent as Nullable<HooksSimpElement>;
        continue;
      }

      try {
        for (let i = 0; i < catchers.length; i++) {
          catchers[i]!(curError);
        }
        curError = null;
        event.handled = true;
        break;
      } catch (error) {
        element = element.parent as Nullable<HooksSimpElement>;
        curError = error;
      }
    }
  }
});

export interface UseRef {
  <T>(initialValue: T): RefObject<T>;
  <T>(initialValue: T | null): RefObject<T | null>;
  <T = undefined>(initialValue?: T): RefObject<T | undefined>;
}
export function createUseRef(renderRuntime: SimpRenderRuntime): UseRef {
  return initialValue => {
    const hookStates = getOrCreateHookStates((renderRuntime as HooksSimpRenderRuntime).currentElement);

    if (!hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex]) {
      hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex] = { current: initialValue };
    }

    return hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex++] as RefObject<typeof initialValue>;
  };
}

export function createUseRerender(renderRuntime: SimpRenderRuntime): () => RerenderHookState {
  return () => {
    const hookStates = getOrCreateHookStates((renderRuntime as HooksSimpRenderRuntime).currentElement);

    if (!hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex]) {
      const elementStore = (renderRuntime as HooksSimpRenderRuntime).currentElement.store;
      hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex] = function rerender() {
        _rerender(elementStore!.latestElement!, renderRuntime);
      };
    }

    return hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex++] as RerenderHookState;
  };
}

export interface UseState {
  <S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  <S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  <S = undefined>(
    initialState: undefined | (() => undefined)
  ): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
}
export function createUseState(renderRuntime: SimpRenderRuntime): UseState {
  return (initialState => {
    const hookStates = getOrCreateHookStates((renderRuntime as HooksSimpRenderRuntime).currentElement);

    if (!hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex]) {
      const elementStore = (renderRuntime as HooksSimpRenderRuntime).currentElement.store;
      const state: StateHookState = (hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex] = [
        undefined!,
        undefined!,
      ]);

      state[0] = callOrGet(initialState)!;
      state[1] = function dispatch(action) {
        const nextValue = callOrGet(action, state[0]);

        if (Object.is(state[0], nextValue)) {
          return;
        }

        state[0] = nextValue;
        _rerender(elementStore!.latestElement!, renderRuntime);
      };
    }

    return hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex++];
  }) as UseState;
}

export function createUseEffect(renderRuntime: SimpRenderRuntime): (effect: Effect, deps?: DependencyList) => void {
  return (effect, deps) => {
    const hookStates = getOrCreateHookStates((renderRuntime as HooksSimpRenderRuntime).currentElement);

    let state = hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex] as EffectHookState | undefined;

    if (!state) {
      state = hookStates[(renderRuntime as HooksSimpRenderRuntime).currentIndex] = {
        effect,
        deps: null,
        cleanup: null,
      };
    }

    if (!shallowEqual(deps, state.deps)) {
      state.effect = effect;
      state.deps = deps || null;
      getOrCreateEffectHookStates((renderRuntime as HooksSimpRenderRuntime).currentElement).push(state);
    }

    (renderRuntime as HooksSimpRenderRuntime).currentIndex++;
  };
}

export function createUseCatch(renderRuntime: SimpRenderRuntime): (cb: (error: any) => void) => void {
  return cb => {
    const currentElement = (renderRuntime as HooksSimpRenderRuntime).currentElement;

    if (!currentElement.store!.catchHandlers) {
      currentElement.store!.catchHandlers = [];
    }

    currentElement.store!.catchHandlers!.push(cb);
  };
}

function getOrCreateHookStates(element: HooksSimpElement) {
  if (!element.store!.hookStates) {
    element.store!.hookStates = [];
  }

  return element.store!.hookStates;
}

function getOrCreateEffectHookStates(element: HooksSimpElement) {
  if (!element.store!.effectsHookStates) {
    element.store!.effectsHookStates = [];
  }

  return element.store!.effectsHookStates;
}

export default {
  createUseRef,
  createUseRerender,
  createUseState,
  createUseEffect,
  createUseCatch,
};

export type * from './public.js';
