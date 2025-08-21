import { assert, assertNever } from "./assert";
import {
  isCalendarUnit,
  isCalendarWindow,
  type ParsableDelta,
  parseDelta,
  type Window,
} from "./windows";

/** Format a number with commas or locale-appropriate separators. */
export function formatNumber(number: number): string {
  return number.toLocaleString("en-US");
}

/** Format a percentage (0.0 - 1.0) as a human-friendly string. */
export function formatPercent(percentage: number): string {
  return `${Math.round(percentage * 100)}%`;
}

export const PACIFIC_TIMEZONE = "America/Los_Angeles";

/** Format a date as a human-friendly string. */
export function formatDate(
  date: Date,
  timeZone: string = PACIFIC_TIMEZONE
): string {
  return date.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format date in duckdb compatible format YYYY-MM-DD */
export function formatDateForDuckDB(
  date: Date,
  timeZone: string = PACIFIC_TIMEZONE
): string {
  const notQuite = date.toLocaleDateString("en-US", {
    timeZone,
  });
  const [month, day, year] = notQuite.split("/");
  // format as YYYY-MM-DD string
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Another name for the same thing. */
export const formatDateYYYYMMDD = formatDateForDuckDB;

/** Return a human readable description of a parsaable delta */
export function formatDelta(delta: ParsableDelta): string {
  const { amount, unit } = parseDelta(delta);
  switch (unit) {
    case "h":
      return amount === 1 ? "hour" : `${amount} hours`;
    case "d":
      return amount === 1 ? "day" : `${amount} days`;
    case "m":
      return amount === 1 ? "month" : `${amount} months`;
    case "q":
      return amount === 1 ? "quarter" : `${amount} quarters`;
    case "y":
      return amount === 1 ? "year" : `${amount} years`;
    case "cw":
      return amount === 1 ? "calendar week" : `${amount} calendar weeks`;
    case "cm":
      return amount === 1 ? "calendar month" : `${amount} calendar months`;
    case "cq":
      return amount === 1 ? "calendar quarter" : `${amount} calendar quarters`;
    case "cy":
      return amount === 1 ? "calendar year" : `${amount} calendar years`;
    default:
      assertNever(unit);
  }
}

/** Return a human readable description of a calendar window */
function formatCalendarWindow(window: Window): string {
  const { delta, start, end } = window;
  assert(isCalendarUnit(delta.unit));
  if (delta.amount === 1) {
    switch (delta.unit) {
      case "cw":
        return `Week of ${start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })}`;
      case "cm":
        return `${start.toLocaleString("default", { month: "long", timeZone: "UTC" })} ${start.getUTCFullYear()}`;
      case "cq":
        return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`;
      case "cy":
        return `CY${start.getUTCFullYear()}`;
      default:
        assertNever(delta.unit);
    }
  }
  // Return "Sep 2020 - Mar 2021" if we span a year boundary, otherwise
  // "Sep-Dec 2020"
  const startString = start.toLocaleString("default", {
    month: "short",
    timeZone: "UTC",
  });
  // Push 'end' back by one millisecond to avoid including the end month
  const pushedEnd = new Date(end);
  pushedEnd.setUTCMilliseconds(pushedEnd.getUTCMilliseconds() - 1);
  const endString = pushedEnd.toLocaleString("default", {
    month: "short",
    timeZone: "UTC",
  });
  const startYear = start.getUTCFullYear();
  const endYear = pushedEnd.getUTCFullYear();
  if (startYear === endYear) {
    return `${startString}-${endString} ${startYear}`;
  } else {
    return `${startString} ${startYear} - ${endString} ${endYear}`;
  }
}

/** Return a human readable description of a relative window */
function formatRelativeWindow(window: Window, today?: Date): string {
  const now = today ?? new Date();
  const { delta, end } = window;
  assert(!isCalendarUnit(delta.unit));
  const isEndToday =
    end.getUTCFullYear() === now.getUTCFullYear() &&
    end.getUTCMonth() === now.getUTCMonth() &&
    end.getUTCDate() === now.getUTCDate();
  const pluralizeLast = (amount: number, unit: string) =>
    amount === 1 ? `Last ${unit}` : `Last ${amount} ${unit}s`;

  if (isEndToday) {
    switch (delta.unit) {
      case "h":
        return pluralizeLast(delta.amount, "hour");
      case "d":
        return pluralizeLast(delta.amount, "day");
      case "m":
        return pluralizeLast(delta.amount, "month");
      case "q":
        return pluralizeLast(delta.amount, "quarter");
      case "y":
        return pluralizeLast(delta.amount, "year");
      default:
        assertNever(delta.unit);
    }
  }
  const endString = formatDate(end);
  switch (delta.unit) {
    case "h":
      return `${delta.amount} hour${delta.amount !== 1 ? "s" : ""} ending ${endString}`;
    case "d":
    case "m":
    case "q":
    case "y": {
      const startString = window.start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      const endPushed = new Date(end);
      endPushed.setUTCMilliseconds(endPushed.getUTCMilliseconds() - 1);
      const endStringWithYear = endPushed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
      const startYear = window.start.getUTCFullYear();
      const endYear = endPushed.getUTCFullYear();
      if (startYear === endYear) {
        return `${startString} - ${endStringWithYear}`;
      } else {
        const startStringWithYear = window.start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });
        return `${startStringWithYear} - ${endStringWithYear}`;
      }
    }
    default:
      assertNever(delta.unit);
  }
}

/** Return a human readable description of a window */
export function formatWindow(window: Window, today?: Date): string {
  if (isCalendarWindow(window)) {
    return formatCalendarWindow(window);
  } else {
    return formatRelativeWindow(window, today);
  }
}
