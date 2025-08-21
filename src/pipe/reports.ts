import { intersectItemsMany } from "../osm/items";
import { formatDateForDuckDB } from "../utils/format";
import {
  getWindow,
  type DeltaString,
  type Window,
  type WindowResult,
} from "../utils/windows";
import type { SafeZone } from "./safeZones";

/** Valid report kinds. */
export type ReportKind =
  | "encampment"
  | "vehicle"
  | "graffiti"
  | "dumping"
  | "litter";

/** A find-it-fix-it report. */
export interface Report {
  /** A human-friendly street address */
  loc: string;

  /** The longitude of the report */
  lon: number;

  /** The latitude of the report */
  lat: number;

  /** The kind of report */
  kind: ReportKind;

  /** The number of reports for this location counted in a given timeframe */
  count: number;
}

export function getReportKey(report: Report): string {
  return `${report.kind}${report.lon}${report.lat}`;
}

export type KindTuple = [string, ReportKind];

export const DEFAULT_KINDS: KindTuple[] = [
  ["Unauthorized Encampment", "encampment"],
  ["Abandoned Vehicle", "vehicle"],
  ["Graffiti", "graffiti"],
  ["Illegal Dumping", "dumping"],
  ["Public Litter", "litter"],
];

/** Query a CSR CSV file for the most recent report date. */
export async function getLastDate(csrPath: string): Promise<Date> {
  const query = `
      SELECT MAX(createddate) as lastDate
      FROM read_csv('${csrPath}', strict_mode=false)
  `;

  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();
  const reader = await connection.run(query);
  const rows = await reader.getRowObjects();
  connection.close();
  return new Date((rows as unknown as { lastDate: Date }[])[0].lastDate);
}

/** Query a CSR CSV file for reports. */
export async function getReports(
  csrPath: string,
  window: Window,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<Report[]> {
  const { start, end } = window;
  const startDateFmt = formatDateForDuckDB(start);
  const endDateFmt = formatDateForDuckDB(end);

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
        CAST(Count(*) AS INTEGER) as count
      FROM read_csv('${csrPath}', strict_mode=false)
      WHERE createddate >= '${startDateFmt}' AND createddate <= '${endDateFmt}'
      AND (${kindsClause})
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
  return rows as unknown as Report[];
}

/** A report with safe zone IDs. */
export interface ReportWithSafeZoneIds extends Report {
  /** The IDs of safe zones that intersect this report */
  safeZoneIds: string[];
}

/** The simplified reports data structure. */
export interface SimpleReports {
  /** All safe zones in the system, indexed by ID */
  safeZonesIndex: Record<string, SafeZone>;

  /** Each window has a list of report IDs that match */
  windowResults: WindowResult<ReportWithSafeZoneIds[]>[];

  /** Most recent report date */
  lastDate: Date;
}

/** Build a simplified report data structure. */
export async function getSimpleReports(
  csrPath: string,
  deltas: DeltaString[],
  safeZonesIndex: Record<string, SafeZone>,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<SimpleReports> {
  const lastDate = await getLastDate(csrPath);
  const safeZones = Object.values(safeZonesIndex);

  const windowResults: WindowResult<ReportWithSafeZoneIds[]>[] = [];

  for (const delta of deltas) {
    const window = getWindow(delta, lastDate);
    const reports = await getReports(csrPath, window, kinds);
    const reportsWithZones = intersectItemsMany(safeZones, reports);
    const reportsWithZoneIds = reportsWithZones.map((report) => ({
      loc: report.loc,
      lon: report.lon,
      lat: report.lat,
      kind: report.kind,
      count: report.count,
      safeZoneIds: report.intersections.map((zone) => zone.id),
    }));
    const windowResult = { window, result: reportsWithZoneIds };
    windowResults.push(windowResult);
  }

  return { safeZonesIndex, windowResults, lastDate };
}
