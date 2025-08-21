import { fastMax, fastMin } from "../utils/fastMath";
import { formatDateYYYYMMDD } from "../utils/format";
import {
  type Delta,
  getWindow,
  type ParsableDelta,
  parseDelta,
} from "../utils/windows";

/** Data for an arbitrary histogram. */
export type HistogramBuckets = Record<string, number>;

/** A histogram over a time period. */
export interface Histogram {
  data: HistogramBuckets;
  start: Date;
  end: Date;
  delta: Delta;
}

/** Generate the bucket dates for a histogram */
function buildBucketDates(
  start: Date,
  end: Date,
  delta: ParsableDelta
): [Date, string][] {
  const dates = [];
  let current = getWindow(delta, start, "start");
  while (current.start < end) {
    const yyyymmdd = formatDateYYYYMMDD(current.start, "UTC");
    dates.push([current.start, yyyymmdd] as [Date, string]);
    current = getWindow(delta, current.end, "start");
  }
  const yyyymmdd = formatDateYYYYMMDD(current.start, "UTC");
  dates.push([current.start, yyyymmdd] as [Date, string]);
  return dates;
}

// NOTE: this is all performance optimization, of course. I was
// surprised to discover that, when building histograms for the full
// historical Find-It-Fix-It data set with small windows, this provided
// a massive speed-up (from minutes to seconds).

/** In-memory cache of bucket dates for histograms. */
const bucketDatesCache: Record<string, [Date, string][]> = {};

/** Return a cache key for the bucketDatesCache. */
function getBucketDatesCacheKey(
  start: Date,
  end: Date,
  delta: ParsableDelta
): string {
  return `${start.toISOString()}|${end.toISOString()}|${JSON.stringify(delta)}`;
}

/** Return, or compute and return, the bucket dates for a histogram. */
export function getBucketDates(
  start: Date,
  end: Date,
  delta: ParsableDelta
): [Date, string][] {
  const bucketDatesKey = getBucketDatesCacheKey(start, end, delta);
  let bucketDates = bucketDatesCache[bucketDatesKey];
  if (!bucketDates) {
    bucketDates = buildBucketDates(start, end, delta);
    bucketDatesCache[bucketDatesKey] = bucketDates;
  }
  return bucketDates;
}

/** Given a start and end date, a ParsableDelta, and an array of dates, return a histogram. */
export function buildHistogram(
  start: Date,
  end: Date,
  delta: ParsableDelta,
  dates: Date[]
): Histogram {
  const bucketDates = getBucketDates(start, end, delta);
  const data: HistogramBuckets = {};
  const { amount, unit } = parseDelta(delta);
  let dateIndex = 0;
  for (let i = 0; i < bucketDates.length - 1; i++) {
    const bucketDate = bucketDates[i][0];
    const nextBucketDate = bucketDates[i + 1][0];
    const yyyymmdd = bucketDates[i][1];
    let count = 0;
    while (dateIndex < dates.length && dates[dateIndex] < nextBucketDate) {
      if (dates[dateIndex] >= bucketDate) {
        count++;
      }
      dateIndex++;
    }
    data[yyyymmdd] = count;
  }
  return { data, start, end, delta: { amount, unit } };
}

/** Get the min and max values of a histogram. */
export function getHistogramMinMax(histogram: Histogram): {
  min: number;
  max: number;
} {
  const values = Object.values(histogram.data);
  return { min: fastMin(values), max: fastMax(values) };
}
