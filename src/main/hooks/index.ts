import { enqueueRender, lifecycleManager, type SimpElement } from '../index';
import type { Nullable } from '../types';
import { type Context, getContextValue } from '../context';

type Cleanup = () => void;
type Effect = () => void | Cleanup;
type DependencyList = readonly unknown[];

interface EffectHookState {
  effect: Effect;
  cleanup: Cleanup | undefined;
  deps: DependencyList | undefined;
}

interface RefHookState<T = unknown> {
  value: { current: T };
}

type HookState = EffectHookState | RefHookState;

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

export function useRerender(): () => void {
  const ref = useRef<{ element: Nullable<HooksSimpElement>; fn: () => void }>({
    element: null,
    fn() {
      enqueueRender(ref.current.element, Object.assign({}, ref.current.element));
    },
  });

  ref.current.element = currentElement;

  return ref.current.fn;
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

export function useContext<T>(context: Context<T>): T {
  return getContextValue(currentElement?._globalContext, context);
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
