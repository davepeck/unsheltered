import { fastMax } from "../utils/fastMath";
import { type DeltaString, type ParsableDelta } from "../utils/windows";
import {
  type Histogram,
  buildHistogram,
  getHistogramMinMax,
} from "./histogram";
import {
  DEFAULT_KINDS,
  type KindTuple,
  type Report,
  type ReportKind,
  type SimpleReports,
  getReportKey,
  getSimpleReports,
} from "./reports";
import { type SafeZone } from "./safeZones";

/**
 * -----------------------------------------------------------------------------
 * CSR-wide timelines
 * -----------------------------------------------------------------------------
 */

/** A histogram of *all* unique reports in a given timeframe of a given kind. */
export interface Timeline {
  kind: ReportKind;
  historicalCount: number;
  histogram: Histogram;
  histogramMax: number;
}

export async function getTimelines(
  csrPath: string,
  start: Date,
  end: Date,
  delta: ParsableDelta,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<Timeline[]> {
  const timelines = await Promise.all(
    kinds.map(async ([prefix, kind]) => {
      const query = `
				SELECT
					CAST(COUNT(*) AS INTEGER) as count,
					ARRAY_AGG(createddate ORDER BY createddate ASC) as dates
				FROM read_csv('${csrPath}', strict_mode=false)
				WHERE webintakeservicerequests LIKE '${prefix}%'
				AND createddate >= '${start.toISOString()}'
				AND createddate < '${end.toISOString()}'
			`;

      const { DuckDBInstance } = await import("@duckdb/node-api");
      const instance = await DuckDBInstance.create();
      const connection = await instance.connect();
      const reader = await connection.run(query);
      const rows = await reader.getRowObjects();
      connection.close();
      type RawRow = {
        count: number;
        dates: { items: unknown[] };
      };
      const row = rows[0] as unknown as RawRow;
      const { count, dates } = row;
      const fixedDates = dates.items.map(
        (date) => new Date(date as unknown as string)
      );
      const histogram = buildHistogram(start, end, delta, fixedDates);
      const { max } = getHistogramMinMax(histogram);
      return {
        kind,
        historicalCount: count,
        histogram,
        histogramMax: max,
      };
    })
  );
  return timelines;
}

/**
 * -----------------------------------------------------------------------------
 * Report-specific timelines
 * -----------------------------------------------------------------------------
 */

/** A report for a specific location/kind, with all report dates. */
export interface ReportWithDates extends Report {
  dates: Date[];
}

/** Extra data for a report */
export interface ReportHistogramData {
  historicalCount: number;
  histogram: Histogram;
  histogramMax: number;
}

/** A report for a specific location/kind, with a histogram of reports. */
export interface ReportWithHistogram extends Report, ReportHistogramData {}

export async function getReportsWithDates(
  csrPath: string,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<ReportWithDates[]> {
  const kindsClause = kinds
    .map(([prefix]) => `webintakeservicerequests LIKE '${prefix}%'`)
    .join(" OR ");

  const kindCases = kinds
    .map(
      ([prefix, kind]) =>
        `WHEN webintakeservicerequests LIKE '${prefix}%' THEN '${kind}'`
    )
    .join(" ");

  const query = `
		SELECT        
      FIRST(location ORDER BY location ASC) as loc, 
		  longitude as lon, 
		  latitude as lat, 
		  CASE ${kindCases} ELSE 'unknown' END as kind,
		  CAST(COUNT(*) AS INTEGER) as count,
		  ARRAY_AGG(createddate ORDER BY createddate ASC) as dates
		FROM read_csv('${csrPath}', strict_mode=false)
		WHERE (${kindsClause})
		AND latitude IS NOT NULL 
		AND longitude IS NOT NULL
		GROUP BY longitude, latitude, kind
		ORDER BY count DESC
	`;

  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();
  const reader = await connection.run(query);
  const rows = await reader.getRowObjects();
  connection.close();
  type RawRow = Omit<ReportWithDates, "dates"> & {
    dates: { items: unknown[] };
  };
  return (rows as unknown as RawRow[]).map((row) => {
    return {
      ...row,
      dates: row.dates.items.map((date) => new Date(date as unknown as string)),
    };
  });
}

export async function getReportsWithHistograms(
  csrPath: string,
  start: Date,
  end: Date,
  delta: ParsableDelta,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<ReportWithHistogram[]> {
  const reports = await getReportsWithDates(csrPath, kinds);

  // sanity check: there must be exactly one report per key
  // use sets
  const keySet = new Set<string>();
  for (const report of reports) {
    const key = getReportKey(report);
    if (keySet.has(key)) {
      throw new Error("Duplicate report keys found!");
    }
    keySet.add(key);
  }

  return reports.map((report) => {
    const histogram = buildHistogram(start, end, delta, report.dates);
    const { max } = getHistogramMinMax(histogram);

    return {
      ...report,
      historicalCount: report.dates.length,
      histogram,
      histogramMax: max,
    };
  });
}

export interface SimpleReportsWithTimelines extends SimpleReports {
  /** A timeline of all reports in a given timeframe of a given kind. */
  timelines: Record<ReportKind, Timeline>;

  /** The maximum histogram value for any timeline. */
  timelineMax: number;

  /** For each unique report key, a histogram */
  histograms: Record<string, ReportHistogramData>;

  /** The maximum histogram value for any report. */
  histogramMax: number;
}

/** Build a simplified report data structure with bonus timeline information. */
export async function getSimpleReportsWithTimelines(
  csrPath: string,
  deltas: DeltaString[],
  safeZonesIndex: Record<string, SafeZone>,
  start: Date,
  end: Date,
  delta: ParsableDelta,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<SimpleReportsWithTimelines> {
  console.error("Building simple reports...");
  const simpleReports = await getSimpleReports(
    csrPath,
    deltas,
    safeZonesIndex,
    kinds
  );
  console.error("Building overall timelines...");
  const timelinesList = await getTimelines(csrPath, start, end, delta, kinds);
  const timelineMax = fastMax(
    timelinesList.map((timeline) => timeline.histogramMax)
  );
  const timelines = Object.fromEntries(
    timelinesList.map((timeline) => [timeline.kind, timeline])
  ) as Record<ReportKind, Timeline>;
  console.error("Building reports with histograms...");
  const reportsWithHistograms = await getReportsWithHistograms(
    csrPath,
    start,
    end,
    delta,
    kinds
  );
  // convert to the Record structure using getReportKey
  const histograms = Object.fromEntries(
    reportsWithHistograms.map((report) => [getReportKey(report), report])
  ) as Record<string, ReportHistogramData>;
  const histogramMax = fastMax(
    reportsWithHistograms.map((report) => report.histogramMax)
  );
  return {
    ...simpleReports,
    timelines,
    timelineMax,
    histograms,
    histogramMax,
  };
}

export type SlimReportHistogramData = Omit<ReportHistogramData, "histogram"> & {
  buckets: number[];
};

export interface SlimReportsWithTimelines extends SimpleReports {
  // histogramMeta: {
  //   /** Start date for all histograms. */
  //   start: Date;

  //   /** End date for all histograms. */
  //   end: Date;

  //   /** Representative dates for all histograms. */
  //   labels: string[];
  // };

  /** A timeline of all reports in a given timeframe of a given kind. */
  timelines: Record<ReportKind, number[]>;

  /** The maximum histogram value for any timeline. */
  timelineMax: number;

  // /** For each unique report key, a histogram */
  // histograms: Record<string, SlimReportHistogramData>;

  // /** The maximum histogram value for any report. */
  // histogramMax: number;
}

/** Build a slim simplified report data structure with bonus timeline information. */
export async function getSlimReports(
  csrPath: string,
  deltas: DeltaString[],
  safeZonesIndex: Record<string, SafeZone>,
  start: Date,
  end: Date,
  delta: ParsableDelta,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<SlimReportsWithTimelines> {
  const fat = await getSimpleReportsWithTimelines(
    csrPath,
    deltas,
    safeZonesIndex,
    start,
    end,
    delta,
    kinds
  );
  console.error("Slimming down reports...");
  const { timelines, /* histogramMax, histograms, */ timelineMax } = fat;
  // const histogramMeta = {
  //   start,
  //   end,
  //   labels: Array.from(
  //     Object.keys(timelines[DEFAULT_KINDS[0][1]].histogram.data)
  //   ),
  // };
  const slimTimelines = Object.fromEntries(
    Object.entries(timelines).map(([kind, timeline]) => [
      kind,
      Object.values(timeline.histogram.data),
    ])
  ) as Record<ReportKind, number[]>;
  // const slimHistograms = Object.fromEntries(
  //   Object.entries(histograms).map(
  //     ([key, { historicalCount, histogramMax, histogram }]) => [
  //       key,
  //       {
  //         historicalCount,
  //         histogramMax,
  //         buckets: Object.values(histogram.data),
  //       },
  //     ]
  //   )
  // ) as Record<string, SlimReportHistogramData>;
  return {
    safeZonesIndex: fat.safeZonesIndex,
    windowResults: fat.windowResults,
    lastDate: fat.lastDate,
    // histogramMeta,
    timelines: slimTimelines,
    // histogramMax,
    // histograms: slimHistograms,
    timelineMax,
  };
}
