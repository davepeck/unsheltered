import {
  booleanContains,
  buffer,
  lineString,
  multiPolygon,
  point,
  polygon,
} from "@turf/turf";
import type {
  Geometry,
  LineString,
  MultiPolygon,
  Point,
  Polygon,
} from "geojson";
import { assert, assertDefined, assertNever } from "../utils/assert";
import type {
  ResolvedOSMElement,
  ResolvedOSMNode,
  ResolvedOSMRelation,
  ResolvedOSMWay,
} from "./database";

const LINE_STRING_BUFFER_FT = 5.0;
const LINE_STRING_BUFFER_DEG = LINE_STRING_BUFFER_FT / 364772.0;
const POINT_BUFFER_FT = 50.0;
const POINT_BUFFER_DEG = POINT_BUFFER_FT / 364772.0;
const FT_PER_DEG_LAT_SEA = 364772.0;
const FT_PER_DEG_LON_SEA = 246692.0;
export const AVG_FT_PER_DEG_SEA =
  (FT_PER_DEG_LAT_SEA + FT_PER_DEG_LON_SEA) / 2.0;

/** Convert a line string to a polygon by buffering it. */
export function lineStringToPolygon(
  line: LineString,
  amount: number = LINE_STRING_BUFFER_DEG
): Polygon {
  const result = buffer(line, amount)?.geometry;
  assert(result?.type === "Polygon", "lstop: result is not a polygon");
  return result;
}

/** Convert a point to a polygon by buffering it. */
export function pointToPolygon(
  point: Point,
  amount: number = POINT_BUFFER_DEG
): Polygon {
  const result = buffer(point, amount)?.geometry;
  assert(result?.type === "Polygon", "lstop: result is not a polygon");
  return result;
}

/** Get the geometry of a node. */
export function getNodeGeometry(node: ResolvedOSMNode): Point {
  return point([node.lon, node.lat]).geometry;
}

/** Get the geometry of a way. */
export function getWayGeometry(way: ResolvedOSMWay): LineString | Polygon {
  if (way.kind !== "way") throw new Error("Not a way");
  const coords: [number, number][] = way.nds
    .map((nd) => {
      if (nd.kind !== "node") return undefined;
      return getNodeGeometry(nd).coordinates as [number, number];
    })
    .filter((coord) => coord !== undefined);
  const isClosed =
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];
  const feature = isClosed ? polygon([coords]) : lineString(coords);
  return feature.geometry;
}

/** Get the geometry of a relation. */
export function getRelationGeometry(
  relation: ResolvedOSMRelation
): MultiPolygon {
  if (relation.kind !== "relation") throw new Error("Not a relation");

  const outerWays: Polygon[] = [];

  for (const member of relation.members) {
    // TODO support inner ways
    if (member.role === "inner") continue;

    const element = member.element;
    switch (element.kind) {
      case "way":
        {
          const geom = getWayGeometry(element);
          const finalGeom =
            geom.type === "Polygon" ? geom : lineStringToPolygon(geom);
          outerWays.push(finalGeom);
        }
        break;
      case "node":
        {
          const geom = getNodeGeometry(element);
          const finalGeom = pointToPolygon(geom);
          outerWays.push(finalGeom);
        }
        break;
      case "relation":
        throw new Error("TODO: support nested relations");
      default:
        assertNever(element);
    }
  }

  const coordinates = outerWays.map((way) => way.coordinates);
  return multiPolygon(coordinates).geometry;
}

/** Get the geometry of an arbitrary OSM element. */
export function getGeometry(
  element: ResolvedOSMElement
): Point | LineString | Polygon | MultiPolygon {
  switch (element.kind) {
    case "node":
      return getNodeGeometry(element);
    case "way":
      return getWayGeometry(element);
    case "relation":
      return getRelationGeometry(element);
    default:
      return assertNever(element);
  }
}

/** Wrap turf's annoyingly incomplete booleanContains implementation. */
export function geometryContains(outer: Geometry, inner: Geometry): boolean {
  try {
    // handle a common case for our pipeline that turf doesn't support
    if (outer.type === "MultiPolygon" && inner.type === "Point") {
      return outer.coordinates.some((coords) => {
        const asPolygon = polygon(coords);
        return booleanContains(asPolygon, inner);
      });
    }

    // handle the general case
    return booleanContains(outer, inner);
  } catch {
    // catch cases I might need to implement.
    throw new Error(`Failed to check if ${outer.type} contains ${inner.type}`);
  }
}

/** Return the exterior of a Polygon. */
function polygonExterior(geometry: Polygon): Polygon {
  return polygon([geometry.coordinates[0]]).geometry;
}

/** Return the exterior of a MultiPolygon. */
function multiPolygonExterior(geometry: MultiPolygon): MultiPolygon {
  const exteriorPolygons = geometry.coordinates.map((polygonCoords) => {
    return polygonExterior(polygon(polygonCoords).geometry);
  });
  const exteriorPolygonsCoords = exteriorPolygons.map(
    (polygon) => polygon.coordinates
  );
  return multiPolygon(exteriorPolygonsCoords).geometry;
}

/** Return the exterior of a supported geometry. */
export function exteriorGeometry(
  geometry: Polygon | MultiPolygon
): Polygon | MultiPolygon {
  switch (geometry.type) {
    case "Polygon":
      return polygonExterior(geometry);
    case "MultiPolygon":
      return multiPolygonExterior(geometry);
    default:
      assertNever(geometry);
  }
}

/**
 * Outset an arbitrary geometry by a fixed distance.
 *
 * If the resulting geometry contains holes, they are removed in favor of
 * the exterior shape.
 *
 * Distance is in feet; buffering is approximate since points are presumed
 * to be in lon/lat coordinates.
 */
export function outsetGeometry(
  geometry: Point | LineString | Polygon | MultiPolygon,
  distance: number,
  exteriorOnly: boolean = true
): Polygon | MultiPolygon {
  const buffered = buffer(geometry, distance / AVG_FT_PER_DEG_SEA, {
    units: "degrees",
  })?.geometry;
  assertDefined(buffered);
  return exteriorOnly ? exteriorGeometry(buffered) : buffered;
}
