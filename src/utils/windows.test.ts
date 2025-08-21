import { describe, expect, it } from "vitest";
import type { DeltaString, DeltaUnit } from "./windows";
import { getWindow, offsetWindow, parseDelta } from "./windows";

describe("parseDelta", () => {
  it("should parse hours", () => {
    const deltaString = "3h";
    const expected = { amount: 3, unit: "h", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse hours with a negative offset", () => {
    const deltaString = "3h-2";
    const expected = { amount: 3, unit: "h", offset: -2 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse hours with a positive offset", () => {
    const deltaString = "3h+27";
    const expected = { amount: 3, unit: "h", offset: 27 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse days", () => {
    const deltaString = "5d";
    const expected = { amount: 5, unit: "d", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse months", () => {
    const deltaString = "20m";
    const expected = { amount: 20, unit: "m", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse quarters", () => {
    const deltaString = "107q";
    const expected = { amount: 107, unit: "q", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse years", () => {
    const deltaString = "1y";
    const expected = { amount: 1, unit: "y", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse calendar weeks", () => {
    const deltaString = "3cw";
    const expected = { amount: 3, unit: "cw", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse calendar months", () => {
    const deltaString = "17cm";
    const expected = { amount: 17, unit: "cm", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse calendar quarters", () => {
    const deltaString = "3cq";
    const expected = { amount: 3, unit: "cq", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should parse calendar years", () => {
    const deltaString = "2cy";
    const expected = { amount: 2, unit: "cy", offset: 0 };
    const delta = parseDelta(deltaString);
    expect(delta).toEqual(expected);
  });

  it("should reject invalid amounts", () => {
    const deltaString = "abc";
    expect(() => parseDelta(deltaString as unknown as DeltaString)).toThrow();
  });

  it("should reject invalid units", () => {
    const deltaString = "1x";
    expect(() => parseDelta(deltaString as unknown as DeltaString)).toThrow();
  });

  it("should pass through a window object", () => {
    const delta = { amount: 5, unit: "d" as DeltaUnit, offset: 0 };
    const parsed = parseDelta(delta);
    expect(parsed).toEqual(delta);
  });
});

describe("getWindow (ending)", () => {
  it("should return 17 hours ago", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const delta = { amount: 17, unit: "h" as DeltaUnit, offset: 0 };
    const { start } = getWindow(delta, end);
    expect(start).toEqual(new Date("2020-12-31T19:00:00Z"));
  });

  it("should return 27 days ago", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const { start } = getWindow("27d", end);
    expect(start).toEqual(new Date("2020-12-05T12:00:00Z"));
  });

  it("should return 3 months ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 2, unit: "m" as DeltaUnit, offset: 0 };
    const { start } = getWindow(delta, end);
    expect(start).toEqual(new Date("2020-11-15T12:00:00Z"));
  });

  it("should return 1 quarter ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const { start } = getWindow("1q", end);
    expect(start).toEqual(new Date("2020-10-15T12:00:00Z"));
  });

  it("should return 3 years ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 3, unit: "y" as DeltaUnit, offset: 0 };
    const { start } = getWindow(delta, end);
    expect(start).toEqual(new Date("2018-01-15T12:00:00Z"));
  });
});

describe("offsetWindow (ending)", () => {
  it("should return 17 * 4 hours ago", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const delta = { amount: 17, unit: "h" as DeltaUnit, offset: 0 };
    const { start } = offsetWindow(getWindow(delta, end), -3);
    expect(start).toEqual(new Date("2020-12-29T16:00:00Z"));
  });

  it("should return 27 * 3 days ago", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const { start } = offsetWindow(getWindow("27d", end), -2);
    expect(start).toEqual(new Date("2020-10-12T12:00:00Z"));
  });

  it("should return 2 * 4 months ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 2, unit: "m" as DeltaUnit, offset: 0 };
    const { start } = offsetWindow(getWindow(delta, end), -3);
    expect(start).toEqual(new Date("2020-05-15T12:00:00Z"));
  });

  it("should return 1 * 3 quarters ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const { start } = offsetWindow(getWindow("1q", end), -2);
    expect(start).toEqual(new Date("2020-04-15T12:00:00Z"));
  });

  it("should return 3 * 2 years ago", () => {
    const end = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 3, unit: "y" as DeltaUnit, offset: 0 };
    const { start } = offsetWindow(getWindow(delta, end), -1);
    expect(start).toEqual(new Date("2015-01-15T12:00:00Z"));
  });
});

describe("getWindow (starting)", () => {
  it("should return 17 hours from now", () => {
    const start = new Date("2021-01-01T12:00:00Z");
    const delta = { amount: 17, unit: "h" as DeltaUnit, offset: 0 };
    const { end } = getWindow(delta, start, "start");
    expect(end).toEqual(new Date("2021-01-02T05:00:00Z"));
  });

  it("should return 27 days from now", () => {
    const start = new Date("2021-01-01T12:00:00Z");
    const { end } = getWindow("27d", start, "start");
    expect(end).toEqual(new Date("2021-01-28T12:00:00Z"));
  });

  it("should return 2 months from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 2, unit: "m" as DeltaUnit, offset: 0 };
    const { end } = getWindow(delta, start, "start");
    expect(end).toEqual(new Date("2021-03-15T12:00:00Z"));
  });

  it("should return 1 quarter from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const { end } = getWindow("1q", start, "start");
    expect(end).toEqual(new Date("2021-04-15T12:00:00Z"));
  });

  it("should return 3 years from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 3, unit: "y" as DeltaUnit, offset: 0 };
    const { end } = getWindow(delta, start, "start");
    expect(end).toEqual(new Date("2024-01-15T12:00:00Z"));
  });
});

describe("offsetWindow (starting)", () => {
  it("should return 17 * 2 hours from now", () => {
    const start = new Date("2021-01-01T12:00:00Z");
    const delta = { amount: 17, unit: "h" as DeltaUnit, offset: 0 };
    const { end } = offsetWindow(getWindow(delta, start, "start"), 1);
    expect(end).toEqual(new Date("2021-01-02T22:00:00Z"));
  });

  it("should return 27 * 3 days from now", () => {
    const start = new Date("2021-01-01T12:00:00Z");
    const { end } = offsetWindow(getWindow("27d", start, "start"), 2);
    expect(end).toEqual(new Date("2021-03-23T12:00:00Z"));
  });

  it("should return 2 * 3 months from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 2, unit: "m" as DeltaUnit, offset: 0 };
    const { end } = offsetWindow(getWindow(delta, start, "start"), 2);
    expect(end).toEqual(new Date("2021-07-15T12:00:00Z"));
  });

  it("should return 1 * 2 quarters from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const { end } = offsetWindow(getWindow("1q", start, "start"), 1);
    expect(end).toEqual(new Date("2021-07-15T12:00:00Z"));
  });

  it("should return 3 * 3 years from now", () => {
    const start = new Date("2021-01-15T12:00:00Z");
    const delta = { amount: 3, unit: "y" as DeltaUnit, offset: 0 };
    const { end } = offsetWindow(getWindow(delta, start, "start"), 2);
    expect(end).toEqual(new Date("2030-01-15T12:00:00Z"));
  });
});

describe("getWindow (calendar)", () => {
  it("should return the containing calendar week", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("1cw", reference);
    expect(start).toEqual(new Date("2021-01-10T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-17T00:00:00Z"));
  });

  it("should return the containing calendar month", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("1cm", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-02-01T00:00:00Z"));
  });

  it("should return the containing calendar month on a boundary", () => {
    const reference = new Date("2021-01-01T00:00:00Z");
    const { start, end } = getWindow("1cm", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-02-01T00:00:00Z"));
  });

  it("should return the containing four calendar months", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("4cm", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-05-01T00:00:00Z"));
  });

  it("should return the containing quarter", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("1cq", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-04-01T00:00:00Z"));
  });

  it("should return the containing two quarters", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("2cq", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-07-01T00:00:00Z"));
  });

  it("should return the containing year", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = getWindow("1cy", reference);
    expect(start).toEqual(new Date("2021-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2022-01-01T00:00:00Z"));
  });
});

describe("offsetWindow (calendar)", () => {
  it("should return the previous calendar week", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cw", reference), -1);
    expect(start).toEqual(new Date("2021-01-03T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-10T00:00:00Z"));
  });

  it("should return the next calendar week", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cw", reference), 1);
    expect(start).toEqual(new Date("2021-01-17T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-24T00:00:00Z"));
  });

  it("should return the previous calendar month", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cm", reference), -1);
    expect(start).toEqual(new Date("2020-12-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-01T00:00:00Z"));
  });

  it("should return the next calendar month", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cm", reference), 1);
    expect(start).toEqual(new Date("2021-02-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-03-01T00:00:00Z"));
  });

  it("should return the previous four calendar months", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("4cm", reference), -1);
    expect(start).toEqual(new Date("2020-09-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-01T00:00:00Z"));
  });

  it("should return the prior quarter", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cq", reference), -1);
    expect(start).toEqual(new Date("2020-10-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-01T00:00:00Z"));
  });

  it("should return the prior two quarters", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("2cq", reference), -1);
    expect(start).toEqual(new Date("2020-07-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-01T00:00:00Z"));
  });

  it("should return the prior year", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const { start, end } = offsetWindow(getWindow("1cy", reference), -1);
    expect(start).toEqual(new Date("2020-01-01T00:00:00Z"));
    expect(end).toEqual(new Date("2021-01-01T00:00:00Z"));
  });
});
