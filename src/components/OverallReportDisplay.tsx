import { type OverallReport, type OverallReportDetails } from "../pipe/overall";
import { useDataLoader } from "../hooks/useDataLoader";
import { formatNumber, formatDelta, formatDate } from "../utils/format";
import { type ParsableDelta } from "../utils/windows";
import { type ReportKind } from "../pipe/reports";
import HistogramChart from "./HistogramChart";

/**
 * This is copied from SimpleReportsDisplay.tsx because otherwise, Vite HMR
 * doesn't work when running the dev server.
 */
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

interface OverallReportDetailDisplayProps {
  title: string;
  color: string;
  details: OverallReportDetails;
  histogramMeta: {
    start: Date;
    end: Date;
    delta: ParsableDelta;
    labels: string[];
  };
}

const OverallReportDetailDisplay: React.FC<OverallReportDetailDisplayProps> = ({
  title,
  color,
  details,
  histogramMeta,
}) => {
  return (
    <div className="w-full">
      <h3>{title}</h3>
      <p>
        <span className="font-bold">{formatNumber(details.count)}</span>{" "}
        historical reports
      </p>
      <HistogramChart
        buckets={details.buckets.slice(1, -1)}
        labels={histogramMeta.labels.slice(1, -1)}
        title="Historical Reports"
        color={color}
        max={details.max}
        barThickness={5}
        beginAtZero={false}
      />
    </div>
  );
};

interface OverallReportDisplayProps {
  dataId: string;
}

const OverallReportDisplay: React.FC<OverallReportDisplayProps> = ({
  dataId,
}) => {
  const overallReport = useDataLoader<OverallReport>(dataId);
  if (!overallReport) {
    return <div>Unexpected failure; please reload the page.</div>;
  }

  return (
    <>
      {" "}
      <p>
        Histograms from{" "}
        <span className="font-bold">
          {formatDate(overallReport.histogramMeta.start)}
        </span>{" "}
        to{" "}
        <span className="font-bold">
          {formatDate(overallReport.histogramMeta.end)}
        </span>{" "}
        every {formatDelta(overallReport.histogramMeta.delta)}.
      </p>
      <div className="flex flex-col gap-8">
        <OverallReportDetailDisplay
          title="All Report Kinds"
          color="#666"
          details={overallReport.all}
          histogramMeta={overallReport.histogramMeta}
        />
        {Object.entries(overallReport.kinds).map(([kind, details]) => (
          <OverallReportDetailDisplay
            key={kind}
            title={REPORT_KINDS[kind as ReportKind].label}
            color={REPORT_KINDS[kind as ReportKind].color}
            details={details}
            histogramMeta={overallReport.histogramMeta}
          />
        ))}
      </div>
    </>
  );
};

export default OverallReportDisplay;
