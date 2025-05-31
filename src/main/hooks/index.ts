import { GLOBAL, rerender, type SimpElement } from '../core/internal';
import type { Nullable, VoidFunction } from '../shared';

type Cleanup = VoidFunction;
type Effect = () => void | Cleanup;
type DependencyList = readonly unknown[];

type EffectHookState = {
  effect: Effect;
  cleanup: Cleanup | undefined;
  deps: DependencyList | undefined;
};

type RerenderHookState = {
  element: HooksSimpElement;
  fn: VoidFunction;
};

type RefHookState<T = unknown> = {
  current: T;
};

type HookState = EffectHookState | RerenderHookState | RefHookState;

interface HooksSimpElement extends SimpElement {
  store: {
    hookStates: HookState[];
    mountEffects: EffectHookState[];
  };
}

let currentIndex: number = 0;
let currentElement: Nullable<HooksSimpElement> = null;

GLOBAL.eventBus.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentElement = event.element as HooksSimpElement;
    currentElement.store ||= { hookStates: [], mountEffects: [] };

    currentElement.store.mountEffects = [];
  }
  if (event.type === 'afterRender') {
    currentElement = null;
    currentIndex = 0;
  }
  if (event.type === 'mounted') {
    for (const state of (event.element as HooksSimpElement).store.mountEffects) {
      if (typeof state.cleanup === 'function') {
        state.cleanup();
      }
      state.cleanup = state.effect() || undefined;
    }
  }
  if (event.type === 'unmounted') {
    for (const state of (event.element as HooksSimpElement).store.hookStates) {
      if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
        state.cleanup();
      }
    }
  }
});

export function useRef<T>(initialValue: T): { current: T } {
  return (currentElement!.store.hookStates[currentIndex++] ||= { current: initialValue }) as RefHookState<T>;
}

export function useRerender(): VoidFunction {
  const state = (currentElement!.store.hookStates[currentIndex++] ||= {
    element: null!,
    fn() {
      rerender(state.element);
    },
  }) as RerenderHookState;

  state.element = currentElement!;

  return state.fn;
}

export function useEffect(effect: Effect, deps?: DependencyList): void {
  const state = (currentElement!.store.hookStates[currentIndex++] ||= {
    effect,
    deps: undefined,
    cleanup: undefined,
  }) as EffectHookState;

  if (!areDepsEqual(deps, state.deps)) {
    state.effect = effect;
    state.deps = deps;
    currentElement!.store.mountEffects.push(state);
  }
}

function areDepsEqual(nextDeps: DependencyList | undefined, prevDeps: DependencyList | undefined): boolean {
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
