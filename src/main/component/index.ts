import {
  type FC,
  lifecycleEventBus,
  rerender,
  SIMP_ELEMENT_FLAG_FC,
  type SimpElement,
  type SimpElementStore,
  type SimpNode,
  type SimpRenderRuntime,
} from '@simpreact/internal';
import {
  type DependencyList,
  type Dict,
  type Effect,
  type EffectState,
  emptyObject,
  type Maybe,
  type Nullable,
  shallowEqual,
} from '@simpreact/shared';

interface ComponentRenderContext {
  state: Dict;
  rerender: () => void;
  effects: Nullable<Array<{ effect: Effect; deps?: Maybe<DependencyList> }>>;
  catchers: Nullable<Array<(error: any) => void>>;
}

interface ComponentSpecificStore {
  context: ComponentRenderContext;
  pendingEffectStates: Nullable<EffectState[]>;
  effectStates: Nullable<EffectState[]>;
}

const componentSpecificStoreByElementStore = new WeakMap<SimpElementStore, ComponentSpecificStore>();

function getComponentSpecificStore(store: SimpElementStore, renderRuntime: SimpRenderRuntime): ComponentSpecificStore {
  let hooksSpecificStore = componentSpecificStoreByElementStore.get(store);
  if (!hooksSpecificStore) {
    function _rerender() {
      rerender(store, renderRuntime);
    }
    hooksSpecificStore = {
      context: {
        state: createState(_rerender),
        rerender: _rerender,
        catchers: null,
        effects: null,
      },
      pendingEffectStates: null,
      effectStates: null,
    };
    componentSpecificStoreByElementStore.set(store, hooksSpecificStore);
  }
  return hooksSpecificStore;
}

lifecycleEventBus.subscribe(event => {
  if (event.type === 'errored') {
    if (event.handled) {
      return;
    }

    let element: Nullable<SimpElement> = event.element;
    let curError = event.error;
    let catchers: Nullable<Array<(error: any) => void>>;

    while (element) {
      if (!isComponentElement(element)) {
        element = element.parent;
        continue;
      }

      const store = getComponentSpecificStore(element.store!, event.renderRuntime);
      catchers = store.context.catchers;

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

    return;
  }

  if (!isComponentElement(event.element)) {
    return;
  }

  const store = getComponentSpecificStore(event.element.store!, event.renderRuntime);

  switch (event.type) {
    case 'beforeRender': {
      store.context.effects = [];
      store.context.catchers = [];
      store.pendingEffectStates = null;
      return;
    }
    case 'afterRender': {
      if (!store.context.effects) {
        return;
      }

      for (let i = 0; i < store.context.effects.length; i++) {
        const renderEffectState = store.context.effects[i]!;
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

      return;
    }
    case 'mounted': {
      if (!store.pendingEffectStates) {
        return;
      }

      const effects = store.pendingEffectStates;
      store.pendingEffectStates = null;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || null;
      }

      return;
    }
    case 'updated': {
      if (!store.pendingEffectStates) {
        return;
      }

      const effects = store.pendingEffectStates;
      store.pendingEffectStates = null;

      for (const state of effects) {
        if (typeof state.cleanup === 'function') {
          state.cleanup();
        }
        state.cleanup = state.effect() || null;
      }

      return;
    }
    case 'unmounted': {
      if (!store.effectStates) {
        return;
      }

      const effects = store.effectStates;
      store.effectStates = null;

      for (const state of effects) {
        if (state && 'cleanup' in state && typeof state.cleanup === 'function') {
          state.cleanup();
        }
      }
    }
  }
});

export function componentRenderer(component: FC, element: SimpElement, renderRuntime: SimpRenderRuntime): SimpNode {
  if (isComponentElement(element)) {
    const store = getComponentSpecificStore(element.store!, renderRuntime);
    return (component as any)(element.props || emptyObject, store.context);
  } else {
    return component(element.props || emptyObject);
  }
}

export function component(Component: (props: any, ctx: ComponentRenderContext) => SimpNode): FC {
  const Wrapped = ((props: any, ctx: ComponentRenderContext) => Component(props, ctx)) as FC & { _isComponent?: 1 };
  Wrapped._isComponent = 1;
  return Wrapped;
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

export function isComponentElement(element: SimpElement): boolean {
  return element.flag & SIMP_ELEMENT_FLAG_FC && (element.type as any)._isComponent;
}
