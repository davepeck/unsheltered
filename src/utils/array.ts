/**
 * Make sure the input is an array. If it is not an array,
 * it will be wrapped in one. If the input is undefined, an empty array will
 * be returned.
 *
 * @param item - The item to convert to an array.
 * @returns An array.
 */
export const makeArray = <T>(item?: T | T[]): T[] =>
  item ? (Array.isArray(item) ? item : [item]) : [];
