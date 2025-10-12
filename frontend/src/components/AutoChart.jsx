// components/AutoChart.jsx
import React from "react";
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/** 한국어/영문 긴 라벨 줄바꿈 */
const wrapLabel = (v = "", max = 12) => {
  const s = String(v);
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
};

const palette = ["#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6"];

export default function AutoChart({ data, chart }) {
  if (!chart || !data || data.length === 0) return null;

  const { type, xField, yFields } = chart;

  // 공통 축/툴팁/그리드
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey={xField}
        tickFormatter={(v) => wrapLabel(v, 10)}
        minTickGap={10}
      />
      <YAxis />
      <Tooltip />
      <Legend />
    </>
  );

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => wrapLabel(v, 10)}
            minTickGap={10}
            label={{ value: xField, position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: (yFields && yFields[0]) || "값", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          {yFields.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => wrapLabel(v, 10)}
            minTickGap={10}
            label={{ value: xField, position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: (yFields && yFields[0]) || "값", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          {yFields.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => wrapLabel(v, 10)}
            minTickGap={10}
            label={{ value: xField, position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: (yFields && yFields[0]) || "값", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          {yFields.map((k, i) => (
            <Bar key={k} dataKey={k} fill={palette[i % palette.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie") {
    // 파이는 첫 yField만 사용
    const [yKey] = yFields;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={data}
            dataKey={yKey}
            nameKey={xField}
            outerRadius={110}
            label={({ name }) => wrapLabel(name, 8)}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    const [yKey] = yFields;
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis dataKey={xField} name={xField}
                 label={{ value: xField, position: "insideBottom", offset: -5 }} />
          <YAxis dataKey={yKey} name={yKey}
                 label={{ value: yKey, angle: -90, position: "insideLeft" }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Legend />
          <Scatter name="데이터" data={data} fill={palette[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // fallback
  return (
    <div style={{ padding: 12, color: "#888" }}>
      표시할 차트가 없습니다.
    </div>
  );
}
