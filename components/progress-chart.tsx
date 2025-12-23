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
  return (
    <div className="w-full h-[400px]">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#8884d8"
            />
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey={dataKey}
              fill="#8884d8"
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}



