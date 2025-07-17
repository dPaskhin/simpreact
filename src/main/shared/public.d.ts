export type Nullable<T> = T | null;

export type Maybe<T> = Nullable<T> | undefined;

export type Many<T> = T[] | T;

export type Dict<T = any> = Record<string, T>;

export type SimpText = string | number | bigint;

type Subscriber<Event> = (event: Event) => boolean | void;

declare class EventBus<Event = void> {
  public publish(event: Event): void;

  public subscribe(subscriber: Subscriber<Event>): () => void;
}

declare function isSimpText(value: unknown): value is SimpText;
