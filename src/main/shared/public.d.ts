export type Nullable<T> = T | null;

export type Maybe<T> = Nullable<T> | undefined;

export type Many<T> = T[] | T;

export type Dict<T = any> = Record<string, T>;

export type SimpText = string | number | bigint;

export type Subscriber<Event> = (event: Event) => boolean | void;

export declare class EventBus<Event = void> {
  public publish(event: Event): void;

  public subscribe(subscriber: Subscriber<Event>): () => void;
}

export type Cleanup = () => void;
export type Effect = () => void | Cleanup;
export type DependencyList = readonly unknown[];

export interface EffectState {
  effect: Effect;
  cleanup: Nullable<Cleanup>;
  deps: Nullable<DependencyList>;
}

export declare function isSimpText(value: unknown): value is SimpText;

export declare function noop(): void;

export declare function callOrGet<T, A extends any[]>(value: T | ((...args: A) => T), ...args: A): T;

export declare function shallowEqual(objA: any, objB: any): boolean;

export declare const emptyObject: Readonly<Record<never, never>>;
export declare const emptyMap: ReadonlyMap<never, never>;
export declare const emptyArray: ReadonlyArray<never>;
