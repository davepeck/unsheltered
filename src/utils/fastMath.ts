/**
 * Find the maximum value in an array of numbers efficiently.
 * Handles empty arrays and (very) large arrays without stack overflow.
 *
 * @param numbers - Array of numbers to find maximum value from
 * @returns The maximum value in the array, or -Infinity if array is empty
 */
export function fastMax(numbers: number[]): number {
  if (numbers.length === 0) {
    return -Infinity;
  }

  return numbers.reduce(
    (max, current) => (current > max ? current : max),
    numbers[0]
  );
}

/**
 * Find the minimum value in an array of numbers efficiently.
 * Handles empty arrays and large arrays without stack overflow.
 *
 * @param numbers - Array of numbers to find minimum value from
 * @returns The minimum value in the array, or Infinity if array is empty
 */
export function fastMin(numbers: number[]): number {
  if (numbers.length === 0) {
    return Infinity;
  }

  return numbers.reduce(
    (min, current) => (current < min ? current : min),
    numbers[0]
  );
}
