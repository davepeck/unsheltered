import L from "leaflet";
import { useCallback, useState } from "react";
import { useDataLoader } from "../hooks/useDataLoader";
import { getItemName } from "../osm/items";
import {
  type ReportKind,
  type ReportWithSafeZoneIds,
  // getReportKey,
} from "../pipe/reports";
import {
  type SlimReportsWithTimelines,
  type SlimReportHistogramData,
} from "../pipe/timeline";
import {
  SAFE_ZONE_KINDS,
  type SafeZone,
  type SafeZoneKind,
} from "../pipe/safeZones";
import {
  formatDate,
  formatNumber,
  formatPercent,
  formatWindow,
} from "../utils/format";
import LeafletMap, { type OuterMapProps } from "./LeafletMap";
import SegmentedControl from "./SegmentedControl";
import Select from "./Select";
import clsx from "clsx";
import { fastMax } from "../utils/fastMath";
import ReactDOMServer from "react-dom/server";
// import HistogramChart from "./HistogramChart";
import { assertNever } from "../utils/assert";

interface SimpleReportsMapData {
  showReports: ReportWithSafeZoneIds[];
  showZones: SafeZone[];
  safeZonesIndex: Record<string, SafeZone>;
  // histograms: Record<string, SlimReportHistogramData>;
  // histogramMax?: number;
  // histogramLabels: string[];
}

interface SimpleReportsMapProps extends OuterMapProps<SimpleReportsMapData> {
  markerSize: "fixed" | "relative";
  showSafeZones: SafeZoneOption;
  windowDescription: string;
}

const MIN_MARKER_SIZE = 4.0;
const FIXED_MARKER_SIZE = 5.0;
const MAX_MARKER_SIZE = 30.0;
const REPORT_KINDS: Record<
  ReportKind,
  { label: string; singular: string; color: string }
> = {
  encampment: {
    label: "Encampments",
    singular: "Encampment",
    color: "#2b83ba",
  },
  vehicle: {
    label: "Abandoned Vehicles",
    singular: "Abandoned Vehicle",
    color: "#83ba2b",
  },
  graffiti: { label: "Graffiti", singular: "Graffiti", color: "#ffcc83" },
  dumping: { label: "Dumping", singular: "Dumping", color: "#8300ff" },
  litter: {
    label: "Public Litter",
    singular: "Public Litter",
    color: "#ff83ff",
  },
};

const capFirst = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const formatStreetAddress = (address: string) => {
  return address
    .split(" ")
    .map((word) => {
      // get just the alphanumeric part of the word
      const testWord = word.match(/[a-zA-Z0-9]+/)?.[0];
      if (
        testWord &&
        testWord.length > 2 &&
        testWord[1] === testWord[1].toUpperCase()
      ) {
        return capFirst(word);
      } else {
        return word;
      }
    })
    .join(" ");
};

const SafeZonePopup: React.FC<{ zone: SafeZone }> = ({ zone }) => (
  <div style={{ textTransform: "capitalize" }}>
    <strong>{getItemName(zone)}</strong>
    <br />
    {getItemName(zone).toLowerCase().includes(zone.kind) ? "" : zone.kind}
  </div>
);

const ReportPopup: React.FC<{
  report: ReportWithSafeZoneIds;
  safeZonesIndex: Record<string, SafeZone>;
  // historicalCount: number;
  windowDescription: string;
  srhd?: SlimReportHistogramData;
  histogramLabels?: string[];
}> = ({ report, safeZonesIndex, /* historicalCount, */ windowDescription }) => {
  return (
    <div>
      <strong>{REPORT_KINDS[report.kind].singular}</strong>
      <br />
      <strong>{report.count}</strong>{" "}
      {report.count === 1 ? "report" : "reports"} in the {windowDescription}
      <br />
      {/* <strong>{historicalCount}</strong> since reporting began (June 2022)
      <br /> */}
      <br />
      {formatStreetAddress(report.loc)}
      {report.safeZoneIds.length > 0 ? (
        <>
          <br />
          <br />
          <strong>
            In safe {report.safeZoneIds.length > 1 ? "zones" : "zone"}
          </strong>
          :{" "}
          {report.safeZoneIds
            .map((id) => safeZonesIndex[id])
            .map(getItemName)
            .join(", ")}
        </>
      ) : null}
    </div>
  );
};

/** Return just those reports that are in a single zone kind. */
const filterReportsForSingleZone = (
  kind: SafeZoneKind,
  reports: ReportWithSafeZoneIds[],
  safeZonesIndex: Record<string, SafeZone>
): ReportWithSafeZoneIds[] => {
  return reports.filter((r) =>
    r.safeZoneIds.some((id) => safeZonesIndex[id].safeZoneKind === kind)
  );
};

/** Return those reports that are in multiple zones, subject to an option. */
const filterReportsForMultipleZones = (
  show: SafeZoneShow,
  reports: ReportWithSafeZoneIds[]
): ReportWithSafeZoneIds[] => {
  return show === "intersect"
    ? reports.filter((r) => r.safeZoneIds.length > 0)
    : reports;
};

/** Return just those reports that match our current safe zone option setting. */
const filterReportsForZones = (
  showSafeZones: SafeZoneOption,
  reports: ReportWithSafeZoneIds[],
  safeZonesIndex: Record<string, SafeZone>
): ReportWithSafeZoneIds[] => {
  if (showSafeZones.single) {
    return filterReportsForSingleZone(
      showSafeZones.kind,
      reports,
      safeZonesIndex
    );
  } else {
    return filterReportsForMultipleZones(showSafeZones.show, reports);
  }
};

/** Return just those zones that have reports in them. */
const filterZonesForReports = (
  showSafeZones: SafeZoneOption,
  reports: ReportWithSafeZoneIds[],
  safeZonesIndex: Record<string, SafeZone>
): SafeZone[] => {
  const zoneIds = [...new Set<string>(reports.flatMap((r) => r.safeZoneIds))];

  switch (showSafeZones.single) {
    case true:
      return zoneIds
        .map((id) => safeZonesIndex[id])
        .filter((z) => z.safeZoneKind === showSafeZones.kind);
    case false:
      switch (showSafeZones.show) {
        case "no":
          return [];
        case "all":
          // ignore zoneIds, return all zones
          return Object.values(safeZonesIndex);
        case "intersect":
          return zoneIds.map((id) => safeZonesIndex[id]);
        default:
          assertNever(showSafeZones.show);
      }
  }
};

const SimpleReportsMap: React.FC<SimpleReportsMapProps> = (props) => {
  const [selectedReport, setSelectedReport] =
    useState<ReportWithSafeZoneIds | null>(null);

  const onConfigureMap = useCallback(
    (map: L.Map, data: SimpleReportsMapData) => {
      const { showReports, showZones } = data;

      // If requested, draw safe zones
      for (const zone of showZones) {
        L.geoJSON(zone.geom, {
          style: {
            color: "gray",
            fillColor: "gray",
            fillOpacity: 0.5,
          },
        })
          .bindPopup(
            ReactDOMServer.renderToString(<SafeZonePopup zone={zone} />)
          )
          .addTo(map);
      }

      // Draw reports
      const maxCount = fastMax(showReports.map((e) => e.count));
      for (const report of showReports) {
        const radius = Math.max(
          MIN_MARKER_SIZE,
          props.markerSize === "relative"
            ? (report.count / maxCount) * MAX_MARKER_SIZE
            : FIXED_MARKER_SIZE
        );
        const marker = L.circleMarker([report.lat, report.lon], {
          radius,
          color: "white",
          opacity: 1.0,
          weight: 1.5,
          fillColor: REPORT_KINDS[report.kind].color,
          fillOpacity: 1.0,
        })
          .bindPopup(
            ReactDOMServer.renderToString(
              <ReportPopup
                report={report}
                safeZonesIndex={data.safeZonesIndex}
                windowDescription={props.windowDescription}
                // historicalCount={
                //   data.histograms[getReportKey(report)].historicalCount
                // }
              />
            )
          )
          .addTo(map);

        marker.on("popupopen", () => {
          console.log("Popup opened for report:", report);
          setSelectedReport(report);
        });
      }
    },
    [props.markerSize, props.showSafeZones, props.windowDescription]
  );

  return (
    <div>
      <LeafletMap
        onConfigureMap={onConfigureMap}
        initialCenter={props.initialCenter}
        initialZoom={props.initialZoom}
        data={props.data}
        className={props.className}
      />
    </div>
  );
};

interface SimpleReportsDisplayProps {
  dataId: string;
}

const THRESHOLDS: { label: string; threshold: number }[] = [
  { label: "Any number", threshold: 0 },
  { label: "5 or more", threshold: 5 },
  { label: "10 or more", threshold: 10 },
];

type SafeZoneShow = "no" | "all" | "intersect";

interface CombinedSafeZoneOption {
  single: false;
  label: string;
  show: SafeZoneShow;
}

interface SingleSafeZoneOption {
  single: true;
  label: string;
  kind: SafeZoneKind;
}

type SafeZoneOption = CombinedSafeZoneOption | SingleSafeZoneOption;

const SAFE_ZONE_OPTIONS: SafeZoneOption[] = [
  { label: "Hide", show: "no", single: false },
  { label: "Show All", show: "all", single: false },
  { label: "Show only reports in zones", show: "intersect", single: false },
  ...Object.entries(SAFE_ZONE_KINDS).map(([kind, value]) => ({
    label: `Show reports near ${value.plural}`,
    kind: kind as SafeZoneKind,
    single: true as const,
  })),
];

const MARKER_SIZE_OPTIONS: { label: string; size: "fixed" | "relative" }[] = [
  { label: "Fixed", size: "fixed" },
  { label: "Number of reports", size: "relative" },
];

// const HISTOGRAM_OPTIONS: { label: string; max: "fixed" | "flexible" }[] = [
//   { label: "Fixed", max: "fixed" },
//   { label: "Flexible", max: "flexible" },
// ];

const SimpleReportsDisplay: React.FC<SimpleReportsDisplayProps> = (props) => {
  const { dataId } = props;
  const simpleReports = useDataLoader<SlimReportsWithTimelines>(dataId);
  const [selectedWindowIndex, setSelectedWindowIndex] = useState(0);
  const [enabledReportKinds, setEnabledReportKinds] = useState<Set<ReportKind>>(
    new Set(["encampment"])
  );
  const [thresholdIndex, setThresholdIndex] = useState(0);
  const [safeZoneIndex, setSafeZoneIndex] = useState(0);
  const [markerSizeIndex, setMarkerSizeIndex] = useState(0);
  // const [histogramIndex, setHistogramIndex] = useState(0);

  if (!simpleReports) return null;

  const windowResult = simpleReports.windowResults[selectedWindowIndex];
  const { window, result: allReports } = windowResult;

  const kindReports = allReports.filter((r) => enabledReportKinds.has(r.kind));
  const threshold = THRESHOLDS[thresholdIndex].threshold;
  const thresholdReports = kindReports.filter((r) => r.count >= threshold);

  const totalReportsCount = kindReports
    .map((r) => r.count)
    .reduce((a, b) => a + b, 0);
  const totalReports = kindReports.length;
  const totalReportsThreshold = thresholdReports.length;
  const totalSafeZoneReports = thresholdReports.filter(
    (r) => r.safeZoneIds.length > 0
  ).length;

  const windowDescription = formatWindow(
    window,
    simpleReports.lastDate
  ).toLowerCase();

  const safeZoneOption = SAFE_ZONE_OPTIONS[safeZoneIndex];
  const reverseReports = thresholdReports.slice().reverse();

  // If "showSafeZones" is set to "intersect", we (a) only show
  // safe zones that have reports, and (b) only show reports that
  // intersect with safe zones. Here, we compute (b).
  const showReports = filterReportsForZones(
    safeZoneOption,
    reverseReports,
    simpleReports.safeZonesIndex
  );

  const showZones = filterZonesForReports(
    safeZoneOption,
    reverseReports,
    simpleReports.safeZonesIndex
  );

  return (
    <>
      <p>
        This map shows reports made with Seattle's{" "}
        <a
          href="https://www.seattle.gov/customer-service-bureau/find-it-fix-it-mobile-app"
          target="_blank"
        >
          Find It, Fix It
        </a>{" "}
        service. Data is current as of{" "}
        <span className="font-bold">{formatDate(simpleReports.lastDate)}</span>.
      </p>

      <SegmentedControl
        segments={simpleReports.windowResults.map((wr) =>
          formatWindow(wr.window, simpleReports.lastDate)
        )}
        selectedIndex={selectedWindowIndex}
        onSelect={setSelectedWindowIndex}
        className="mb-4 w-full justify-between"
      />

      <div className="flex md:justify-between space-x-2 space-y-4 mb-4 flex-wrap">
        <Select
          title="Number of reports:"
          options={THRESHOLDS.map((t) => t.label)}
          onSelect={setThresholdIndex}
          className="max-w-[50%]"
        />
        <Select
          title="Safe Zones:"
          options={SAFE_ZONE_OPTIONS.map((t) => t.label)}
          onSelect={setSafeZoneIndex}
          className="max-w-[50%]"
        />
        <Select
          title="Marker Size:"
          options={MARKER_SIZE_OPTIONS.map((t) => t.label)}
          onSelect={setMarkerSizeIndex}
          className="max-w-[50%]"
        />
        {/* <Select
          title="Histogram Max:"
          options={HISTOGRAM_OPTIONS.map((t) => t.label)}
          onSelect={setHistogramIndex}
          className="max-w-[50%]"
        /> */}
      </div>

      <label className="block font-bold text-sm md:-mt-4 mb-4">Show:</label>
      <div className="flex space-x-2 -mt-2 text-sm flex-wrap">
        {Object.entries(REPORT_KINDS).map(([kind, value]) => (
          <span
            key={value.label}
            className={clsx(
              "flex flex-row justify-center items-center rounded-sm cursor-pointer px-2 py-1 mb-4",
              enabledReportKinds.has(kind as ReportKind)
                ? "bg-white/80 border border-black/30"
                : "text-gray-500 border border-black/5"
            )}
            onClick={() => {
              const newSet = new Set(enabledReportKinds);
              if (newSet.has(kind as ReportKind)) {
                newSet.delete(kind as ReportKind);
              } else {
                newSet.add(kind as ReportKind);
              }
              setEnabledReportKinds(newSet);
            }}
          >
            <span
              className="w-3 h-3 mr-1 inline-block rounded-full"
              style={{
                backgroundColor: enabledReportKinds.has(kind as ReportKind)
                  ? value.color
                  : "gray",
              }}
            >
              &nbsp;
            </span>
            &nbsp;{value.label}
          </span>
        ))}
      </div>

      <p>
        In the {windowDescription},{" "}
        <span className="font-bold">{formatNumber(totalReportsCount)}</span>{" "}
        reports were made at{" "}
        <span className="font-bold">{formatNumber(totalReports)}</span> unique
        locations.{" "}
        {thresholdIndex > 0 ? (
          <>
            Of these locations,{" "}
            <span className="font-bold">
              {formatNumber(totalReportsThreshold)}
            </span>{" "}
            (
            <span className="font-bold">
              {formatPercent(totalReportsThreshold / totalReports)}
            </span>
            ) had <span className="font-bold">{threshold}</span> or more reports
            and{" "}
            <span className="font-bold">
              {formatNumber(totalSafeZoneReports)}
            </span>{" "}
            of those were inside designated safe zones.
          </>
        ) : (
          <>
            Of these locations,{" "}
            <span className="font-bold">
              {formatNumber(totalSafeZoneReports)}
            </span>{" "}
            (
            <span className="font-bold">
              {formatPercent(totalSafeZoneReports / totalReports)}
            </span>
            ) were inside designated safe zones.
          </>
        )}
        {safeZoneOption.single ? (
          <>
            {" "}
            There are{" "}
            <span className="font-bold">
              {formatNumber(showReports.length)}
            </span>{" "}
            reports near {SAFE_ZONE_KINDS[safeZoneOption.kind].plural} (
            <span className="font-bold">
              {formatPercent(showReports.length / totalReports)}
            </span>{" "}
            of total reports).
          </>
        ) : null}
      </p>

      <SimpleReportsMap
        data={{
          showReports,
          showZones,
          safeZonesIndex: simpleReports.safeZonesIndex,
          // histograms: simpleReports.histograms,
          // histogramMax:
          //   HISTOGRAM_OPTIONS[histogramIndex].max == "fixed"
          //     ? Math.ceil(simpleReports.histogramMax / 10) * 10
          //     : undefined,
          // histogramLabels: simpleReports.histogramMeta.labels,
        }}
        windowDescription={windowDescription}
        markerSize={MARKER_SIZE_OPTIONS[markerSizeIndex].size}
        showSafeZones={SAFE_ZONE_OPTIONS[safeZoneIndex]}
        className="w-full h-[36rem]"
      />
    </>
  );
};

export default SimpleReportsDisplay;
