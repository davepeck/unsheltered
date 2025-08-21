import type { OSMDatabase } from "../osm/database";
import type { OSMItem } from "../osm/items";
import { OSMIndexer, outsetItems } from "../osm/items";

/** All available safe zone kinds. */
export type SafeZoneKind = "library" | "school" | "childCare" | "park";

/** A runtime constant of all available safe zone kinds. */
export const SAFE_ZONE_KINDS: Record<
  SafeZoneKind,
  { singular: string; plural: string }
> = {
  library: { singular: "library", plural: "libraries" },
  school: { singular: "school", plural: "schools" },
  childCare: { singular: "child care", plural: "child cares" },
  park: { singular: "park", plural: "parks" },
};

/** A safe zone item. */
export interface SafeZone extends OSMItem {
  safeZoneKind: SafeZoneKind;
}

/** Get parks from an indexer, and filter down to those we like. */
function getParks(indexer: OSMIndexer): OSMItem[] {
  return indexer
    .getItems("leisure", "park")
    .filter(
      (park) =>
        park.tags["wikidata"] || park.tags["operator"] || park.tags["website"]
    );
}

/** Returns a collection of safe zones. */
export function safeZones(db: OSMDatabase): SafeZone[] {
  const indexer = new OSMIndexer(db);
  const libraries = indexer
    .getItems("amenity", "library")
    .map((item) => ({ ...item, safeZoneKind: "library" as SafeZoneKind }));
  const schools = indexer
    .getItems("amenity", "school")
    .map((item) => ({ ...item, safeZoneKind: "school" as SafeZoneKind }));
  const childCares = indexer
    .getItems("amenity", "childcare")
    .map((item) => ({ ...item, safeZoneKind: "childCare" as SafeZoneKind }));
  const parks = getParks(indexer).map((item) => ({
    ...item,
    safeZoneKind: "park" as SafeZoneKind,
  }));
  return [...libraries, ...schools, ...childCares, ...parks];
}

/** Outsets a collection of safe zones. */
export function outsetSafeZones(
  safeZones: SafeZone[],
  distanceFt: number
): SafeZone[] {
  return outsetItems(safeZones, distanceFt);
}
