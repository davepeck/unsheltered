import { describe, expect, it } from "vitest";
import { fastMax, fastMin } from "./fastMath";

describe("fastMax()", () => {
  it("should return the maximum value in an array of numbers", () => {
    expect(fastMax([1, 2, 3, 4, 5])).toEqual(5);
  });

  it("should handle an empty array", () => {
    expect(fastMax([])).toEqual(-Infinity);
  });

  it("should handle an array with negative numbers", () => {
    expect(fastMax([-5, -4, -1, -2, -3])).toEqual(-1);
  });

  it("should handle an array with a single element", () => {
    expect(fastMax([42])).toEqual(42);
  });
});

describe("fastMin()", () => {
  it("should return the minimum value in an array of numbers", () => {
    expect(fastMin([1, 2, 3, 4, 5])).toEqual(1);
  });

  it("should handle an empty array", () => {
    expect(fastMin([])).toEqual(Infinity);
  });

  it("should handle an array with positive numbers", () => {
    expect(fastMin([5, 4, 1, 2, 3])).toEqual(1);
  });

  it("should handle an array with a single element", () => {
    expect(fastMin([42])).toEqual(42);
  });
});
