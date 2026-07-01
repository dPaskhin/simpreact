import {
  rerender as _rerender,
  isFC,
  type RefObject,
  registerLifecyclePlugin,
  type SimpElement,
  type SimpRenderRuntime,
} from '@simpreact/internal';
import {
  callOrGet,
  type DependencyList,
  type Effect,
  type EffectState,
  type Nullable,
  shallowEqual,
} from '@simpreact/shared';

export type Dispatch<A> = (value: A) => void;
export type SetStateAction<S> = S | ((prevState: S) => S);

type RerenderHookState = () => void;

type RefHookState<T = unknown> = {
  current: T;
};

type StateHookState<S = any> = [S, Dispatch<SetStateAction<S>>];

type HookState = EffectState | RerenderHookState | RefHookState | StateHookState;

interface HooksSpecificStore {
  hooksIndex: number;
  expectedHooksCount: Nullable<number>;
  hookStates: Nullable<HookState[]>;
  effectsHookStates: Nullable<EffectState[]>;
  catchHandlers: Nullable<Array<(error: any) => void>>;
}

const hooksSpecificStoreByElement = new WeakMap<SimpElement, HooksSpecificStore>();
// TODO: delete it
const currentFCByRuntime = new WeakMap<SimpRenderRuntime, SimpElement | null>();

function getHooksSpecificStore(element: SimpElement): HooksSpecificStore {
  let hooksSpecificStore = hooksSpecificStoreByElement.get(element);
  if (!hooksSpecificStore) {
    hooksSpecificStore = {
      hooksIndex: 0,
      expectedHooksCount: null,
      hookStates: null,
      effectsHookStates: null,
      catchHandlers: null,
    };
    hooksSpecificStoreByElement.set(element, hooksSpecificStore);
  }
  return hooksSpecificStore;
}

registerLifecyclePlugin(bus => {
  bus.subscribe(event => {
    if (event.type === 'beforeRender') {
      currentFCByRuntime.set(event.renderRuntime, event.element);
    } else if (event.type === 'afterRender' || event.type === 'errored') {
      currentFCByRuntime.set(event.renderRuntime, null);
    }

    if (!isFC(event.element)) {
      return;
    }

    const store = getHooksSpecificStore(event.element);

    switch (event.type) {
      case 'beforeRender': {
        store.hooksIndex = 0;
        store.catchHandlers = null;
        store.effectsHookStates = null;
        break;
      }
      case 'afterRender': {
        if (store.expectedHooksCount !== null && store.hooksIndex !== store.expectedHooksCount) {
          throw new Error(
            `Hooks called in a different order than the previous render. Expected ${store.expectedHooksCount}, got ${store.hooksIndex}.`
          );
        }
        store.expectedHooksCount = store.hooksIndex;
        break;
      }
      case 'mounted': {
        if (!store.effectsHookStates) {
          break;
        }
        const effects = store.effectsHookStates;
        store.effectsHookStates = null;

        for (const state of effects) {
          state.cleanup = state.effect() || null;
        }
        break;
      }
      case 'updated': {
        if (!store.effectsHookStates) {
          break;
        }
        const effects = store.effectsHookStates;
        store.effectsHookStates = null;

        for (const state of effects) {
          if (typeof state.cleanup === 'function') {
            state.cleanup();
          }
          state.cleanup = state.effect() || null;
        }
        break;
      }
      case 'unmounted': {
        if (!store.hookStates) {
          break;
        }
        const hookStates = store.hookStates;
        store.hookStates = null;

        for (const state of hookStates) {
          if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
            state.cleanup();
          }
        }
        break;
      }
      case 'errored': {
        store.hooksIndex = 0;

        if (event.handled) {
          break;
        }

        let element: Nullable<SimpElement> = event.element;
        let curError = event.error;
        let catchers: Nullable<Array<(error: any) => void>> = null;

        while (element) {
          if (!isFC(element)) {
            element = element.parent;
            continue;
          }

          const ancestorStore = getHooksSpecificStore(element);
          catchers = ancestorStore.catchHandlers;

          if (!catchers) {
            element = element.parent;
            continue;
          }

          try {
            for (let i = 0; i < catchers.length; i++) {
              catchers[i]!(curError);
            }
            event.handled = true;
            break;
          } catch (error) {
            element = element.parent;
            curError = error;
          }
        }
        break;
      }
    }
  });
});

export interface UseRef {
  <T>(initialValue: T): RefObject<T>;
  <T>(initialValue: T | null): RefObject<T | null>;
  <T = undefined>(initialValue?: T): RefObject<T | undefined>;
}
export function createUseRef(renderRuntime: SimpRenderRuntime): UseRef {
  return initialValue => {
    const store = getHooksSpecificStore(currentFCByRuntime.get(renderRuntime)!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      hookStates[store.hooksIndex] = { current: initialValue };
    }

    return hookStates[store.hooksIndex++] as RefObject<typeof initialValue>;
  };
}

export function createUseRerender(renderRuntime: SimpRenderRuntime): () => RerenderHookState {
  return () => {
    const store = getHooksSpecificStore(currentFCByRuntime.get(renderRuntime)!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      const element = currentFCByRuntime.get(renderRuntime)!;
      hookStates[store.hooksIndex] = function rerender() {
        _rerender(element, renderRuntime);
      };
    }

    return hookStates[store.hooksIndex++] as RerenderHookState;
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
    const store = getHooksSpecificStore(currentFCByRuntime.get(renderRuntime)!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      const element = currentFCByRuntime.get(renderRuntime)!;
      const state: StateHookState = (hookStates[store.hooksIndex] = [undefined!, undefined!]);

      state[0] = callOrGet(initialState)!;
      state[1] = function dispatch(action) {
        const nextValue = callOrGet(action, state[0]);

        if (Object.is(state[0], nextValue)) {
          return;
        }

        state[0] = nextValue;
        _rerender(element, renderRuntime);
      };
    }

    return hookStates[store.hooksIndex++];
  }) as UseState;
}

export function createUseEffect(renderRuntime: SimpRenderRuntime): (effect: Effect, deps?: DependencyList) => void {
  return (effect, deps) => {
    const store = getHooksSpecificStore(currentFCByRuntime.get(renderRuntime)!);
    const hookStates = getOrCreateHookStates(store);

    let state = hookStates[store.hooksIndex] as EffectState | undefined;

    if (!state) {
      state = hookStates[store.hooksIndex] = {
        effect,
        deps: null,
        cleanup: null,
      };
    }

    if (!shallowEqual(deps, state.deps)) {
      state.effect = effect;
      state.deps = deps || null;
      getOrCreateEffectHookStates(store).push(state);
    }

    store.hooksIndex++;
  };
}

export function createUseCatch(renderRuntime: SimpRenderRuntime): (cb: (error: any) => void) => void {
  return cb => {
    const store = getHooksSpecificStore(currentFCByRuntime.get(renderRuntime)!);

    if (!store.catchHandlers) {
      store.catchHandlers = [];
    }

    store.catchHandlers!.push(cb);
    store.hooksIndex++;
  };
}

export function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean {
  return shallowEqual(nextDeps, prevDeps);
}

function getOrCreateHookStates(store: HooksSpecificStore) {
  if (!store.hookStates) {
    store.hookStates = [];
  }

  return store.hookStates;
}

function getOrCreateEffectHookStates(store: HooksSpecificStore) {
  if (!store.effectsHookStates) {
    store.effectsHookStates = [];
  }

  return store.effectsHookStates;
}

export default {
  createUseRef,
  createUseRerender,
  createUseState,
  createUseEffect,
  createUseCatch,
  areDepsEqual,
};

export type * from './public.js';
