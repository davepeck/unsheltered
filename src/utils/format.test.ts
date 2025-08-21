import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateForDuckDB,
  formatNumber,
  formatPercent,
  formatWindow,
} from "./format";
import { getWindow, offsetWindow } from "./windows";

describe("formatNumber()", () => {
  it("should format a number", () => {
    expect(formatNumber(1234)).toEqual("1,234");
  });
});

describe("formatPercent()", () => {
  it("should format a percentage", () => {
    expect(formatPercent(0.1234)).toEqual("12%");
  });
});

describe("formatDate()", () => {
  it("should format a date", () => {
    const date = new Date("2021-01-01T12:00:00Z");
    expect(formatDate(date)).toEqual("Friday, Jan 1, 2021");
  });
});

describe("formatDateForDuckDB()", () => {
  it("should format a date for DuckDB", () => {
    const date = new Date("2021-01-01T12:00:00Z");
    expect(formatDateForDuckDB(date)).toEqual("2021-01-01");
  });
});

describe("formatWindow (relative)", () => {
  it("should format a window", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const window = getWindow("1q", end);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("Oct 1, 2020 - Jan 1, 2021");
  });

  it("should format a window with multiple units", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const window = getWindow("2m", end);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("Nov 1, 2020 - Jan 1, 2021");
  });

  it("should format a window ending today", () => {
    const end = new Date("2021-01-01T12:00:00Z");
    const today = new Date("2021-01-01T00:00:00Z");
    const window = getWindow("1q", end);
    const formatted = formatWindow(window, today);
    expect(formatted).toEqual("Last quarter");
  });
});

describe("formatWindow (calendar)", () => {
  it("should format a month window", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const window = getWindow("1cm", reference);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("January 2021");
  });

  it("should format a quarter window", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const window = getWindow("1cq", reference);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("Q1 2021");
  });

  it("should format a year window", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const window = getWindow("1cy", reference);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("CY2021");
  });

  it("should format a 4 month window", () => {
    const reference = new Date("2021-01-15T12:00:00Z");
    const window = getWindow("4cm", reference);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("Jan-Apr 2021");
  });

  it("it should format a 4 month window over a year boundary", () => {
    const reference = new Date("2021-03-01T00:00:00Z");
    const window = offsetWindow(getWindow("4cm", reference), -1);
    const formatted = formatWindow(window);
    expect(formatted).toEqual("Nov 2020 - Feb 2021");
  });
});
