import React from "react";
import styled from "styled-components";

const COLOR_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#8b5cf6",
  "#eab308",
  "#14b8a6",
];

const DataVisualizationResult = ({ data }) => {
  const {
    summary,
    charts = [],
    notes = [],
    previewTable,
    fileName,
    publicDataPk,
  } = data || {};

  return (
    <Container>
      <Header>
        <div>
          <Title>
            <span role="img" aria-label="chart">📈</span> 데이터 시각화 결과
          </Title>
          {fileName && <SubTitle>대상 파일: {fileName}</SubTitle>}
          {publicDataPk && <MetaText>데이터 식별자: {publicDataPk}</MetaText>}
        </div>
      </Header>

      {summary && <Summary>{summary}</Summary>}

      {charts.length > 0 ? (
        <ChartGrid>
          {charts.map((chart, idx) => (
            <ChartCard key={`${chart.title || "chart"}-${idx}`}>
              <ChartHeading>{chart.title || `추천 차트 ${idx + 1}`}</ChartHeading>
              {chart.insight && <ChartInsight>{chart.insight}</ChartInsight>}
              {!chart.insight && chart.description && (
                <ChartInsight>{chart.description}</ChartInsight>
              )}
              <ChartRenderer chart={chart} colorOffset={idx} />
              {chart.notes && chart.notes.length > 0 && (
                <InlineList>
                  {chart.notes.map((note, noteIdx) => (
                    <li key={`note-${idx}-${noteIdx}`}>{note}</li>
                  ))}
                </InlineList>
              )}
            </ChartCard>
          ))}
        </ChartGrid>
      ) : (
        <EmptyState>
          생성된 그래프가 없습니다. 데이터에 충분한 행이 있는지 확인해주세요.
        </EmptyState>
      )}

      {notes && notes.length > 0 && (
        <NotesSection>
          <SectionTitle>참고 사항</SectionTitle>
          <InlineList>
            {notes.map((note, idx) => (
              <li key={`global-note-${idx}`}>{note}</li>
            ))}
          </InlineList>
        </NotesSection>
      )}

      {previewTable && previewTable.headers && previewTable.headers.length > 0 && (
        <PreviewSection>
          <SectionTitle>데이터 샘플 (상위 5행)</SectionTitle>
          <ScrollTable>
            <table>
              <thead>
                <tr>
                  {previewTable.headers.map((header, idx) => (
                    <th key={`header-${idx}`}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewTable.rows && previewTable.rows.length > 0 ? (
                  previewTable.rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`}>
                      {row.map((cell, cellIdx) => (
                        <td key={`cell-${rowIdx}-${cellIdx}`}>{cell}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={previewTable.headers.length}>데이터 행이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollTable>
        </PreviewSection>
      )}
    </Container>
  );
};

const ChartRenderer = ({ chart, colorOffset = 0 }) => {
  if (!chart || !chart.chartType) {
    return <ChartPlaceholder>차트 정보를 불러올 수 없습니다.</ChartPlaceholder>;
  }

  const type = chart.chartType.toLowerCase();
  switch (type) {
    case "bar":
      return <BarChart data={chart.data} xLabel={chart.xLabel} yLabel={chart.yLabel} colorOffset={colorOffset} />;
    case "line":
      return <LineChart data={chart.data} xLabel={chart.xLabel} yLabel={chart.yLabel} colorOffset={colorOffset} />;
    case "pie":
      return <PieChart data={chart.data} colorOffset={colorOffset} />;
    case "scatter":
      return <ScatterChart data={chart.data} xLabel={chart.xLabel} yLabel={chart.yLabel} colorOffset={colorOffset} />;
    default:
      return <ChartPlaceholder>지원되지 않는 차트 유형입니다: {chart.chartType}</ChartPlaceholder>;
  }
};

const extractLabelValue = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item, idx) => {
      if (!item) return null;
      const label = typeof item.label === "string" && item.label.trim().length > 0
        ? item.label.trim()
        : `항목 ${idx + 1}`;
      const value = Number(item.value);
      if (!Number.isFinite(value)) return null;
      return { label, value };
    })
    .filter(Boolean);
};

const extractScatterPoints = (data) => {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (!item) return null;
      const x = Number(item.x);
      const y = Number(item.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const label = typeof item.label === "string" && item.label.trim().length > 0 ? item.label.trim() : undefined;
      return { x, y, label };
    })
    .filter(Boolean);
};

const BarChart = ({ data, xLabel, yLabel, colorOffset }) => {
  const values = extractLabelValue(data);
  if (values.length === 0) return <ChartPlaceholder>표시할 데이터가 없습니다.</ChartPlaceholder>;

  const labels = values.map((item) => item.label);
  const numbers = values.map((item) => item.value);
  const maxValue = Math.max(...numbers);
  const minValue = Math.min(...numbers);
  const range = maxValue - minValue || 1;
  const viewWidth = 120;
  const viewHeight = 100;
  const marginTop = 12;
  const marginBottom = 22;
  const marginSide = 14;
  const innerHeight = viewHeight - marginTop - marginBottom;
  const valueToY = (value) => viewHeight - marginBottom - ((value - minValue) / range) * innerHeight;
  const zeroLine = maxValue <= 0 ? marginTop : minValue >= 0 ? viewHeight - marginBottom : valueToY(0);
  const gap = values.length > 1 ? 6 : 0;
  const innerWidth = viewWidth - marginSide * 2;
  const barWidth = Math.max((innerWidth - gap * (values.length - 1)) / values.length, 6);

  return (
    <ChartWrapper>
      <Svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <line x1={marginSide} y1={zeroLine} x2={viewWidth - marginSide} y2={zeroLine} stroke="#cbd5f5" strokeWidth={1} />
        {values.map((item, index) => {
          const isNegative = item.value < 0;
          const yValue = valueToY(item.value);
          const barHeight = Math.abs(zeroLine - yValue);
          const clampedHeight = Number.isFinite(barHeight) ? Math.max(barHeight, 1) : 1;
          const x = marginSide + index * (barWidth + gap);
          const rectY = isNegative ? zeroLine : zeroLine - clampedHeight;
          const color = COLOR_PALETTE[(index + colorOffset) % COLOR_PALETTE.length];

          return (
            <g key={`bar-${index}`}>
              <rect
                x={x}
                y={Math.min(rectY, zeroLine)}
                width={barWidth}
                height={clampedHeight}
                fill={color}
                rx={2}
              />
              <text x={x + barWidth / 2} y={viewHeight - 6} textAnchor="middle" fontSize={6} fill="#475569">
                {labels[index]}
              </text>
            </g>
          );
        })}
        {yLabel && (
          <text x={4} y={marginTop} fontSize={6} fill="#64748b" textAnchor="start">
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x={viewWidth / 2} y={viewHeight - 2} fontSize={6} fill="#64748b" textAnchor="middle">
            {xLabel}
          </text>
        )}
      </Svg>
    </ChartWrapper>
  );
};

const LineChart = ({ data, xLabel, yLabel, colorOffset }) => {
  const values = extractLabelValue(data);
  if (values.length === 0) return <ChartPlaceholder>표시할 데이터가 없습니다.</ChartPlaceholder>;

  const numbers = values.map((item) => item.value);
  const maxValue = Math.max(...numbers);
  const minValue = Math.min(...numbers);
  const range = maxValue - minValue || 1;
  const viewWidth = 120;
  const viewHeight = 100;
  const marginTop = 12;
  const marginBottom = 20;
  const marginSide = 18;
  const innerWidth = viewWidth - marginSide * 2;
  const innerHeight = viewHeight - marginTop - marginBottom;
  const zeroLine = maxValue <= 0 ? marginTop : minValue >= 0 ? viewHeight - marginBottom : viewHeight - marginBottom - ((0 - minValue) / range) * innerHeight;
  const color = COLOR_PALETTE[colorOffset % COLOR_PALETTE.length];

  const points = values.map((item, index) => {
    const x = marginSide + (innerWidth / Math.max(values.length - 1, 1)) * index;
    const y = viewHeight - marginBottom - ((item.value - minValue) / range) * innerHeight;
    return { x, y, label: item.label, value: item.value };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <ChartWrapper>
      <Svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <line x1={marginSide} y1={zeroLine} x2={viewWidth - marginSide} y2={zeroLine} stroke="#cbd5f5" strokeWidth={1} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={`point-${index}`}>
            <circle cx={point.x} cy={point.y} r={2.5} fill={color} />
            <text x={point.x} y={viewHeight - 5} textAnchor="middle" fontSize={6} fill="#475569">
              {point.label}
            </text>
          </g>
        ))}
        {yLabel && (
          <text x={6} y={marginTop} fontSize={6} fill="#64748b" textAnchor="start">
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x={viewWidth / 2} y={viewHeight - 2} fontSize={6} fill="#64748b" textAnchor="middle">
            {xLabel}
          </text>
        )}
      </Svg>
    </ChartWrapper>
  );
};

const PieChart = ({ data, colorOffset }) => {
  const values = extractLabelValue(data);
  if (values.length === 0) return <ChartPlaceholder>표시할 데이터가 없습니다.</ChartPlaceholder>;

  const total = values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  if (total <= 0) return <ChartPlaceholder>유효한 비율 데이터를 찾을 수 없습니다.</ChartPlaceholder>;

  let cumulativeAngle = -Math.PI / 2;
  const center = 50;
  const radius = 40;

  const segments = values.map((item, index) => {
    const value = Math.max(item.value, 0);
    const angle = (value / total) * Math.PI * 2;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;
    const color = COLOR_PALETTE[(index + colorOffset) % COLOR_PALETTE.length];
    return { ...item, startAngle, endAngle, color };
  });

  const toPoint = (angle) => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  });

  return (
    <PieWrapper>
      <Svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(10,5)">
          {segments.map((segment, index) => {
            const start = toPoint(segment.startAngle);
            const end = toPoint(segment.endAngle);
            const largeArc = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0;
            const pathData = [
              `M ${center} ${center}`,
              `L ${start.x} ${start.y}`,
              `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
              "Z",
            ].join(" ");
            return <path key={`slice-${index}`} d={pathData} fill={segment.color} opacity={0.92} stroke="#ffffff" strokeWidth={0.5} />;
          })}
        </g>
      </Svg>
      <Legend>
        {segments.map((segment, index) => (
          <li key={`legend-${index}`}>
            <ColorDot style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
            <strong>{Math.round((Math.max(segment.value, 0) / total) * 1000) / 10}%</strong>
          </li>
        ))}
      </Legend>
    </PieWrapper>
  );
};

const ScatterChart = ({ data, xLabel, yLabel, colorOffset }) => {
  const points = extractScatterPoints(data);
  if (points.length === 0) return <ChartPlaceholder>표시할 데이터가 없습니다.</ChartPlaceholder>;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const padding = 8;
  const viewWidth = 120;
  const viewHeight = 100;
  const color = COLOR_PALETTE[colorOffset % COLOR_PALETTE.length];

  const scale = (value, min, max, size) => {
    if (max - min === 0) return size / 2;
    return ((value - min) / (max - min)) * size;
  };

  return (
    <ChartWrapper>
      <Svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        <rect
          x={padding}
          y={padding}
          width={viewWidth - padding * 2}
          height={viewHeight - padding * 2}
          fill="#f8fafc"
          stroke="#d0d7f0"
          strokeWidth={1}
          rx={4}
        />
        {points.map((point, index) => {
          const x = padding + scale(point.x, minX, maxX, viewWidth - padding * 2);
          const y = viewHeight - padding - scale(point.y, minY, maxY, viewHeight - padding * 2);
          return (
            <g key={`scatter-${index}`}>
              <circle cx={x} cy={y} r={3} fill={color} opacity={0.85} />
              {point.label && (
                <text x={x + 3.5} y={y - 3} fontSize={6} fill="#475569">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
        {xLabel && (
          <text x={viewWidth / 2} y={viewHeight - 2} fontSize={6} fill="#64748b" textAnchor="middle">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text x={4} y={12} fontSize={6} fill="#64748b" textAnchor="start">
            {yLabel}
          </text>
        )}
      </Svg>
    </ChartWrapper>
  );
};

export default DataVisualizationResult;

const Container = styled.div`
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const Title = styled.h4`
  margin: 0;
  font-size: 1.3em;
  font-weight: 700;
  color: #1f2937;
`;

const SubTitle = styled.p`
  margin: 6px 0 0;
  font-size: 0.95em;
  color: #475569;
`;

const MetaText = styled.p`
  margin: 4px 0 0;
  font-size: 0.85em;
  color: #64748b;
`;

const Summary = styled.p`
  margin: 0;
  font-size: 1em;
  line-height: 1.6;
  color: #1f2937;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
`;

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
`;

const ChartCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ChartHeading = styled.h5`
  margin: 0;
  font-size: 1.05em;
  color: #1e3a8a;
`;

const ChartInsight = styled.p`
  margin: 0;
  font-size: 0.9em;
  color: #334155;
`;

const ChartWrapper = styled.div`
  width: 100%;
  background: #f8fafc;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #e2e8f0;
`;

const ChartPlaceholder = styled.div`
  width: 100%;
  min-height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #94a3b8;
  font-size: 0.9em;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #e2e8f0;
`;

const Svg = styled.svg`
  width: 100%;
  height: auto;
`;

const PieWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Legend = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85em;
    color: #1f2937;

    strong {
      margin-left: auto;
      color: #0f172a;
      font-weight: 600;
    }
  }
`;

const ColorDot = styled.span`
  display: inline-flex;
  width: 10px;
  height: 10px;
  border-radius: 50%;
`;

const InlineList = styled.ul`
  padding-left: 18px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #475569;
  font-size: 0.85em;
`;

const NotesSection = styled.div`
  background: #f1f5f9;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
`;

const SectionTitle = styled.h6`
  margin: 0 0 10px;
  font-size: 0.95em;
  color: #1e293b;
`;

const PreviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ScrollTable = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
  }

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }

  thead {
    background: #f8fafc;
  }
`;

const EmptyState = styled.div`
  background: #f8fafc;
  border-radius: 12px;
  padding: 18px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
  font-size: 0.95em;
  text-align: center;
`;

export { DataVisualizationResult };
