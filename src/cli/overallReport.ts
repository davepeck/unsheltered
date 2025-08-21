/**
 * @file overallReport.ts
 *
 * Generate overall report about the CSR
 */

import { program } from "commander";
import { getOverallReport } from "../pipe/overall";
import { stringifyJSON } from "../utils/json";
import { getWindow } from "../utils/windows";

program
  .description("Generate overall report counts from the CSR")
  .requiredOption("--csr <path>", "Path to the CSR CSV file")
  .action(main);

async function main(options: { safeZones: string; csr: string }) {
  const delta = "1cw";
  const start = new Date("2022-06-05T00:00:00Z");
  const { end } = getWindow(delta, new Date());

  const overallReport = await getOverallReport(options.csr, start, end, delta);

  console.log(stringifyJSON(overallReport));
}

program.parse(process.argv);
