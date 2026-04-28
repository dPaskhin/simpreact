import type { SimpElement, SimpElementStore, SimpNode, SimpRenderRuntime } from '@simpreact/internal';
import { lifecycleEventBus, MOUNTING_PHASE, rerender } from '@simpreact/internal';

interface ContextSpecificData {
  renderPhase: number;
  currentElement: SimpElement;
}

const contextSpecificDataByRuntime = new WeakMap<SimpRenderRuntime, ContextSpecificData>();

function getContextSpecificData(renderRuntime: SimpRenderRuntime): ContextSpecificData {
  let data = contextSpecificDataByRuntime.get(renderRuntime);
  if (!data) {
    data = { renderPhase: null!, currentElement: null! };
    contextSpecificDataByRuntime.set(renderRuntime, data);
  }
  return data;
}

type SimpContextEntry = { value: any; subs: Set<SimpElementStore> };

type Provider<T = any> = (props: { value: T; children: SimpNode }) => SimpNode;
type Consumer<T = any> = (props: { children: (value: T) => SimpNode }) => SimpNode;

interface SimpContext<T = any> {
  defaultValue: T;
  Provider: Provider<T>;
  Consumer: Consumer<T>;
}

lifecycleEventBus.subscribe(event => {
  const data = getContextSpecificData(event.renderRuntime);

  if (event.type === 'beforeRender') {
    data.currentElement = event.element;
    data.renderPhase = event.phase;
  }
  if (event.type === 'afterRender') {
    data.currentElement = null!;
    data.renderPhase = null!;
  }
  if (event.type === 'unmounted' && event.element.context) {
    event.element.context.forEach((value: SimpContextEntry) => value.subs.delete(event.element.store!));
  }
});

export interface CreateContext {
  <T>(defaultValue: T): SimpContext<T>;
}

export function createCreateContext(renderRuntime: SimpRenderRuntime): CreateContext {
  const data = getContextSpecificData(renderRuntime);

  return <T>(defaultValue: T) => {
    const context: SimpContext<T> = {
      defaultValue,

      Provider(props) {
        const { currentElement, renderPhase } = data;

        if (!currentElement.context) {
          currentElement.context = new Map();
        } else if (renderPhase === MOUNTING_PHASE) {
          currentElement.context = new Map(currentElement.context);
        }

        if (renderPhase === MOUNTING_PHASE) {
          currentElement.context.set(context, {
            value: props.value,
            subs: new Set(),
          });
          return props.children;
        }

        let contextEntry = currentElement!.context.get(context);

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
          rerender(sub.latestElement!, renderRuntime);
        }

        return props.children;
      },

      Consumer(props) {
        const { currentElement } = data;
        const contextEntry = currentElement.context?.get(context);

        if (!contextEntry) {
          // No provider above: just use the default value, don't subscribe
          return props.children(defaultValue);
        }

        if (!contextEntry.subs.has(currentElement.store!)) {
          contextEntry.subs.add(currentElement.store!);
        }

        return props.children(contextEntry.value);
      },
    };

    return context;
  };
}

export interface UseContext {
  <T>(context: SimpContext<T>): T;
}

export function createUseContext(renderRuntime: SimpRenderRuntime): UseContext {
  const data = getContextSpecificData(renderRuntime);

  return <T>(context: SimpContext<T>): T => {
    const { currentElement } = data;
    const contextEntry = currentElement.context?.get(context);

    if (!contextEntry) {
      return context.defaultValue;
    }

    if (!contextEntry.subs.has(currentElement.store!)) {
      contextEntry.subs.add(currentElement.store!);
    }

    return contextEntry.value;
  };
}
