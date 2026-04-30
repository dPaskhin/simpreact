import {
  rerender as _rerender,
  lifecycleEventBus,
  type RefObject,
  SIMP_ELEMENT_FLAG_FC,
  type SimpElement,
  type SimpElementStore,
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
  hookStates: Nullable<HookState[]>;
  effectsHookStates: Nullable<EffectState[]>;
  catchHandlers: Nullable<Array<(error: any) => void>>;
}

const hooksSpecificStoreByElementStore = new WeakMap<SimpElementStore, HooksSpecificStore>();

function getHooksSpecificStore(store: SimpElementStore): HooksSpecificStore {
  let hooksSpecificStore = hooksSpecificStoreByElementStore.get(store);
  if (!hooksSpecificStore) {
    hooksSpecificStore = { hooksIndex: 0, hookStates: null, effectsHookStates: null, catchHandlers: null };
    hooksSpecificStoreByElementStore.set(store, hooksSpecificStore);
  }
  return hooksSpecificStore;
}

lifecycleEventBus.subscribe(event => {
  if ((event.element.flag & SIMP_ELEMENT_FLAG_FC) === 0) {
    return;
  }

  let store = getHooksSpecificStore(event.element.store!);

  switch (event.type) {
    case 'beforeRender': {
      store.hooksIndex = 0;
      store.catchHandlers = null;
      store.effectsHookStates = null;
      break;
    }
    case 'afterRender': {
      store.hooksIndex = 0;
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
        if ((element.flag & SIMP_ELEMENT_FLAG_FC) === 0) {
          element = element.parent;
          continue;
        }

        store = getHooksSpecificStore(element.store!);
        catchers = store.catchHandlers;

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
    const store = getHooksSpecificStore(renderRuntime.currentRenderingFCElement!.store!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      hookStates[store.hooksIndex] = { current: initialValue };
    }

    return hookStates[store.hooksIndex++] as RefObject<typeof initialValue>;
  };
}

export function createUseRerender(renderRuntime: SimpRenderRuntime): () => RerenderHookState {
  return () => {
    const store = getHooksSpecificStore(renderRuntime.currentRenderingFCElement!.store!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      const elementStore = renderRuntime.currentRenderingFCElement!.store!;
      hookStates[store.hooksIndex] = function rerender() {
        _rerender(elementStore, renderRuntime);
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
    const store = getHooksSpecificStore(renderRuntime.currentRenderingFCElement!.store!);
    const hookStates = getOrCreateHookStates(store);

    if (!hookStates[store.hooksIndex]) {
      const elementStore = renderRuntime.currentRenderingFCElement!.store!;
      const state: StateHookState = (hookStates[store.hooksIndex] = [undefined!, undefined!]);

      state[0] = callOrGet(initialState)!;
      state[1] = function dispatch(action) {
        const nextValue = callOrGet(action, state[0]);

        if (Object.is(state[0], nextValue)) {
          return;
        }

        state[0] = nextValue;
        _rerender(elementStore, renderRuntime);
      };
    }

    return hookStates[store.hooksIndex++];
  }) as UseState;
}

export function createUseEffect(renderRuntime: SimpRenderRuntime): (effect: Effect, deps?: DependencyList) => void {
  return (effect, deps) => {
    const store = getHooksSpecificStore(renderRuntime.currentRenderingFCElement!.store!);
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
    const store = getHooksSpecificStore(renderRuntime.currentRenderingFCElement!.store!);

    if (!store.catchHandlers) {
      store.catchHandlers = [];
    }

    store.catchHandlers!.push(cb);
  };
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
};

export type * from './public.js';
