import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

/** Open a readable stream if a file name is provided, otherwise pass through. */
function openReadStream(
  file: string | NodeJS.ReadableStream
): NodeJS.ReadableStream {
  return typeof file === "string"
    ? createReadStream(file, { encoding: "utf-8" })
    : file;
}

/** Open a writable stream if a file name is provided, otherwise pass through. */
function openWriteStream(
  file: string | NodeJS.WritableStream
): NodeJS.WritableStream {
  return typeof file === "string"
    ? createWriteStream(file, { encoding: "utf-8" })
    : file;
}

/** An asynchronous generator that emits one line of a file at a time. */
export async function* readLines(
  file: string | NodeJS.ReadableStream
): AsyncGenerator<string> {
  const stream = openReadStream(file);
  const lineStream = createInterface({
    input: stream,
  });
  try {
    for await (const line of lineStream) {
      yield line;
    }
  } finally {
    lineStream.close();
  }
}

/** An asynchronous generator that emits JSON lines. */
export async function* readJSONLines<T = unknown>(
  file: string | NodeJS.ReadableStream
): AsyncGenerator<T> {
  for await (const line of readLines(file)) {
    yield JSON.parse(line);
  }
}

/** An asynchronous generator that emits CSV rows as tuples. */
export async function* readCSV<T extends unknown[]>(
  file: string | NodeJS.ReadableStream
): AsyncGenerator<T> {
  for await (const line of readLines(file)) {
    const row = parse(line)[0] as T;
    yield row;
  }
}

/**
 * An asynchronous generator that emits CSV rows as objects.
 *
 * The first row of the CSV file is assumed to be the header row.
 * The header row is used to map the columns to object keys.
 */
export async function* readCSVDict<T extends Record<string, unknown>>(
  fileName: string
): AsyncGenerator<T> {
  let header: string[] | undefined;
  for await (const row of readCSV(fileName)) {
    if (header === undefined) {
      header = row as string[];
      continue;
    }

    const obj = Object.fromEntries(
      header.map((key, index) => [key, row[index]])
    );
    yield obj as T;
  }
}

/** A CSV writer that writes rows from tuples. */
export class CSVWriter<T extends unknown[] = unknown[]> {
  stream: NodeJS.WritableStream;

  private static finalizer = new FinalizationRegistry(
    (stream: NodeJS.WritableStream) => {
      stream.end();
    }
  );

  constructor(file: string | NodeJS.WritableStream) {
    this.stream = openWriteStream(file);
    CSVWriter.finalizer.register(this, this.stream);
  }

  writeRow(row: T) {
    this.stream.write(stringify([row]));
  }

  close() {
    CSVWriter.finalizer.unregister(this);
    this.stream.end();
  }
}

/** A CSV writer that writes rows from objects. */
export class CSVDictWriter<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  private writer: CSVWriter;
  private fields: string[];

  private static finalizer = new FinalizationRegistry((writer: CSVWriter) => {
    writer.close();
  });

  constructor(file: string | NodeJS.WritableStream, fields: string[]) {
    this.writer = new CSVWriter(file);
    this.fields = fields;
    CSVDictWriter.finalizer.register(this, this.writer);
  }

  writeHeader() {
    this.writer.writeRow(this.fields);
  }

  writeRow(row: T) {
    const values = this.fields.map((field) => row[field]);
    this.writer.writeRow(values);
  }

  close() {
    CSVDictWriter.finalizer.unregister(this);
    this.writer.close();
  }
}
