import fs from "fs";
import sax from "sax";
import { assertNever } from "../utils/assert";

export type Tags = Record<string, string>;

/** A generic interface for lon/lat coordinates. */
export interface Coordinates {
  lon: number;
  lat: number;
}

/** A base structure for a top-level Open Street Maps element. */
interface OSMElementBase {
  id: string;
  tags: Tags;
}

/** An OSM node. */
export interface OSMNode extends OSMElementBase, Coordinates {
  kind: "node";
}

/** An OSM node that has had its references resolved. (A no-op.) */
export type ResolvedOSMNode = OSMNode;

/** A way reference to other OSM elements. */
interface OSMReference {
  ref: string;
}

/** An OSM way. */
export interface OSMWay extends OSMElementBase {
  kind: "way";
  nds: OSMReference[];
}

/** An OSM way that has had its references resolved. */
export interface ResolvedOSMWay extends Omit<OSMWay, "nds"> {
  nds: ResolvedOSMElement[];
}

/** An relation member to other OSM elements. */
interface OSMMember {
  ref: string;
  kind: "node" | "way";
  role: string;
}

/** An OSM relation. */
export interface OSMRelation extends OSMElementBase {
  kind: "relation";
  members: OSMMember[];
}

/** An OSM relation that has had its members resolved. */
export interface ResolvedOSMRelation extends Omit<OSMRelation, "members"> {
  members: { role: string; element: ResolvedOSMElement }[];
}

/** All top-level OSM elements. */
export type OSMElement = OSMNode | OSMWay | OSMRelation;

/** All top-level OSM elements with resolved references. */
export type ResolvedOSMElement =
  | ResolvedOSMNode
  | ResolvedOSMWay
  | ResolvedOSMRelation;

/** Internal representation of parsed OSM data. */
interface ParsedOSMData {
  nodes: OSMNode[];
  ways: OSMWay[];
  relations: OSMRelation[];
}

/** A generic database wrapped around Open Street Maps data. */
export class OSMDatabase {
  private data: ParsedOSMData;
  private idElementMap: Record<string, OSMElement>;

  static async load(filePath: string): Promise<OSMDatabase> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const parser = sax.createStream(true);
      const elements: OSMElement[] = [];
      let currentElement: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

      parser.on("opentag", (item) => {
        if (item.name === "node") {
          currentElement = {
            kind: "node",
            id: item.attributes.id as string,
            lat: parseFloat(item.attributes.lat as string),
            lon: parseFloat(item.attributes.lon as string),
            tags: {},
          };
        } else if (item.name === "way") {
          currentElement = {
            kind: "way",
            id: item.attributes.id as string,
            nds: [],
            tags: {},
          };
        } else if (item.name === "relation") {
          currentElement = {
            kind: "relation",
            id: item.attributes.id as string,
            members: [],
            tags: {},
          };
        } else if (currentElement) {
          if (item.name === "nd") {
            currentElement.nds.push({ ref: item.attributes.ref as string });
          } else if (item.name === "member") {
            currentElement.members.push({
              ref: item.attributes.ref as string,
              kind: item.attributes.type as "node" | "way",
              role: (item.attributes.role || "outer") as "inner" | "outer",
            });
          } else if (item.name === "tag") {
            currentElement.tags[item.attributes.k as string] = item.attributes
              .v as string;
          }
        }
      });

      parser.on("closetag", (name) => {
        if (
          currentElement &&
          (name === "node" || name === "way" || name === "relation")
        ) {
          elements.push(currentElement);
          currentElement = null;
        }
      });

      parser.on("end", () => {
        const nodes = elements.filter((element) => element.kind === "node");
        const ways = elements.filter((element) => element.kind === "way");
        const relations = elements.filter(
          (element) => element.kind === "relation"
        );
        const database = new OSMDatabase({ nodes, ways, relations });
        resolve(database);
      });

      parser.on("error", (err) => {
        reject(err);
      });

      stream.pipe(parser);
    });
  }

  constructor(data: ParsedOSMData) {
    this.data = data;
    this.idElementMap = {};
    for (const node of this.data.nodes) {
      this.idElementMap[node.id] = node;
    }
    for (const way of this.data.ways) {
      this.idElementMap[way.id] = way;
    }
    for (const relation of this.data.relations) {
      this.idElementMap[relation.id] = relation;
    }
  }

  /** Get an element by its ID. Return undefined if not found. */
  getElement(id: number): OSMElement | undefined {
    return this.idElementMap[id] as OSMElement | undefined;
  }

  /** Get a resolved element by its ID. Return undefined if not found. */
  getResolvedElement(id: string): ResolvedOSMElement | undefined {
    const element = this.idElementMap[id];
    if (element === undefined) return undefined;
    switch (element.kind) {
      case "node":
        return element;
      case "way":
        return this.resolveWay(element);
      case "relation":
        return this.resolveRelation(element);
      default:
        assertNever(element);
    }
  }

  /** Get all nodes in the database. */
  get nodes(): readonly OSMNode[] {
    return this.data.nodes;
  }

  /** Get all ways in the database. */
  get ways(): readonly OSMWay[] {
    return this.data.ways;
  }

  /** Get all relations in the database. */
  get relations(): readonly OSMRelation[] {
    return this.data.relations;
  }

  /** Get all elements in the database. */
  get elements(): readonly OSMElement[] {
    return [...this.nodes, ...this.ways, ...this.relations];
  }

  /** Resolve a way's references to actual elements. */
  resolveWay(way: OSMWay, skipMissed: boolean = true): ResolvedOSMWay {
    const maybeNds = way.nds.map((nd) => this.getResolvedElement(nd.ref));
    if (!skipMissed && maybeNds.includes(undefined)) {
      throw new Error("Failed to resolve way references");
    }
    const nds = maybeNds.filter(
      (nd): nd is ResolvedOSMElement => nd !== undefined
    );
    return { ...way, nds };
  }

  /** Get all resolved ways in the database. */
  get resolvedWays(): ResolvedOSMWay[] {
    return this.ways.map((way) => this.resolveWay(way));
  }

  /** Resolve a relation's members to actual elements. */
  resolveRelation(
    relation: OSMRelation,
    skipMissed: boolean = true
  ): ResolvedOSMRelation {
    const maybeMembers = relation.members.map((member) => ({
      role: member.role,
      element: this.getResolvedElement(member.ref),
    }));
    if (!skipMissed && maybeMembers.map((m) => m.element).includes(undefined)) {
      throw new Error("Failed to resolve relation members");
    }
    const members = maybeMembers.filter(
      (member): member is { role: string; element: ResolvedOSMElement } =>
        member.element !== undefined
    );
    return { ...relation, members };
  }

  /** Resolve an arbitrary element. */
  resolveElement(element: OSMElement): ResolvedOSMElement {
    switch (element.kind) {
      case "node":
        return element;
      case "way":
        return this.resolveWay(element);
      case "relation":
        return this.resolveRelation(element);
      default:
        assertNever(element);
    }
  }

  /** Get all resolved relations in the database. */
  get resolvedRelations(): ResolvedOSMRelation[] {
    return this.relations.map((relation) => this.resolveRelation(relation));
  }

  /** Get all resolved elements in the database. */
  get resolvedElements(): ResolvedOSMElement[] {
    return [...this.nodes, ...this.resolvedWays, ...this.resolvedRelations];
  }
}
