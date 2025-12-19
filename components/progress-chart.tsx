"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  volume?: number;
  workouts?: number;
  [key: string]: string | number | undefined;
}

interface ProgressChartProps {
  data: ChartData[];
  type?: "line" | "bar";
  dataKey?: string;
  title?: string;
}

export function ProgressChart({
  data,
  type = "line",
  dataKey = "volume",
  title,
}: ProgressChartProps) {
  const ChartComponent = type === "line" ? LineChart : BarChart;
  const DataComponent = type === "line" ? Line : Bar;

  return (
    <div className="w-full h-[400px]">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <DataComponent
            type={type === "line" ? "monotone" : undefined}
            dataKey={dataKey}
            stroke={type === "line" ? "#8884d8" : undefined}
            fill={type === "bar" ? "#8884d8" : undefined}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

