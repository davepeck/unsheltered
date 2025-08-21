/**
 * @description Simple tools for creating and using indexes of items.
 */

/** Index a collection of items by a key function. */
export function makeIndex<T>(
  items: T[],
  key: (item: T) => string
): Record<string, T> {
  return items.reduce(
    (index, item) => {
      index[key(item)] = item;
      return index;
    },
    {} as Record<string, T>
  );
}

/** Describes an object with an explicit `id` field. */
export interface HasId {
  id: string;
}

/** Index a collection of items by their `id` field. */
export function makeIdIndex<T extends HasId>(items: T[]): Record<string, T> {
  return makeIndex(items, (item) => item.id);
}

/** Get items from a collection by their keys. */
export function withKeys<T>(items: Record<string, T>, keys: string[]): T[] {
  return keys.map((key) => items[key]);
}
