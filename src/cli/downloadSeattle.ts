/**
 * @file downloadSeattle.ts
 *
 * Download public data from the city of Seattle.
 */

import { program } from "commander";

import { sleep } from "../utils";
import { assert, assertDefined } from "../utils/assert";
import { CSVDictWriter } from "../utils/files";
import { buildURL, get } from "../utils/requests";

/** Well-known public Seattle dataset URLs. */
const KNOWN_DATASETS: Record<string, string> = {
  csr: "https://data.seattle.gov/resource/5ngg-rpne.json",
  "realtime-911": "https://data.seattle.gov/resource/kzjm-xkqj.json",
  "call-911": "https://data.seattle.gov/resource/33kz-ixgy.json",
};

program
  .description("Download public data from the city of Seattle")
  .argument(
    "<url>",
    "A well-known dataset name (like csr) or a URL to download from"
  )
  .option("-o, --offset <number>", "Offset for data download", parseInt, 0)
  .option("-l, --limit <number>", "Limit for data download", parseInt, 1000)
  .action(main);

async function main(
  urlOrDataset: string,
  options: { offset: number; limit: number }
) {
  const url = KNOWN_DATASETS[urlOrDataset] || urlOrDataset;
  let { offset } = options;
  const { limit } = options;
  let writer: CSVDictWriter | null = null;

  // Keep downloading data until we get all the data
  let data: Array<unknown> | null = null;
  do {
    console.error(
      `${offset.toLocaleString()}:${limit.toLocaleString()} @ ${url}`
    );

    const queryParams = {
      $offset: offset.toString(),
      $limit: limit.toString(),
    };
    const finalUrl = buildURL(url, queryParams);

    // Keep retrying until we get a response with this limit and offset
    let response: Response | null = null;
    while (response === null) {
      try {
        response = await get(finalUrl);
        if (!response.ok) {
          throw new Error(`Unexpected status code: ${response.status}`);
        }
      } catch (e: unknown) {
        response = null;
        console.error(`Failed to download data: ${e}... Retrying...`);
        await sleep(5000);
      }
    }

    data = await response.json();
    assert(Array.isArray(data));

    // If we haven't written the header yet, write it now
    if (!writer) {
      const fieldNamesData = response.headers.get("X-SODA2-Fields");
      assertDefined(fieldNamesData);
      const fieldNames = JSON.parse(fieldNamesData);
      writer = new CSVDictWriter(process.stdout, fieldNames);
      writer.writeHeader();
    }

    if (data) {
      for (const row of data) {
        writer.writeRow(row as Record<string, unknown>);
      }
      offset += data.length;
    }
  } while (data && data.length === limit);
}

program.parse(process.argv);
