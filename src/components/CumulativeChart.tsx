import { useRef, useState } from "react";
import type { SeriesPoint } from "../lib/calc";

interface Props {
  points: SeriesPoint[];
  targetMgPerKg: number;
}

// 描画領域（viewBox 座標系）
const W = 640;
const H = 260;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 26;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const SERIES = "#2563eb"; // blue-600（バリデータ検証済み）
const GRID = "#f1f5f9"; // slate-100
const AXIS_TEXT = "#64748b"; // slate-500
const ANNOTATION = "#94a3b8"; // slate-400

/** 表示に耐える点数までダウンサンプリング（最後の点は必ず残す） */
function downsample(points: SeriesPoint[], maxPoints = 366): SeriesPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, i) => i % step === 0);
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
}

/** 0 から maxV までのきりの良い目盛り */
function niceTicks(maxV: number): number[] {
  if (maxV <= 0) return [0, 1];
  const rawStep = maxV / 4;
  const pow = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((c) => c * pow).find((s) => s >= rawStep) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= maxV + step * 0.999; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

function fullDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** 数値テーブル用に月初・最終日の点を抜き出す */
function tableRows(points: SeriesPoint[]): SeriesPoint[] {
  const rows = points.filter((p, i) => i === 0 || p.date.endsWith("-01"));
  const last = points[points.length - 1];
  if (rows[rows.length - 1] !== last) rows.push(last);
  return rows;
}

export default function CumulativeChart({ points: rawPoints, targetMgPerKg }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points = downsample(rawPoints);
  const n = points.length;
  if (n < 2) return null;

  const maxValue = Math.max(targetMgPerKg, points[n - 1].mgPerKg);
  const yTicks = niceTicks(maxValue);
  const yMax = yTicks[yTicks.length - 1];

  const xFor = (i: number) => PAD_L + (i / (n - 1)) * PLOT_W;
  const yFor = (v: number) => PAD_T + (1 - v / yMax) * PLOT_H;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.mgPerKg).toFixed(1)}`)
    .join("");
  const areaPath = `${linePath}L${xFor(n - 1).toFixed(1)},${yFor(0)}L${xFor(0).toFixed(1)},${yFor(0)}Z`;

  // X軸の目盛り: 最大4点を等間隔に
  const xTickIdx = [...new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1])];

  const last = points[n - 1];
  const targetY = yFor(targetMgPerKg);

  const indexFromClientX = (clientX: number): number => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const ratio = (svgX - PAD_L) / PLOT_W;
    return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setHover((prev) => {
        const cur = prev ?? n - 1;
        if (e.key === "ArrowLeft") return Math.max(0, cur - 1);
        if (e.key === "ArrowRight") return Math.min(n - 1, cur + 1);
        if (e.key === "Home") return 0;
        return n - 1;
      });
    }
  };

  const hoverPoint = hover != null ? points[hover] : null;
  const hoverLeftPct = hover != null ? (xFor(hover) / W) * 100 : 0;
  const tooltipTransform =
    hover == null
      ? undefined
      : hover < n * 0.2
        ? "translateX(0)"
        : hover > n * 0.8
          ? "translateX(-100%)"
          : "translateX(-50%)";

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        role="img"
        aria-label={`累積投与量の推移。${fullDateJa(points[0].date)}から${fullDateJa(last.date)}まで、現在 ${last.mgPerKg.toFixed(1)} mg/kg。左右キーで日付ごとの値を確認できます`}
        tabIndex={0}
        onPointerMove={(e) => setHover(indexFromClientX(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onKeyDown={handleKeyDown}
        onBlur={() => setHover(null)}
        style={{ outline: "none" }}
      >
        {/* 横グリッド線 + Y目盛り */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yFor(v)} y2={yFor(v)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_L - 6} y={yFor(v) + 4} textAnchor="end" fontSize={11} fill={AXIS_TEXT}>
              {v}
            </text>
          </g>
        ))}

        {/* X目盛り */}
        {xTickIdx.map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize={11}
            fill={AXIS_TEXT}
          >
            {shortDate(points[i].date)}
          </text>
        ))}

        {/* 目標ライン（注釈） */}
        {targetMgPerKg <= yMax && (
          <g>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={targetY}
              y2={targetY}
              stroke={ANNOTATION}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text
              x={W - PAD_R}
              y={targetY - 5}
              textAnchor="end"
              fontSize={11}
              fill={AXIS_TEXT}
              fontWeight={600}
            >
              目標 {targetMgPerKg}
            </text>
          </g>
        )}

        {/* 面（うすい水彩） と 線 */}
        <path d={areaPath} fill={SERIES} opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke={SERIES}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* クロスヘア（ホバー位置） */}
        {hoverPoint && hover != null && (
          <g>
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={PAD_T}
              y2={PAD_T + PLOT_H}
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            <circle
              cx={xFor(hover)}
              cy={yFor(hoverPoint.mgPerKg)}
              r={4}
              fill={SERIES}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </g>
        )}

        {/* 終端ドット + 現在値の直接ラベル（終端のみ） */}
        <circle cx={xFor(n - 1)} cy={yFor(last.mgPerKg)} r={4} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
        <text
          x={Math.min(xFor(n - 1), W - PAD_R - 4)}
          y={Math.max(yFor(last.mgPerKg) - 10, 12)}
          textAnchor="end"
          fontSize={12}
          fontWeight={700}
          fill="#334155"
        >
          {last.mgPerKg.toFixed(1)}
        </text>
      </svg>

      {/* ツールチップ */}
      {hoverPoint && (
        <div
          className="absolute top-0 pointer-events-none bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5 text-center"
          style={{ left: `${hoverLeftPct}%`, transform: tooltipTransform }}
        >
          <p className="text-sm font-bold text-slate-800 tabular-nums">
            {hoverPoint.mgPerKg.toFixed(1)} mg/kg
          </p>
          <p className="text-xs text-slate-500">{fullDateJa(hoverPoint.date)}</p>
        </div>
      )}

      {/* 数値テーブル（アクセシビリティ / ホバー不能環境向け） */}
      <details className="mt-2">
        <summary className="text-xs text-slate-500 cursor-pointer">数値で見る（月ごと）</summary>
        <div className="overflow-x-auto mt-1">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-1 pr-4 font-medium">日付</th>
                <th className="py-1 font-medium">累積量 (mg/kg)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows(points).map((p) => (
                <tr key={p.date} className="border-b border-slate-100">
                  <td className="py-1 pr-4">{p.date}</td>
                  <td className="py-1 tabular-nums">{p.mgPerKg.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
