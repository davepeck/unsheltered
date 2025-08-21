/**
 * @description Utilities for working with time windows.
 */
import { assert, assertNever } from "./assert";

/** A relative unit of time */
type RelativeUnit =
  | "h" // Hours (relative)
  | "d" // Days (relative)
  | "m" // Months (non-calendar, e.g., 30-day rolling window)
  | "q" // Quarters (non-calendar, rolling)
  | "y"; // Years (non-calendar, rolling)

/** A calendar unit of time */
type CalendarUnit =
  | "cw" // Calendar week (Sun - Sun)
  | "cm" // Calendar month (Feb 1 - Mar 1)
  | "cq" // Calendar quarters (Apr 1 - Jul 1)
  | "cy"; // Calendar years (Jan 1 - Jan 1)

/** A unit of time */
export type DeltaUnit = RelativeUnit | CalendarUnit;

/** Return true if the unit is a calendar unit */
export function isCalendarUnit(unit: DeltaUnit): unit is CalendarUnit {
  return unit === "cw" || unit === "cm" || unit === "cq" || unit === "cy";
}

/** A string describing a time delta and offset. */
export type DeltaString =
  `${number}${DeltaUnit}${"" | `+${number}` | `-${number}`}`;

/** A parsed representation of a string describing a time delta */
export interface Delta {
  amount: number;
  unit: DeltaUnit;
}

/** A delta with an optional parsed offset. */
export interface DeltaWithOffset extends Delta {
  offset: number;
}

/** Any accepted delta type */
export type ParsableDelta = Delta | DeltaWithOffset | DeltaString;

/** Return true if the delta is a calendar m/q/y aligned delta */
export function isCalendarDelta(delta: Delta): boolean {
  return isCalendarUnit(delta.unit);
}

/** A fully realized time window */
export interface Window {
  /** The time delta between the start and end of the window */
  delta: Delta;

  /** The start of the window (inclusive) */
  start: Date;

  /** The end of the window (exclusive) */
  end: Date;
}

/** Return true if the window is a calendar m/q/y aligned window */
export function isCalendarWindow(window: Window): boolean {
  return isCalendarDelta(window.delta);
}

/** Parse a delta string into a delta object */
export function parseDelta(delta: ParsableDelta): DeltaWithOffset {
  if (typeof delta === "string") {
    const match = delta.match(/^(\d+)([hdmqy]|cw|cm|cq|cy)([+-]\d+)?$/);
    if (!match) {
      throw new Error(`Invalid delta string: ${delta}`);
    }

    const [, amountStr, unit, offsetStr] = match;
    const amount = parseInt(amountStr);
    const offset = offsetStr ? parseInt(offsetStr) : 0;

    return { amount, unit: unit as DeltaUnit, offset };
  }
  return { offset: 0, ...delta };
}

/** Return a window that ends at `end` (exclusive) */
function getWindowEnding(delta: ParsableDelta, end: Date): Window {
  const parsed = parseDelta(delta);
  const start = new Date(end);
  assert(
    parsed.unit !== "cw" &&
      parsed.unit !== "cm" &&
      parsed.unit !== "cq" &&
      parsed.unit !== "cy"
  );
  switch (parsed.unit) {
    case "h":
      start.setUTCHours(start.getUTCHours() - parsed.amount);
      break;
    case "d":
      start.setUTCDate(start.getUTCDate() - parsed.amount);
      break;
    case "m":
      start.setUTCMonth(start.getUTCMonth() - parsed.amount);
      break;
    case "q":
      start.setUTCMonth(start.getUTCMonth() - parsed.amount * 3);
      break;
    case "y":
      start.setUTCFullYear(start.getUTCFullYear() - parsed.amount);
      break;
    default:
      assertNever(parsed.unit);
  }
  const preoffsetWindow = {
    delta: { amount: parsed.amount, unit: parsed.unit },
    start,
    end,
  };
  return offsetWindow(preoffsetWindow, parsed.offset);
}

/** Return a window that starts at `start` (inclusive) */
function getWindowStarting(delta: ParsableDelta, start: Date): Window {
  const parsed = parseDelta(delta);
  const end = new Date(start);
  assert(
    parsed.unit !== "cw" &&
      parsed.unit !== "cm" &&
      parsed.unit !== "cq" &&
      parsed.unit !== "cy"
  );
  switch (parsed.unit) {
    case "h":
      end.setUTCHours(end.getUTCHours() + parsed.amount);
      break;
    case "d":
      end.setUTCDate(end.getUTCDate() + parsed.amount);
      break;
    case "m":
      end.setUTCMonth(end.getUTCMonth() + parsed.amount);
      break;
    case "q":
      end.setUTCMonth(end.getUTCMonth() + parsed.amount * 3);
      break;
    case "y":
      end.setUTCFullYear(end.getUTCFullYear() + parsed.amount);
      break;
    default:
      assertNever(parsed.unit);
  }
  const preoffsetWindow = {
    delta: { amount: parsed.amount, unit: parsed.unit },
    start,
    end,
  };
  return offsetWindow(preoffsetWindow, parsed.offset);
}

/** Return a calendar month/quarter/year-aligned window containing the `reference` date. */
function getCalendarWindow(delta: ParsableDelta, reference: Date): Window {
  const start = new Date(reference);
  const parsed = parseDelta(delta);

  assert(
    parsed.unit === "cw" ||
      parsed.unit === "cm" ||
      parsed.unit === "cq" ||
      parsed.unit === "cy"
  );

  // zero out the start time
  start.setUTCHours(0, 0, 0, 0);

  let end: Date;
  switch (parsed.unit) {
    case "cw": {
      const day = start.getUTCDay();
      const offsetDays = parsed.offset * parsed.amount * 7;
      start.setUTCDate(start.getUTCDate() - day + offsetDays);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      break;
    }
    case "cm": {
      const month = start.getUTCMonth() + parsed.offset * parsed.amount;
      start.setUTCMonth(month, 1);
      end = new Date(start);
      end.setUTCMonth(start.getUTCMonth() + parsed.amount, 1);
      break;
    }
    case "cq": {
      const quarterStartMonth =
        Math.floor(
          (start.getUTCMonth() + parsed.offset * parsed.amount * 3) / 3
        ) * 3;
      start.setUTCMonth(quarterStartMonth, 1);
      end = new Date(start);
      end.setUTCMonth(start.getUTCMonth() + parsed.amount * 3, 1);
      break;
    }
    case "cy": {
      const year = start.getUTCFullYear() + parsed.offset * parsed.amount;
      start.setUTCFullYear(year, 0, 1);
      end = new Date(start);
      end.setUTCFullYear(start.getUTCFullYear() + parsed.amount, 0, 1);
      break;
    }
    default:
      assertNever(parsed.unit);
  }

  return { delta: { amount: parsed.amount, unit: parsed.unit }, start, end };
}

/**
 * Return a window that utilizes the `reference` date as specified.
 *
 * If the delta is a relative delta, the `anchor` parameter determines whether
 * the window is anchored at the start or end of the window.
 *
 * If the delta is a calendar delta, the window contains the `reference` date;
 * the `anchor` parameter is ignored.
 *
 * Offsets supplied in the delta are applied after the window is created.
 */
export function getWindow(
  delta: ParsableDelta,
  reference: Date,
  anchor: "start" | "end" = "end"
): Window {
  const parsed = parseDelta(delta);
  if (isCalendarDelta(parsed)) {
    return getCalendarWindow(parsed, reference);
  } else if (anchor === "end") {
    return getWindowEnding(parsed, reference);
  } else if (anchor === "start") {
    return getWindowStarting(parsed, reference);
  }
  throw new Error(`Invalid anchor: ${anchor}`);
}

/** Offset a window by a given amount */
export function offsetWindow(window: Window, offset: number = 0): Window {
  if (isCalendarWindow(window)) {
    const { delta, start } = window;
    return getCalendarWindow({ ...delta, offset }, start);
  } else if (offset > 0) {
    let newWindow: Window;
    let newEnd = new Date(window.end);
    let count = offset;
    do {
      newWindow = getWindow(window.delta, newEnd, "start");
      newEnd = newWindow.end;
      count--;
    } while (count > 0);
    return newWindow;
  } else if (offset < 0) {
    let newWindow: Window;
    let newStart = window.start;
    let count = offset;
    do {
      newWindow = getWindow(window.delta, newStart, "end");
      newStart = newWindow.start;
      count++;
    } while (count < 0);
    return newWindow;
  } else {
    return window;
  }
}

/** An async function that can be applied to a window */
export type Windowable<T> = (window: Window) => Promise<T>;

/** A return type indicating the window and the result of processing. */
export interface WindowResult<T> {
  window: Window;
  result: T;
}

/** Process a list of windows with a windowable function */
export async function processWindows<T>(
  windowable: Windowable<T>,
  windows: Window[]
): Promise<WindowResult<T>[]> {
  const results: WindowResult<T>[] = [];
  for (const window of windows) {
    const result = await windowable(window);
    results.push({ window, result });
  }
  return results;
}

/**
 * Process a list of deltas with a windowable function.
 *
 * For each delta, a window is created with the reference date and anchor.
 * The window is then processed with the windowable function.
 *
 * If the delta is a relative delta, the anchor determines whether the window
 * is anchored at the start or end of the window.
 *
 * If the delta is a calendar delta, the window contains the `reference` date;
 * the anchor parameter is ignored.
 *
 * Offsets supplied in the delta are applied after the window is created.
 */
export async function processDeltas<T>(
  windowable: Windowable<T>,
  deltas: ParsableDelta[],
  reference: Date,
  anchor: "start" | "end" = "end"
): Promise<WindowResult<T>[]> {
  const windows = deltas.map((delta) => getWindow(delta, reference, anchor));
  return processWindows(windowable, windows);
}

/** Map a collection of WindowResults, applying the mapping function to result */
export function mapWindowResults<T, U>(
  windowResults: WindowResult<T>[],
  callbackfn: (result: T) => U
): WindowResult<U>[] {
  return windowResults.map(({ window, result }) => ({
    window,
    result: callbackfn(result),
  }));
}
