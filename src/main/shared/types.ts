export type Nullable<T> = T | null;

export type Maybe<T> = Nullable<T> | undefined;

export type Many<T> = T[] | T;

export type Dict<T = any> = Record<string, T>;

export type Primitive = string | number | boolean | bigint | undefined | null;

export interface VoidFunction {
  (): void;
}
