import { formatDateForDuckDB } from "../utils/format";
import { type ParsableDelta } from "../utils/windows";
import { getBucketDates } from "./histogram";
import { DEFAULT_KINDS, type KindTuple, type ReportKind } from "./reports";

export interface OverallReportDetails {
  count: number;
  buckets: number[];
  max: number;
}

export interface OverallReport {
  all: OverallReportDetails;
  kinds: Record<ReportKind, OverallReportDetails>;
  histogramMeta: {
    /** Start date for all histograms. */
    start: Date;

    /** End date for all histograms. */
    end: Date;

    /** Parsable delta for all histograms. */
    delta: ParsableDelta;

    /** Representative dates for all histograms. */
    labels: string[];
  };
}

export async function getOverallReport(
  csrPath: string,
  start: Date,
  end: Date,
  delta: ParsableDelta,
  kinds: KindTuple[] = DEFAULT_KINDS
): Promise<OverallReport> {
  const { DuckDBInstance } = await import("@duckdb/node-api");
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();
  const bucketDates = getBucketDates(start, end, delta);

  // Initialize data structures to store results
  const kindsData: Record<string, OverallReportDetails> = {};
  kinds.forEach(([, kindName]) => {
    kindsData[kindName] = { count: 0, buckets: [], max: 0 };
  });

  const all: OverallReportDetails = { count: 0, buckets: [], max: 0 };

  // Build case expressions for each kind
  const caseExpressions = kinds
    .map(
      ([prefix, kindName]) =>
        `CAST(COUNT(DISTINCT CASE WHEN webintakeservicerequests LIKE '${prefix}%' THEN Latitude || ',' || Longitude END) AS INTEGER) AS "${kindName}"`
    )
    .join(", ");

  // Process each time bucket with a single query
  for (let i = 0; i < bucketDates.length - 1; i++) {
    const bucketStart = bucketDates[i][0];
    const bucketEnd = bucketDates[i + 1][0];

    const query = `
      SELECT 
        ${caseExpressions},
        CAST(COUNT(DISTINCT Latitude || ',' || Longitude) AS INTEGER) AS "all"
      FROM read_csv('${csrPath}', strict_mode=false)
      WHERE 
        createddate >= '${formatDateForDuckDB(bucketStart)}' AND 
        createddate < '${formatDateForDuckDB(bucketEnd)}'
    `;

    const reader = await connection.run(query);
    const rows = await reader.getRowObjects();
    const row = rows[0];

    // Process counts for each kind
    for (const [, kindName] of kinds) {
      const count = (row[kindName]?.valueOf() as number) || 0;
      kindsData[kindName].buckets.push(count);
      kindsData[kindName].count += count;
      kindsData[kindName].max = Math.max(kindsData[kindName].max, count);
    }

    // Process the total count
    const allCount = (row.all?.valueOf() as number) || 0;
    all.buckets.push(allCount);
    all.count += allCount;
    all.max = Math.max(all.max, allCount);
  }

  connection.close();

  return {
    all,
    kinds: kindsData as Record<ReportKind, OverallReportDetails>,
    histogramMeta: {
      start,
      end,
      delta,
      labels: bucketDates.map(([, label]) => label),
    },
  };
}
