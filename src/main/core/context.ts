import type { SimpNode } from './createElement.js';

type Provider<T = any> = (props: { value: T; children: SimpNode }) => SimpNode;
type Consumer<T = any> = (props: { children: (value: T) => SimpNode }, contextMap: SimpContextMap) => SimpNode;

export interface SimpContext<T> {
  defaultValue: T;
  Provider: Provider<T>;
  Consumer: Consumer<T>;
}

export type SimpContextMap = Map<SimpContext<any>, any>;

export function createContext<T>(defaultValue: T): SimpContext<T> {
  const context: SimpContext<T> = {
    defaultValue,
    Provider: Object.create(null),
    Consumer(props, contextMap) {
      return props.children(contextMap.get(context) ?? defaultValue);
    },
  };

  Object.defineProperty(context.Consumer, 'isConsumer', { value: true });
  Object.defineProperty(context.Provider, 'context', { value: context, enumerable: true });

  return context;
}

export function isProvider(type: any): boolean {
  return type != null && type.context != null;
}

export function isConsumer(type: any): boolean {
  return type != null && type.isConsumer === true;
}
