/** Assert that the value is defined. */
export function assertDefined<T>(
  value: T | undefined | null
): asserts value is T {
  if (value === undefined) {
    throw new Error("Value is undefined");
  }
}

/** Assert an arbitrary boolean condition. */
export function assert(
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion failed");
  }
}

/** Assert on never. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function assertNever(_: never): never {
  throw new Error("This should never happen");
}
