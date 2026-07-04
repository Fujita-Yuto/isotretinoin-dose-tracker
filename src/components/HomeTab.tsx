import {
  calcCumulativeMgPerKg,
  calcDoseSummary,
  currentDailyDose,
  latestWeight,
  projectGoalDate,
  type DoseRecord,
  type WeightRecord,
} from "../lib/calc";
import QuickCalc from "./QuickCalc";

interface Props {
  doses: DoseRecord[];
  weights: WeightRecord[];
  targetMgPerKg: number;
  today: string;
  onGoToRecords: () => void;
}

function formatDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export default function HomeTab({ doses, weights, targetMgPerKg, today, onGoToRecords }: Props) {
  const summary = calcDoseSummary(doses, today);
  const weight = latestWeight(weights);
  const cumulative = calcCumulativeMgPerKg(summary.totalMg, weight?.weightKg ?? null);
  const dose = currentDailyDose(doses, today);
  const projection = projectGoalDate(doses, weight?.weightKg ?? null, targetMgPerKg, today);

  const percent =
    cumulative != null ? Math.min(100, (cumulative / targetMgPerKg) * 100) : null;

  const needsSetup = doses.length === 0 || weight == null;

  return (
    <div className="space-y-5">
      {needsSetup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-bold mb-1">はじめに記録を登録してください</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {weight == null && <li>体重を記録する</li>}
            {doses.length === 0 && <li>服用記録（開始日と1日量）を追加する</li>}
          </ul>
          <button
            onClick={onGoToRecords}
            className="mt-3 w-full bg-amber-500 text-white font-bold py-2.5 rounded-lg active:bg-amber-600"
          >
            記録画面へ
          </button>
        </div>
      )}

      {/* 累積量の大きな表示 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">現在の累積投与量</p>
        <p className="text-5xl font-bold tabular-nums">
          {cumulative != null ? cumulative.toFixed(1) : "--"}
          <span className="text-lg font-normal text-slate-500 ml-1">mg/kg</span>
        </p>

        {/* 進捗バー */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>進捗</span>
            <span>
              {percent != null ? `${percent.toFixed(1)}%` : "--%"}（目標 {targetMgPerKg} mg/kg）
            </span>
          </div>
          <div
            className="h-3 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent != null ? Math.round(percent) : undefined}
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>
        </div>

        {/* 到達予測 */}
        <p className="mt-4 text-sm text-slate-600">
          {projection.status === "reached" && (
            <span className="text-green-600 font-bold">🎉 目標累積量に到達しています</span>
          )}
          {projection.status === "projected" && (
            <>
              目標到達予測日:{" "}
              <span className="font-bold">{formatDateJa(projection.date)}</span>
              <span className="text-slate-400">（あと約{projection.daysRemaining}日）</span>
            </>
          )}
          {projection.status === "unknown" && (
            <span className="text-slate-400">
              到達予測日: --（休薬中または記録が不足しています）
            </span>
          )}
        </p>
      </section>

      {/* 内訳 */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">服用総量</p>
          <p className="text-xl font-bold tabular-nums">
            {summary.totalMg.toLocaleString()}
            <span className="text-sm font-normal text-slate-500 ml-0.5">mg</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">服用日数</p>
          <p className="text-xl font-bold tabular-nums">
            {summary.totalDays.toLocaleString()}
            <span className="text-sm font-normal text-slate-500 ml-0.5">日</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">現在の1日量</p>
          <p className="text-xl font-bold tabular-nums">
            {dose != null ? dose : "--"}
            <span className="text-sm font-normal text-slate-500 ml-0.5">mg/日</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">計算に使う体重</p>
          <p className="text-xl font-bold tabular-nums">
            {weight != null ? weight.weightKg : "--"}
            <span className="text-sm font-normal text-slate-500 ml-0.5">kg</span>
          </p>
        </div>
      </section>

      {/* かんたん計算機（記録不要のその場計算） */}
      <QuickCalc />

      {/* 計算方法の解説（SEO・利用者向け） */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-700 space-y-3">
        <h2 className="font-bold text-base">イソトレチノインの累積投与量とは</h2>
        <p>
          イソトレチノイン（アキュテイン、ロアキュタン等）の治療では、体重あたりの累積投与量（mg/kg）が治療終了の目安として使われます。一般に
          <strong> 120〜150 mg/kg </strong>
          が目標とされ、この量に達すると再発率が下がると報告されています。
        </p>
        <p className="bg-slate-50 rounded-lg p-3 font-mono text-xs">
          累積投与量 (mg/kg) ＝ 服用総量 (mg) ÷ 体重 (kg)
          <br />
          服用総量 (mg) ＝ Σ（各期間の1日量 mg × 服用日数）
        </p>
        <p>
          本アプリでは、用量を変更した日付と1日量を記録するだけで服用総量を自動計算し、最新の体重で割った累積投与量と目標までの進捗を表示します。
        </p>
        <p className="text-xs text-slate-500">
          ※ 目標値や治療方針は個人差があります。必ず主治医の指示に従ってください。
        </p>
      </section>
    </div>
  );
}
