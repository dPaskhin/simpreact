import type { Dict, Maybe, Nullable } from '@simpreact/shared';
import { shallowEqual } from '@simpreact/shared';

import type { SimpElement } from './createElement.js';
import { lifecycleEventBus } from './lifecycleEventBus.js';
import { rerender } from './rerender.js';

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
  catchers: Nullable<Array<(error: any) => void>>;
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
  return element.type && (element.type as any)._isComponent;
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

        const hadProperty = Object.hasOwn(target, prop);

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
      catchers: null,
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
        state = store.effectStates[i] = {
          effect: renderEffectState.effect,
          deps: null,
          cleanup: null,
        };
      }

      if (!shallowEqual(renderEffectState.deps, state.deps)) {
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

  if (event.type === 'errored' && !event.handled) {
    let element: Nullable<SimpElement> = event.element;
    let curError = event.error;
    let catchers: Nullable<Array<(error: any) => void>> = null;

    while (element) {
      if (!isComponentElement(element) || !(catchers = element.store!.componentStore!.renderContext.catchers)) {
        element = element.parent;
        continue;
      }

      try {
        for (let i = 0; i < catchers.length; i++) {
          catchers[i]!(curError);
        }
        event.handled = true;
        curError = null;
        break;
      } catch (error) {
        element = element.parent;
        curError = error;
      }
    }
  }
});
