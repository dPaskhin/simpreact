import {
  lifecycleEventBus,
  MOUNTING_PHASE,
  rerender,
  type SimpElementStore,
  type SimpNode,
  type SimpRenderRuntime,
} from '@simpreact/internal';
import type { Nullable } from '@simpreact/shared';

// There is an assertion throughout in the module that context is Map<SimpContext, SimpContextEntry>
// which is a weak point since there may happen to appear new contexts types in other features.
interface SimpContextEntry {
  value: unknown;
  subs: Set<SimpElementStore>;
}

type Provider = (props: { value: unknown; children: SimpNode }) => SimpNode;
type Consumer = (props: { children: (value: unknown) => SimpNode }) => SimpNode;

interface SimpContext {
  defaultValue: unknown;
  Provider: Provider;
  Consumer: Consumer;
}

export interface CreateContext {
  (defaultValue: unknown): SimpContext;
}

lifecycleEventBus.subscribe(event => {
  if (event.type === 'unmounted' && event.element.context) {
    const contextMap = event.element.context as Map<SimpContext, SimpContextEntry>;
    for (const entry of contextMap.values()) {
      entry.subs.delete(event.element.store!);
    }
  }
});

export function createCreateContext(renderRuntime: SimpRenderRuntime): CreateContext {
  return defaultValue => {
    const context: SimpContext = {
      defaultValue,

      Provider(props) {
        const currentElement = renderRuntime.currentRenderingFCElement!;
        const renderPhase = renderRuntime.renderPhase;
        let contextMap = currentElement.context as Nullable<Map<SimpContext, SimpContextEntry>>;

        if (!contextMap) {
          currentElement.context = contextMap = new Map();
        }
        if (contextMap && renderPhase === MOUNTING_PHASE) {
          currentElement.context = contextMap = new Map(currentElement.context);
        }

        if (renderPhase === MOUNTING_PHASE) {
          contextMap.set(context, { value: props.value, subs: new Set() });
          return props.children;
        }

        const entry = contextMap.get(context);

        if (!entry) {
          contextMap.set(context, { value: props.value, subs: new Set() });
          return props.children;
        }

        if (Object.is(entry.value, props.value)) {
          return props.children;
        }

        entry.value = props.value;

        for (const sub of entry.subs) {
          rerender(sub, renderRuntime);
        }

        return props.children;
      },

      Consumer(props) {
        const currentElement = renderRuntime.currentRenderingFCElement!;
        const contextMap = currentElement.context as Nullable<Map<SimpContext, SimpContextEntry>>;
        const store = currentElement.store!;
        const entry = contextMap?.get(context);

        if (!entry) {
          return props.children(defaultValue);
        }

        entry.subs.add(store);
        return props.children(entry.value);
      },
    };

    return context;
  };
}

export interface UseContext {
  (context: SimpContext): unknown;
}

export function createUseContext(renderRuntime: SimpRenderRuntime): UseContext {
  return context => {
    const currentElement = renderRuntime.currentRenderingFCElement!;
    const contextMap = currentElement.context as Nullable<Map<SimpContext, SimpContextEntry>>;
    const store = currentElement.store!;
    const entry = contextMap?.get(context);

    if (!entry) {
      return context.defaultValue;
    }

    entry.subs.add(store);
    return entry.value;
  };
}
