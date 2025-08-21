import { centroid, point } from "@turf/turf";
import type { LineString, MultiPolygon, Point, Polygon } from "geojson";
import type { Coordinates, Tags } from "./database";
import { OSMDatabase } from "./database";
import {
  AVG_FT_PER_DEG_SEA,
  geometryContains,
  getGeometry,
  outsetGeometry,
} from "./geometry";

/** A simplified representation of an item in OpenStreetMap, with geometry. */
export interface OSMItem {
  id: string;
  kindKey: string;
  kind: string;
  geom: LineString | Point | Polygon | MultiPolygon;
  tags: Tags;
}

/** Return a name (or default) for an OSM item. */
export function getItemName(item: OSMItem): string {
  return item.tags["name"] || `Unnamed ${item.kind} (${item.id})`;
}

/** Return the [lon, lat] of an OSM item. */
export function getItemLonLat(item: OSMItem): [number, number] {
  const center = centroid(item.geom);
  return center.geometry.coordinates as [number, number];
}

/** Build an outset geometry for an OSM item. */
export function outsetItem<T extends OSMItem>(item: T, distanceFt: number): T {
  return {
    ...item,
    geom: outsetGeometry(item.geom, distanceFt),
  };
}

/** Build an outset geometry for a collection of OSM items. */
export function outsetItems<T extends OSMItem>(
  items: T[],
  distanceFt: number
): T[] {
  return items.map((item) => outsetItem(item, distanceFt));
}

/** Find the closest item in a collection to a point. */
export function closestItem<T extends OSMItem>(
  items: T[],
  lon: number,
  lat: number
): [T, number] {
  let closestItem: T | null = null;
  let closestDistance = Infinity;

  items.forEach((item) => {
    const [itemLon, itemLat] = getItemLonLat(item);
    const distance = Math.hypot(itemLon - lon, itemLat - lat);
    if (distance < closestDistance) {
      closestItem = item;
      closestDistance = distance;
    }
  });

  if (!closestItem) throw new Error("No items in collection");
  return [closestItem, closestDistance * AVG_FT_PER_DEG_SEA];
}

/** Remove duplicate items from a collection. */
export function deduplicateItems<T extends OSMItem>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Arbitrary interface for results containing intersections. */
export interface Intersected<T extends OSMItem> {
  intersections: T[];
}

/** Intersect a collection of OSM items with a single coordinate. */
export function intersectItems<T extends OSMItem>(
  items: T[],
  against: Coordinates
): T[] {
  const againstPoint = point([against.lon, against.lat])?.geometry as Point;
  return items.filter((item) => geometryContains(item.geom, againstPoint));
}

/** Intersect a collection of OSM items with a collection of coordinates. */
export function intersectItemsMany<T extends OSMItem, U extends Coordinates>(
  items: T[],
  againsts: U[]
): (U & Intersected<T>)[] {
  return againsts.map((against) => {
    const intersections = intersectItems(items, against);
    const intersected = { ...against, intersections };
    return intersected;
  });
}

/** A tool for indexing an OSM Database. */
export class OSMIndexer {
  private db: OSMDatabase;

  constructor(db: OSMDatabase) {
    this.db = db;
  }

  getItems(kindKey: string, kindValue?: string): OSMItem[] {
    const items: OSMItem[] = [];

    // Process all elements -- delay resolving them until we know they match.
    for (const element of this.db.elements) {
      if (!(kindKey in element.tags)) continue;
      if (kindValue && element.tags[kindKey] !== kindValue) continue;

      const resolved = this.db.resolveElement(element);
      const geometry = getGeometry(resolved);
      const item = {
        id: element.id,
        kindKey,
        kind: element.tags[kindKey],
        geom: geometry,
        tags: element.tags,
      };
      items.push(item);
    }

    return items;
  }
}
