/**
 * Utilities for working with JSON.
 */

import fs from "fs/promises";

export function dateReviver(_: string, value: unknown): unknown {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)
  ) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
}

export function dateReplacer(key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/** Stringify an object with JSON, supporting dates. */
export function stringifyJSON<T>(value: T, space?: string | number): string {
  return JSON.stringify(value, dateReplacer, space);
}

/** Parse an object with JSON, supporting dates. */
export function parseJSON<T>(text: string): T {
  return JSON.parse(text, dateReviver);
}

/** Load a JSON file, parsing the contents. */
export async function loadJSONFile<T>(path: string): Promise<T> {
  const text = await fs.readFile(path, "utf-8");
  return parseJSON(text);
}
