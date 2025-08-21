import { useEffect, useRef } from "react";
import clsx from "clsx";
import L from "leaflet";

const SEATTLE_CENTER: [number, number] = [47.6062, -122.3321];
const SEATTLE_ZOOM = 12;

export interface LeafletMapProps<T> {
  initialCenter?: [number, number];
  initialZoom?: number;
  className?: string;
  data: T;
  onConfigureMap: (map: L.Map, data: T) => void;
}

export type OuterMapProps<T> = Omit<LeafletMapProps<T>, "onConfigureMap">;

const LeafletMap = <T,>(props: LeafletMapProps<T>) => {
  const { initialCenter, initialZoom, data, onConfigureMap } = props;
  const mapRef = useRef<L.Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const m = L.map(mapContainerRef.current, {
        renderer: L.canvas(),
      }).setView(initialCenter ?? SEATTLE_CENTER, initialZoom ?? SEATTLE_ZOOM);
      mapRef.current = m;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
        m
      );
    } else {
      const m = mapRef.current;
      m.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) return;
        m.removeLayer(layer);
      });
    }

    const map = mapRef.current;
    onConfigureMap(map, data);
  }, [mapContainerRef, data]);

  return (
    <div className={clsx("not-prose pb-4", props.className)}>
      <div ref={mapContainerRef} className="h-full w-full">
        ...
      </div>
    </div>
  );
};

export default LeafletMap;
