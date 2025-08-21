/**
 * @file simpleReports.ts
 *
 * Generate simplified CSR reports suitable for rapid query & display.
 */

import { program } from "commander";
import { type SafeZone } from "../pipe/safeZones";
import { getSlimReports } from "../pipe/timeline";
import { loadJSONFile, stringifyJSON } from "../utils/json";
import { type DeltaString, getWindow } from "../utils/windows";

program
  .description("Generate simplified reports and intersections with safe zones")
  .requiredOption("--safe-zones <path>", "Path to the safe zones CSV file")
  .requiredOption("--csr <path>", "Path to the CSR CSV file")
  .action(main);

const DELTAS: DeltaString[] = ["10d", "1m", "1y"];

async function main(options: { safeZones: string; csr: string }) {
  const safeZonesIndex = (await loadJSONFile(options.safeZones)) as Record<
    string,
    SafeZone
  >;

  const delta = "2cw";
  // start date of 2022-06-01 (or -05 for a sunday)
  const start = new Date("2022-06-05T00:00:00Z");
  // end date should include the current period
  const { end } = getWindow(delta, new Date());

  const slimReports = await getSlimReports(
    options.csr,
    DELTAS,
    safeZonesIndex,
    start,
    end,
    delta
  );
  console.log(stringifyJSON(slimReports));
}

program.parse(process.argv);
