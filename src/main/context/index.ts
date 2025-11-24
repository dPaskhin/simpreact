import type { SimpElement, SimpElementStore, SimpNode } from '@simpreact/internal';
import { lifecycleEventBus, rerender } from '@simpreact/internal';
import type { Maybe, Nullable } from '@simpreact/shared';

type SimpContextEntry = { value: any; subs: Set<SimpElementStore> };

type SimpContextMap = Map<SimpContext, SimpContextEntry>;

type Provider<T = any> = (props: { value: T; children: SimpNode }) => SimpNode;
type Consumer<T = any> = (
  props: { children: (value: T) => SimpNode },
  contextMap: Nullable<SimpContextMap>
) => SimpNode;

interface SimpContext<T = any> {
  defaultValue: T;
  Provider: Provider<T>;
  Consumer: Consumer<T>;
}

type ContextSimpElement = Omit<SimpElement, 'context'> & {
  context?: Maybe<SimpContextMap>;
};

// In runtime these variables are nullable.
let currentElement: ContextSimpElement;
let phase: 'mounting' | 'updating';

lifecycleEventBus.subscribe(event => {
  if (event.type === 'beforeRender') {
    currentElement = event.element as ContextSimpElement;
    phase = event.phase;
  }
  if (event.type === 'afterRender') {
    currentElement = null!;
    phase = null!;
  }
  if (event.type === 'unmounted') {
    (event.element as ContextSimpElement).context?.forEach(value => value.subs.delete(event.element.store!));
  }
});

export function createContext<T>(defaultValue: T): SimpContext<T> {
  const context: SimpContext<T> = {
    defaultValue,

    Provider(props) {
      if (!currentElement.context) {
        currentElement.context = new Map();
      } else if (phase === 'mounting') {
        currentElement.context = new Map(currentElement.context);
      }

      if (phase === 'mounting') {
        currentElement.context.set(context, {
          value: props.value,
          subs: new Set(),
        });
        return props.children;
      }

      let contextEntry = currentElement.context.get(context);

      if (!contextEntry) {
        contextEntry = { value: props.value, subs: new Set() };
        currentElement.context.set(context, contextEntry);
        return props.children;
      }

      if (Object.is(contextEntry.value, props.value)) {
        return props.children;
      }

      contextEntry.value = props.value;

      for (const sub of contextEntry.subs) {
        rerender(sub.latestElement!);
      }

      return props.children;
    },

    Consumer(props) {
      return props.children((currentElement as ContextSimpElement).context?.get(context)?.value ?? defaultValue);
    },
  };

  return context;
}

export function useContext<T>(context: SimpContext<T>): T {
  const contextEntry = (currentElement as ContextSimpElement).context?.get(context);

  if (!contextEntry) {
    // No provider above: just return the default value, don't subscribe
    return context.defaultValue;
  }

  if (!contextEntry.subs.has(currentElement.store!)) {
    contextEntry.subs.add(currentElement.store!);
  }

  return contextEntry.value;
}
