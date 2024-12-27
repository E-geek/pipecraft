/**
 * @example: type ArrayLength = Opaque<number, 'int'>;
 * @link https://stackoverflow.com/a/50521248
 */
export type Opaque<T, K> = T & { __opaque: K };

export type Nullable<T> = T | null | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type Arrayable<T> = T | Array<T>;

export type ArrayableNullable<T> = Nullable<Arrayable<T>>;

export type Primitive = string | number | bigint | boolean | symbol | null | undefined;

/**
 * @link https://stackoverflow.com/questions/65577843/mutually-exclusive-props-in-a-react-component
 */
export type MutuallyExclude<T, E extends keyof T> = {
  [K in E]: { [P in K]: T[P] } & Omit<T, E> & {
    [P in Exclude<E, K>]?: never;
  } extends infer O
    ? { [P in keyof O]: O[P] }
    : never;
}[E]
  | ({ [K in E]?: never } & Omit<T, E>);

/**
 * @example:
 * type ResultData = MutuallyExcludeAll<{
 *   error: string,
 *   errorObject: Record<string, string>,
 *   data: string,
 * }>;
 * // ResultData = { error: string } | { errorObject: Record<string, string> } | { data: string }
 */
export type MutuallyExcludeAll<T> = MutuallyExclude<T, keyof T>;

export type Writable<T> = { -readonly [P in keyof T]: T[P] };
