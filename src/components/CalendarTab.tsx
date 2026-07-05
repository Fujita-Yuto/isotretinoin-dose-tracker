import { useState } from "react";
import { doseOnDate, type DoseRecord } from "../lib/calc";

interface Props {
  doses: DoseRecord[];
  missedDates: string[];
  today: string;
  onToggleMissed: (date: string) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dateStrOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarTab({ doses, missedDates, today, onToggleMissed }: Props) {
  const [ty, tm] = today.split("-").map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const missedSet = new Set(missedDates);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  // 月間サマリー（今日までの治療期間内のみ）
  let dosedDays = 0;
  let restDays = 0;
  let missedDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = dateStrOf(year, month, d);
    if (dateStr > today) break;
    const dose = doseOnDate(doses, dateStr);
    if (dose == null) continue;
    if (dose === 0) restDays++;
    else if (missedSet.has(dateStr)) missedDays++;
    else dosedDays++;
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg">服用カレンダー</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        飲み忘れた日をタップすると記録できます（もう一度タップで取り消し）。飲み忘れの分は累積量の計算から自動で除かれます。
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            aria-label="前の月"
            className="w-10 h-10 rounded-lg border border-slate-300 text-slate-600 text-lg"
          >
            ‹
          </button>
          <p className="font-bold">
            {year}年{month}月
          </p>
          <button
            onClick={nextMonth}
            aria-label="次の月"
            className="w-10 h-10 rounded-lg border border-slate-300 text-slate-600 text-lg"
          >
            ›
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* 日グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day == null) return <div key={`blank-${i}`} />;
            const dateStr = dateStrOf(year, month, day);
            const isFuture = dateStr > today;
            const dose = isFuture ? null : doseOnDate(doses, dateStr);
            const isMissed = missedSet.has(dateStr);
            const isToday = dateStr === today;
            const clickable = dose != null && dose > 0;

            let style = "bg-slate-50 text-slate-400"; // 治療期間外・未来
            let sub = "";
            if (dose != null) {
              if (dose === 0) {
                style = "bg-amber-50 text-amber-700";
                sub = "休";
              } else if (isMissed) {
                style = "bg-red-50 text-red-600 border border-red-300";
                sub = "忘";
              } else {
                style = "bg-blue-50 text-blue-800";
                sub = `${dose}`;
              }
            }

            const label =
              dose == null
                ? `${month}月${day}日`
                : dose === 0
                  ? `${month}月${day}日 休薬`
                  : isMissed
                    ? `${month}月${day}日 飲み忘れ。タップで取り消す`
                    : `${month}月${day}日 ${dose}mg 服用。タップで飲み忘れにする`;

            return (
              <button
                key={dateStr}
                disabled={!clickable}
                onClick={() => onToggleMissed(dateStr)}
                aria-label={label}
                aria-pressed={clickable ? isMissed : undefined}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm leading-tight ${style} ${
                  isToday ? "ring-2 ring-blue-400" : ""
                } ${clickable ? "active:scale-95 transition-transform" : "cursor-default"}`}
              >
                <span className="font-medium">{day}</span>
                {sub && <span className="text-[10px]">{sub}</span>}
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />
            服用（数字は mg）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" />
            休薬
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-50 border border-red-300 inline-block" />
            飲み忘れ
          </span>
        </div>
      </div>

      {/* 月間サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">服用</p>
          <p className="text-lg font-bold tabular-nums">
            {dosedDays}
            <span className="text-sm font-normal text-slate-500 ml-0.5">日</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">休薬</p>
          <p className="text-lg font-bold tabular-nums">
            {restDays}
            <span className="text-sm font-normal text-slate-500 ml-0.5">日</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-500">飲み忘れ</p>
          <p className="text-lg font-bold tabular-nums">
            {missedDays}
            <span className="text-sm font-normal text-slate-500 ml-0.5">日</span>
          </p>
        </div>
      </div>
    </div>
  );
}
