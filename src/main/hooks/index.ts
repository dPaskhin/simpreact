import type { RefObject, SimpContext, SimpElement } from '@simpreact/internal';
import { lifecycleEventBus, rerender, syncRerenderLocker } from '@simpreact/internal';
import type { Maybe, VoidFunction } from '@simpreact/shared';

type Cleanup = VoidFunction;
type Effect = () => void | Cleanup;
type DependencyList = readonly unknown[];

type EffectHookState = {
  effect: Effect;
  cleanup: Cleanup | undefined;
  deps: DependencyList | undefined;
};

type RerenderHookState = VoidFunction;

type RefHookState<T = unknown> = {
  current: T;
};

type HookState = EffectHookState | RerenderHookState | RefHookState;

interface HooksSimpElement extends SimpElement {
  store?: SimpElement['store'] & {
    hookStates?: HookState[];
    mountEffects?: EffectHookState[];
  };
}

let currentIndex = 0;
// In runtime this is a nullable variable.
let currentElement: HooksSimpElement;

lifecycleEventBus.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentElement = event.element as HooksSimpElement;
  }
  if (event.type === 'afterRender') {
    currentElement = null!;
    currentIndex = 0;
  }

  if (event.type === 'mounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.mountEffects) {
      syncRerenderLocker.lock();

      const effects = element.store.mountEffects;
      element.store.mountEffects = undefined;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || undefined;
      }

      // When "using" becomes more stable this will be removed.
      syncRerenderLocker[Symbol.dispose]();
    }
  }
  if (event.type === 'unmounted') {
    const element = event.element as HooksSimpElement;

    if (element.store?.hookStates) {
      const unmountedElementStates = element.store.hookStates;
      element.store.hookStates = undefined;

      for (const state of unmountedElementStates) {
        if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
          state.cleanup();
        }
      }
    }
  }
});

export function useRef<T>(initialValue: T): RefObject<T>;
export function useRef<T>(initialValue: T | null): RefObject<T | null>;
export function useRef<T>(initialValue: T | undefined): RefObject<T | undefined>;
export function useRef<T>(initialValue: Maybe<T>): RefObject<Maybe<T>> {
  return addHookStateToElementStore(currentElement, { current: initialValue }, currentIndex++);
}

export function useRerender(): VoidFunction {
  const elementStore = currentElement.store;
  return addHookStateToElementStore(currentElement, () => rerender(elementStore!.latestElement!), currentIndex++);
}

export function useEffect(effect: Effect, deps?: DependencyList): void {
  const state = addHookStateToElementStore<EffectHookState>(
    currentElement,
    { effect, deps: undefined, cleanup: undefined },
    currentIndex++
  );

  if (!areDepsEqual(deps, state.deps)) {
    state.effect = effect;
    state.deps = deps;
    addMountEffectToElementStore(currentElement, state);
  }
}

export function useContext<T>(context: SimpContext<T>): T {
  return currentElement.contextMap?.get(context) ?? context.defaultValue;
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

export default { useRef, useRerender, useEffect, useContext, areDepsEqual };

export type * from './public';

function addHookStateToElementStore<S extends HookState>(element: HooksSimpElement, state: S, stateIndex: number): S {
  if (!element.store) {
    element.store = {};
  }

  if (!element.store.hookStates) {
    element.store.hookStates = [];
  }

  if (element.store.hookStates[stateIndex] === undefined) {
    element.store.hookStates[stateIndex] = state;
  }

  return element.store.hookStates[stateIndex] as S;
}

function addMountEffectToElementStore(element: HooksSimpElement, effect: EffectHookState): void {
  if (!element.store) {
    element.store = {};
  }

  if (!element.store.mountEffects) {
    element.store.mountEffects = [];
  }

  element.store.mountEffects.push(effect);
}
