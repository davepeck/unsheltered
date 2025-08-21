import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  LogarithmicScale,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Legend,
  LogarithmicScale,
  Tooltip,
  Legend
);

interface HistogramChartProps {
  buckets: number[];
  labels: string[];
  title?: string;
  color?: string;
  max?: number;
  min?: number;
  barThickness?: number;
  beginAtZero?: boolean;
}

const HistogramChart: React.FC<HistogramChartProps> = ({
  buckets,
  labels,
  max,
  min,
  beginAtZero = true,
  barThickness = 5,
  title = "Histogram",
  color = "rgba(53, 162, 235, 0.8)",
}) => {
  // Check if we have data to display
  if (!buckets || buckets.length === 0 || !labels || labels.length === 0) {
    return <div className="text-center p-4">No histogram data available</div>;
  }

  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: buckets,
        backgroundColor: color,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    datasets: {
      bar: {
        barThickness, // Adjust this value to make bars thicker
      },
    },
    scales: {
      y: {
        beginAtZero,
        max: max !== undefined ? max : undefined,
        min: min !== undefined ? min : undefined,
      },
    },
  };

  return (
    <div className="h-[400px] w-full">
      <Bar data={data} options={options} />
    </div>
  );
};

export default HistogramChart;
