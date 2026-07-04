import { useState } from "react";
import { calcQuickCumulative } from "../lib/calc";

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-400";

/**
 * かんたん計算機: 記録を登録しなくても、体重・1日量・服用日数を
 * 入力するだけでその場で積算量を計算するコーナー
 */
export default function QuickCalc() {
  const [weightKg, setWeightKg] = useState("");
  const [doseMg, setDoseMg] = useState("");
  const [days, setDays] = useState("");

  const allFilled = weightKg.trim() !== "" && doseMg.trim() !== "" && days.trim() !== "";
  const result = allFilled
    ? calcQuickCumulative(Number(doseMg), Number(days), Number(weightKg))
    : null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h2 className="font-bold text-base">かんたん計算機</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        記録を登録しなくても、入力するだけでその場で積算量を計算できます（入力内容は保存されません）。
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="qc-weight" className="block text-xs font-medium mb-1">
            体重 (kg)
          </label>
          <input
            id="qc-weight"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            placeholder="60"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="qc-dose" className="block text-xs font-medium mb-1">
            1日量 (mg)
          </label>
          <input
            id="qc-dose"
            type="number"
            inputMode="decimal"
            min={0}
            step={5}
            placeholder="20"
            value={doseMg}
            onChange={(e) => setDoseMg(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="qc-days" className="block text-xs font-medium mb-1">
            服用日数 (日)
          </label>
          <input
            id="qc-days"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="90"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-center" aria-live="polite">
        {result != null ? (
          <>
            <p className="text-3xl font-bold tabular-nums">
              {result.mgPerKg.toFixed(1)}
              <span className="text-base font-normal text-slate-500 ml-1">mg/kg</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              服用総量 {result.totalMg.toLocaleString()} mg（目標 120 mg/kg の
              {Math.min(999, (result.mgPerKg / 120) * 100).toFixed(0)}%）
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-400">
            {allFilled
              ? "入力値を確認してください（体重は 0 より大きい数値）"
              : "3つの項目を入力すると結果が表示されます"}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ※ 途中で用量が変わった場合は、期間ごとに計算して足し合わせるか、「記録」タブで用量履歴として登録すると正確に計算できます。
      </p>
    </section>
  );
}
