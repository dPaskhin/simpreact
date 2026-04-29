import { type FC, lifecycleEventBus, rerender, type SimpElement, type SimpNode } from '@simpreact/internal';
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

interface ComponentStore {
  renderContext: ComponentRenderContext;
  pendingEffectStates: Nullable<EffectState[]>;
  effectStates: Nullable<EffectState[]>;
}

interface ComponentSimpElement extends SimpElement {
  store: SimpElement['store'] & {
    componentStore: ComponentStore;
  };
}

lifecycleEventBus.subscribe(event => {
  let store: ComponentStore | undefined;

  if (event.type === 'errored' && !event.handled) {
    let element: Nullable<SimpElement> = event.element;
    let curError = event.error;
    let catchers: Array<(error: any) => void>;

    while (element) {
      store = (element as ComponentSimpElement).store?.componentStore;

      if (!isComponentElement(element) || !(catchers = store!.renderContext.catchers!).length) {
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

  if (!isComponentElement(event.element)) {
    return;
  }

  store = (event.element as ComponentSimpElement).store!.componentStore;

  if (event.type === 'beforeRender' && !store) {
    function _rerender() {
      rerender(event.element, event.renderRuntime);
    }

    event.element.store!.componentStore = {
      renderContext: {
        state: createState(_rerender),
        rerender: _rerender,
        effects: [],
        catchers: [],
      },
      pendingEffectStates: null,
      effectStates: null,
    };
  } else if (event.type === 'beforeRender') {
    store.renderContext.effects = [];
    store.renderContext.catchers = [];
  }

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
});

export function componentRenderer(component: FC, element: SimpElement): SimpNode {
  if (isComponentElement(element)) {
    return (component as any)(
      element.props || emptyObject,
      (element as ComponentSimpElement).store.componentStore.renderContext
    );
  } else {
    return component(element.props || emptyObject);
  }
}

export function component(Component: (props: any, ctx: ComponentRenderContext) => SimpNode) {
  const Wrapped = (props: any, ctx: ComponentRenderContext) => Component(props, ctx);
  Wrapped._isComponent = true;
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
  return element.type && (element.type as any)._isComponent;
}
