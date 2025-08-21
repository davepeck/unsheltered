import { program } from "commander";
import { OSMDatabase } from "../osm/database";
import { outsetSafeZones, safeZones } from "../pipe/safeZones";
import { makeIdIndex } from "../utils/indexed";
import { stringifyJSON } from "../utils/json";

// This script requires a full extract of the Seattle OSM data, in XML 
// format, to be available at the specified path.
// 
// The specific expected bounding box is:
// <bounds minlat="47.4955000" minlon="-122.4360000" maxlat="47.7342000" maxlon="-122.2361000"/>

const OSM_URL = new URL("/tmp/seattle.osm", import.meta.url);
const OSM_PATH = OSM_URL.pathname;

async function main() {
  const osmDatabase = await OSMDatabase.load(OSM_PATH);
  const zones = safeZones(osmDatabase);
  const outsetZones = outsetSafeZones(zones, 250.0);
  const indexedZones = makeIdIndex(outsetZones);
  console.log(stringifyJSON(indexedZones));
}

program.description("Generates a collection of known safe zones.").action(main);
program.parse(process.argv);
