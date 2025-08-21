import L from "leaflet";
import { useCallback } from "react";
import { useDataLoader } from "../hooks/useDataLoader";
import { getItemName } from "../osm/items";
import type { SafeZone, SafeZoneKind } from "../pipe/safeZones";
import LeafletMap, { type OuterMapProps } from "./LeafletMap";

type SafeZonesMapProps = OuterMapProps<Record<string, SafeZone>>;

const SAFE_ZONE_COLORS: Record<SafeZoneKind, string> = {
  school: "blue",
  park: "green",
  library: "yellow",
  childCare: "hotpink",
};

const SafeZonesMap: React.FC<SafeZonesMapProps> = (props) => {
  const onConfigureMap = useCallback(
    (map: L.Map, data: Record<string, SafeZone>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addItem = (item: any, color: string) => {
        L.geoJSON(item.geom, {
          style: {
            color,
          },
        })
          .bindPopup(getItemName(item))
          .addTo(map);
      };

      Object.values(data).forEach((zone) =>
        addItem(zone, SAFE_ZONE_COLORS[zone.safeZoneKind])
      );
    },
    []
  );

  return <LeafletMap {...props} onConfigureMap={onConfigureMap} />;
};

interface SafeZonesDisplayProps {
  dataId: string;
}

const SafeZonesDisplay: React.FC<SafeZonesDisplayProps> = (props) => {
  const safeZones = useDataLoader<Record<string, SafeZone>>(props.dataId);
  if (!safeZones) return null;

  return (
    <>
      <div className="flex space-x-4 mb-4 text-sm">
        <span className="flex flex-row justify-center items-center">
          <span className="w-2 h-2 inline-block rounded-full bg-[blue]">
            &nbsp;
          </span>
          &nbsp;Schools
        </span>
        <span className="flex flex-row justify-center items-center">
          <span className="w-2 h-2 inline-block rounded-full bg-[green]">
            &nbsp;
          </span>
          &nbsp;Parks
        </span>
        <span className="flex flex-row justify-center items-center">
          <span className="w-2 h-2 inline-block rounded-full bg-[yellow]">
            &nbsp;
          </span>
          &nbsp;Libraries
        </span>
        <span className="flex flex-row justify-center items-center">
          <span className="w-2 h-2 inline-block rounded-full bg-[hotpink]">
            &nbsp;
          </span>
          &nbsp;Child Cares
        </span>{" "}
      </div>

      <SafeZonesMap data={safeZones} className="w-full h-[36rem]" />
    </>
  );
};

export default SafeZonesDisplay;
