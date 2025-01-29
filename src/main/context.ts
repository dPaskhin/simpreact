import type { FunctionComponent, SimpElement, SimpNode } from './element';
import { isFunctionTypeElement } from './element';
import type { Maybe } from './types';

export interface GlobalContext extends Map<ContextProvider, SimpElement> {}

interface ContextProvider<T = any> extends FunctionComponent<{ value: T; children?: SimpNode }> {}

interface ContextConsumer<T = any> extends FunctionComponent<{ children: (value: T) => SimpNode }> {}

export interface Context<T> {
  defaultValue: T;

  Provider: ContextProvider<T>;

  Consumer: ContextConsumer<T>;
}

export function createContext<T>(defaultValue: T): Context<T> {
  function Provider(props: { children?: SimpNode }): SimpNode {
    return props.children;
  }

  function Consumer(props: { children: (value: T) => SimpNode }, globalContext: GlobalContext): SimpNode {
    return props.children(getContextValue<T>(globalContext, context));
  }

  const context: Context<T> = {
    defaultValue,
    Provider: null!,
    Consumer: null!,
  };

  Provider._context = Consumer._context = context;
  Provider._type = 'PROVIDER';
  Consumer._type = 'CONSUMER';
  context.Provider = Provider;
  context.Consumer = Consumer;

  return context;
}

export function getContextValue<T>(globalContext: Maybe<GlobalContext>, context: Context<T>): T {
  return globalContext?.get(context.Provider)?.props?.value || context.defaultValue;
}

export function isProviderElement(element: Maybe<SimpElement>): element is Omit<SimpElement, 'type'> & {
  type: FunctionComponent;
} {
  return isFunctionTypeElement(element) && '_type' in element.type && element.type._type === 'PROVIDER';
}

export function isConsumerElement(element: Maybe<SimpElement>): element is Omit<SimpElement, 'type'> & {
  type: FunctionComponent;
} {
  return isFunctionTypeElement(element) && '_type' in element.type && element.type._type === 'CONSUMER';
}
