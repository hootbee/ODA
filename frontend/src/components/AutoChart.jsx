import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

/**
 * props
 * - data: Array<object>
 * - xKey: string
 * - yKeys: string[]
 * - guess: 'line' | 'bar' | 'radar' (optional)
 * - height: number (optional)
 */
export default function AutoChart({ data, xKey, yKeys, guess, height = 320 }) {
  const chartType = guess ?? (yKeys.length > 4 ? "radar" : "line");

  const lines = useMemo(
    () =>
      yKeys.map((k, i) => ({
        key: k,
        // Recharts는 색상을 지정하지 않아도 자동 팔레트를 사용합니다.
        // stroke/ fill 지정 생략
      })),
    [yKeys]
  );

  if (!data?.length || !xKey || !yKeys?.length) {
    return <div style={{ padding: 12 }}>표시할 데이터가 없습니다.</div>;
  }

  if (chartType === "radar") {
    // 레이더는 한 행만 그려야 의미가 있어, 마지막 행을 집계한 형태로 변환
    const last = data[data.length - 1];
    const radarData = yKeys.map((k) => ({ name: k, value: Number(last?.[k]) || 0 }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" />
          <PolarRadiusAxis />
          <Radar name="현재값" dataKey="value" />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {lines.map((l) => (
            <Bar key={l.key} dataKey={l.key} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // default: line
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        {/* XAxis에 domain 고정값을 주지 않습니다. 실제 xKey를 그대로 사용 */}
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        {lines.map((l) => (
          <Line key={l.key} type="monotone" dataKey={l.key} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
