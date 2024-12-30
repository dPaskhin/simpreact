import { enqueueRender, lifecycleManager, type SimpElement } from '../index';
import type { Nullable } from '../types';

type Cleanup = () => void;
type Effect = () => void | Cleanup;
type DependencyList = readonly unknown[];

interface StateHookState<S = unknown> {
  value: [S, Dispatch<SetStateAction<S>>];
  element: SimpElement;
}

interface EffectHookState {
  effect: Effect;
  cleanup: Cleanup | undefined;
  deps: DependencyList | undefined;
}

interface MemoHookState<T = unknown> {
  value: T;
  deps: DependencyList | undefined;
}

interface RefHookState<T = unknown> {
  value: { current: T };
}

type HookState = StateHookState | EffectHookState | MemoHookState | RefHookState;

interface HooksSimpElement extends SimpElement {
  _store: {
    _hooks: HookState[];
    _mountEffects: EffectHookState[];
  };
}

let currentElement: Nullable<HooksSimpElement>;
let currentIndex = 0;

lifecycleManager.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentIndex = 0;
    currentElement = event.payload.element as HooksSimpElement;

    currentElement._store ||= {
      _hooks: [],
      _mountEffects: [],
    };
    currentElement._store._mountEffects = [];
  }

  if (event.type === 'afterRender') {
    currentElement = null;
  }

  if (event.type === 'afterMount') {
    for (const element of event.payload.deletedElements as HooksSimpElement[]) {
      for (const mountEffect of element._store._mountEffects) {
        if (typeof mountEffect.cleanup === 'function') {
          mountEffect.cleanup();
        }
      }
    }
    for (const element of event.payload.renderedElements as HooksSimpElement[]) {
      for (const mountEffect of element._store._mountEffects) {
        if (typeof mountEffect.cleanup === 'function') {
          mountEffect.cleanup();
        }
        mountEffect.cleanup = mountEffect.effect() || undefined;
      }
    }
  }
});

type Dispatch<A> = (value: A) => void;
type SetStateAction<S> = S | ((prevState: S) => S);

export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
export function useState(initialState?: unknown) {
  const hookState = (currentElement!._store._hooks[currentIndex++] ||= {
    value: [
      callOrGet(initialState),
      action => {
        const nextValue = callOrGet(action, hookState.value[0]);

        if (nextValue !== hookState.value[0]) {
          hookState.value[0] = nextValue;
          enqueueRender(hookState.element, Object.assign({}, hookState.element));
        }
      },
    ],
    element: currentElement!,
  }) as StateHookState;

  hookState.element = currentElement!;

  return hookState.value;
}

export function useMemo<S>(factory: () => S, deps?: DependencyList): S {
  const hookState = (currentElement!._store._hooks[currentIndex++] ||= {
    value: factory(),
    deps,
  }) as MemoHookState<S>;

  if (!areDepsEqual(deps, hookState.deps)) {
    hookState.deps = deps;
    return (hookState.value = factory());
  }

  return hookState.value;
}

export function useCallback<Cb extends (...args: any[]) => any>(cb: Cb, deps?: DependencyList): Cb {
  return useMemo(() => cb, deps);
}

export function useEffect(effect: Effect, deps?: DependencyList) {
  const hookState = (currentElement!._store._hooks[currentIndex++] ||= {
    effect,
    deps: undefined,
    cleanup: undefined,
  }) as EffectHookState;

  if (!areDepsEqual(deps, hookState.deps)) {
    hookState.effect = effect;
    hookState.deps = deps;
    currentElement!._store._mountEffects.push(hookState);
  }
}

export function useRef<T>(initialValue: T): { current: T } {
  const hookState = (currentElement!._store._hooks[currentIndex++] ||= {
    value: { current: initialValue },
  }) as RefHookState<T>;

  return hookState.value;
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

function callOrGet<Value, Args extends Array<any>>(value: ((...args: Args) => Value) | Value, ...args: Args): Value {
  if (typeof value === 'function') {
    return (value as Function)(...args);
  }
  return value;
}
