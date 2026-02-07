import type { SimpElement, SimpElementStore, SimpNode, SimpRenderRuntime } from '@simpreact/internal';
import { lifecycleEventBus, rerender } from '@simpreact/internal';
import type { Maybe } from '@simpreact/shared';

interface ContextSimpRenderRuntime extends SimpRenderRuntime {
  renderPhase: 'mounting' | 'updating';
  // In runtime this is a nullable variable.
  currentElement: ContextSimpElement;
}

type SimpContextEntry = { value: any; subs: Set<SimpElementStore> };

type SimpContextMap = Map<SimpContext, SimpContextEntry>;

type Provider<T = any> = (props: { value: T; children: SimpNode }) => SimpNode;
type Consumer<T = any> = (props: { children: (value: T) => SimpNode }) => SimpNode;

interface SimpContext<T = any> {
  defaultValue: T;
  Provider: Provider<T>;
  Consumer: Consumer<T>;
}

type ContextSimpElement = Omit<SimpElement, 'context'> & {
  context?: Maybe<SimpContextMap>;
};

lifecycleEventBus.subscribe(event => {
  const renderRuntime = event.renderRuntime as ContextSimpRenderRuntime;

  if (event.type === 'beforeRender') {
    renderRuntime.currentElement = event.element as ContextSimpElement;
    renderRuntime.renderPhase = event.phase;
  }
  if (event.type === 'afterRender') {
    renderRuntime.currentElement = null!;
    renderRuntime.renderPhase = null!;
  }
  if (event.type === 'unmounted' && (event.element as ContextSimpElement).context) {
    (event.element as ContextSimpElement).context!.forEach(value => value.subs.delete(event.element.store!));
  }
});

export interface CreateContext {
  <T>(defaultValue: T): SimpContext<T>;
}

export function createCreateContext(renderRuntime: SimpRenderRuntime): CreateContext {
  return <T>(defaultValue: T) => {
    const context: SimpContext<T> = {
      defaultValue,

      Provider(props) {
        const currentElement = (renderRuntime as ContextSimpRenderRuntime).currentElement!;
        const phase = renderRuntime.renderPhase!;

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
          rerender(sub.latestElement!, renderRuntime);
        }

        return props.children;
      },

      Consumer(props) {
        const contextEntry = (renderRuntime as ContextSimpRenderRuntime).currentElement.context?.get(context);
        const currentElement = renderRuntime.currentElement as ContextSimpElement;

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
  return <T>(context: SimpContext<T>): T => {
    const contextEntry = (renderRuntime as ContextSimpRenderRuntime).currentElement.context?.get(context);
    const currentElement = renderRuntime.currentElement as ContextSimpElement;

    if (!contextEntry) {
      // No provider above: just return the default value, don't subscribe
      return context.defaultValue;
    }

    if (!contextEntry.subs.has(currentElement.store!)) {
      contextEntry.subs.add(currentElement.store!);
    }

    return contextEntry.value;
  };
}
