import { describe, expect, it } from "vitest";
import { buildHistogram } from "./histogram";

describe("buildHistogram", () => {
  const TEST_DATES = [
    new Date("2022-01-01"),
    new Date("2022-01-02"),
    new Date("2022-01-02"),
    new Date("2022-01-03"),
    new Date("2022-01-04"),
    new Date("2022-01-04"),
    new Date("2022-01-04"),
    new Date("2022-01-05"),
    new Date("2022-01-06"),
    new Date("2022-01-06"),
    new Date("2022-01-07"),
    new Date("2022-01-08"),
    new Date("2022-01-08"),
    new Date("2022-01-09"),
  ];
  it("should return a histogram by day", () => {
    const start = new Date("2022-01-01");
    const end = new Date("2022-01-10");
    const delta = "1d";
    const histogram = buildHistogram(start, end, delta, TEST_DATES);
    const { data } = histogram;
    expect(data).toEqual({
      "2022-01-01": 1,
      "2022-01-02": 2,
      "2022-01-03": 1,
      "2022-01-04": 3,
      "2022-01-05": 1,
      "2022-01-06": 2,
      "2022-01-07": 1,
      "2022-01-08": 2,
      "2022-01-09": 1,
    });
  });

  it("should return a histogram by every other day", () => {
    const start = new Date("2022-01-01");
    const end = new Date("2022-01-11");
    const delta = "2d";
    const histogram = buildHistogram(start, end, delta, TEST_DATES);
    const { data } = histogram;
    expect(data).toEqual({
      "2022-01-01": 3,
      "2022-01-03": 4,
      "2022-01-05": 3,
      "2022-01-07": 3,
      "2022-01-09": 1,
    });
  });

  it("should return a histogram by week", () => {
    const start = new Date("2022-01-01");
    const end = new Date("2022-01-15");
    const delta = "7d";
    const histogram = buildHistogram(start, end, delta, TEST_DATES);
    const { data } = histogram;
    expect(data).toEqual({
      "2022-01-01": 11,
      "2022-01-08": 3,
    });
  });

  it("should return a histogram by calendar week", () => {
    const start = new Date("2022-01-01");
    const end = new Date("2022-01-15");
    const delta = "1cw";
    const histogram = buildHistogram(start, end, delta, TEST_DATES);
    const { data } = histogram;
    expect(data).toEqual({
      "2021-12-26": 1,
      "2022-01-02": 12,
      "2022-01-09": 1,
    });
  });
});
