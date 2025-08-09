import type { RefObject, SimpContext, SimpElement } from '@simpreact/internal';
import { lifecycleEventBus, rerender, syncRerenderLocker } from '@simpreact/internal';
import type { Maybe, Nullable } from '@simpreact/shared';
import { noop } from '@simpreact/shared';

type Cleanup = () => void;
type Effect = () => void | Cleanup;
type DependencyList = readonly unknown[];

type EffectHookState = {
  effect: Effect;
  cleanup?: Cleanup | undefined;
  deps?: DependencyList | undefined;
};

type RerenderHookState = () => void;

type RefHookState<T = unknown> = {
  current: T;
};

type HookState = EffectHookState | RerenderHookState | RefHookState;

interface HooksSimpElement extends SimpElement {
  store?: SimpElement['store'] & {
    hookStates?: HookState[];
    effectsHookStates?: EffectHookState[];
    erroredHookStates?: Array<(error: any) => void>;
  };
}

let currentIndex = 0;
// In runtime this is a nullable variable.
let currentElement: HooksSimpElement;

lifecycleEventBus.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentElement = event.element as HooksSimpElement;

    if (currentElement.store?.erroredHookStates) {
      currentElement.store.erroredHookStates = undefined;
    }
  }
  if (event.type === 'afterRender' || event.type === 'errored') {
    currentElement = null!;
    currentIndex = 0;
  }

  if (event.type === 'mounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      syncRerenderLocker.lock();

      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = undefined;

      for (const state of effects) {
        state.cleanup = state.effect() || undefined;
      }

      syncRerenderLocker.flush();
    }
  }
  if (event.type === 'updated') {
    const element = event.element as HooksSimpElement;

    if (element.store?.effectsHookStates) {
      syncRerenderLocker.lock();

      const effects = element.store.effectsHookStates;
      element.store.effectsHookStates = undefined;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || undefined;
      }

      syncRerenderLocker.flush();
    }
  }
  if (event.type === 'unmounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.hookStates) {
      for (const state of element.store.hookStates) {
        if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
          state.cleanup();
        }
      }
    }
  }
  if (event.type === 'errored') {
    const erroredHookStatesElement = findElementWithErroredHookStates(event.element as HooksSimpElement);

    if (!erroredHookStatesElement) {
      throw new Error('Error occurred during rendering a component', { cause: event.error });
    }

    if (erroredHookStatesElement.store!.erroredHookStates) {
      syncRerenderLocker.lock();

      for (const state of erroredHookStatesElement.store!.erroredHookStates) {
        state(event.error);
      }

      syncRerenderLocker.flush();
    }
  }
});

function findElementWithErroredHookStates(element: HooksSimpElement): Nullable<HooksSimpElement> {
  let temp: Nullable<HooksSimpElement> = element;

  while (temp != null) {
    if (temp.store?.erroredHookStates) {
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
    hookStates[currentIndex] = () => rerender(elementStore!.latestElement!);
  }

  return hookStates[currentIndex++] as RerenderHookState;
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

export function useContext<T>(context: SimpContext<T>): T {
  return currentElement.contextMap?.get(context) ?? context.defaultValue;
}

export function useDidCatchError(effect: (error: any) => void): void {
  if (!currentElement.store) {
    currentElement.store = {};
  }

  if (!currentElement.store.erroredHookStates) {
    currentElement.store.erroredHookStates = [];
  }

  currentElement.store.erroredHookStates.push(effect);
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

export default { useRef, useRerender, useEffect, useMounted, useUnmounted, useContext, areDepsEqual };

export type * from './public';
