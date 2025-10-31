import type { Dict, Maybe, Nullable } from '@simpreact/shared';

import type { SimpElement } from './createElement.js';
import { rerender } from './rerender.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

interface EffectState {
  effect: Effect;
  cleanup: Nullable<Cleanup>;
  deps: Nullable<DependencyList>;
}

interface ComponentRenderContext {
  state: Dict;
  rerender: () => void;
  effects: Nullable<Array<{ effect: Effect; deps?: Maybe<DependencyList> }>>;
}

export interface ComponentStore {
  renderContext: ComponentRenderContext;
  pendingEffectStates: Nullable<EffectState[]>;
  effectStates: Nullable<EffectState[]>;
}

export function component(Component: any) {
  const Wrapped = ((props: any, ctx: any) => Component(props, ctx)) as any;
  Wrapped._isComponent = true;
  return Wrapped;
}

export function isComponentElement(element: SimpElement): boolean {
  return !!(element.type as any)._isComponent;
}

export function createState(onChange: () => void) {
  return new Proxy(
    {},
    {
      set(target, prop, value) {
        const prevValue = (target as any)[prop];

        if (Object.is(prevValue, value)) {
          return true;
        }

        const hadProperty = target.hasOwnProperty(prop);

        (target as any)[prop] = value;

        if (hadProperty) {
          onChange();
        }

        return true;
      },
    }
  );
}

export function createComponentStore(element: SimpElement): ComponentStore {
  function _rerender() {
    rerender(element);
  }

  element.store!.componentStore = {
    renderContext: {
      state: createState(_rerender),
      rerender: _rerender,
      effects: null,
    },
    pendingEffectStates: null,
    effectStates: null,
  };

  return element.store!.componentStore;
}

lifecycleEventBus.subscribe(event => {
  if (!isComponentElement(event.element)) {
    return;
  }

  const store = event.element.store!.componentStore!;

  if (event.type === 'afterRender' && store.renderContext.effects) {
    for (let i = 0; i < store.renderContext.effects.length; i++) {
      const renderEffectState = store.renderContext.effects[i]!;
      let state = (store.effectStates ||= [])[i];

      if (!state) {
        state = store.effectStates[i] = { effect: renderEffectState.effect, deps: null, cleanup: null };
      }

      if (!areDepsEqual(renderEffectState.deps, state.deps)) {
        state.effect = renderEffectState.effect;
        state.deps = renderEffectState.deps || null;
        (store.pendingEffectStates ||= []).push(state);
      }
    }
  }

  if ((event.type === 'mounted' || event.type === 'updated') && store.pendingEffectStates) {
    const effects = store.pendingEffectStates!;
    store.pendingEffectStates = null;

    for (const state of effects) {
      if (typeof state.cleanup === 'function') {
        state.cleanup();
      }
      state.cleanup = state.effect() || null;
    }
  }

  if (event.type === 'unmounted' && store.effectStates) {
    const effects = store.effectStates;
    store.effectStates = null;

    for (const state of effects) {
      if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
        state.cleanup();
      }
    }
  }
});

function areDepsEqual(nextDeps: Maybe<DependencyList>, prevDeps: Maybe<DependencyList>): boolean {
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
