export type Nullable<T> = T | null;

export type Maybe<T> = Nullable<T> | undefined;

export type Many<T> = T[] | T;

export type Dict<T = any> = Record<string, T>;

export type Primitive = string | number | boolean | bigint | undefined | null;

export interface VoidFunction {
  (): void;
}

type Subscriber<Event> = (event: Event) => boolean | void;

declare class EventBus<Event = void> {
  public publish(event: Event): void;

  public subscribe(subscriber: Subscriber<Event>): () => void;
}

declare function isPrimitive(value: unknown): value is Primitive;
