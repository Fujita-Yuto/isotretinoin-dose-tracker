import {
  calcCumulative,
  calcDoseSummary,
  cumulativeSeries,
  currentDailyDose,
  latestWeight,
  projectGoalDate,
  type CalcMode,
  type DoseRecord,
  type WeightRecord,
} from "../lib/calc";
import QuickCalc from "./QuickCalc";
import CumulativeChart from "./CumulativeChart";
import FaqSection from "./FaqSection";

interface Props {
  doses: DoseRecord[];
  weights: WeightRecord[];
  missedDates: string[];
  calcMode: CalcMode;
  targetMgPerKg: number;
  today: string;
  showBackupNudge: boolean;
  onGoToRecords: () => void;
  onGoToSettings: () => void;
  onDismissBackupNudge: () => void;
}

function formatDateJa(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

export default function HomeTab({
  doses,
  weights,
  missedDates,
  calcMode,
  targetMgPerKg,
  today,
  showBackupNudge,
  onGoToRecords,
  onGoToSettings,
  onDismissBackupNudge,
}: Props) {
  const summary = calcDoseSummary(doses, today, missedDates);
  const weight = latestWeight(weights);
  const cumulative = calcCumulative(doses, weights, calcMode, today, missedDates);
  const dose = currentDailyDose(doses, today);
  const projection = projectGoalDate(
    cumulative,
    dose,
    weight?.weightKg ?? null,
    targetMgPerKg,
    today
  );
  const series = cumulativeSeries(doses, weights, calcMode, today, missedDates);

  const percent =
    cumulative != null ? Math.min(100, (cumulative / targetMgPerKg) * 100) : null;
  const targetTotalMg = weight != null ? Math.round(targetMgPerKg * weight.weightKg) : null;

  const needsSetup = doses.length === 0 || weight == null;
  const backupNudgeVisible = showBackupNudge && !needsSetup && summary.totalDays >= 30;

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

      {backupNudgeVisible && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-bold mb-1">💾 バックアップをおすすめします</p>
          <p className="text-xs leading-relaxed text-blue-800">
            記録が30日分を超えました。機種変更やブラウザのデータ消去で記録が失われないよう、設定からエクスポート（ファイル保存）しておくと安心です。
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onGoToSettings}
              className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-lg active:bg-blue-700"
            >
              設定でエクスポート
            </button>
            <button
              onClick={onDismissBackupNudge}
              className="px-4 py-2.5 rounded-lg border border-blue-300 text-blue-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 累積量の大きな表示 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">現在の累積投与量</p>
        <p className="text-5xl font-bold">
          {cumulative != null ? cumulative.toFixed(1) : "--"}
          <span className="text-lg font-normal text-slate-500 ml-1">mg/kg</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {calcMode === "period" ? "期間ごとの体重で計算（厳密）" : "最新の体重で計算（シンプル）"}
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
          {targetTotalMg != null && (
            <p className="text-xs text-slate-500 mt-1.5 tabular-nums">
              服用総量 {summary.totalMg.toLocaleString()} / 目標 {targetTotalMg.toLocaleString()} mg
            </p>
          )}
        </div>

        {/* 到達予測 */}
        {projection.status === "reached" ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 leading-relaxed">
            <p className="font-bold">🎉 目標累積量に到達しました</p>
            <p className="text-xs mt-1">
              治療を終了するかどうかはこのアプリでは判断できません。今後の治療方針は必ず主治医とご相談ください。
            </p>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-600">
            {projection.status === "projected" && (
              <>
                <p>
                  目標到達予測日:{" "}
                  <span className="font-bold">{formatDateJa(projection.date)}</span>
                  <span className="text-slate-400">
                    （あと約{projection.daysRemaining}日
                    {projection.daysRemaining >= 60 &&
                      `・約${Math.round(projection.daysRemaining / 30)}ヶ月`}
                    ）
                  </span>
                </p>
                {dose != null && dose > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    ※ 現在の1日量（{dose}mg/日）が今後も続いた場合の目安です
                  </p>
                )}
              </>
            )}
            {projection.status === "unknown" && (
              <p className="text-slate-400">
                到達予測日: --（休薬中または記録が不足しています）
              </p>
            )}
          </div>
        )}
      </section>

      {/* 内訳 */}
      <section className="space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500">服用総量</p>
            <p className="text-xl font-bold tabular-nums">
              {summary.totalMg.toLocaleString()}
              <span className="text-sm font-normal text-slate-500 ml-0.5">mg</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500">治療日数</p>
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
        </div>
        {summary.missedDays > 0 && (
          <p className="text-xs text-slate-500 text-center">
            飲み忘れ {summary.missedDays} 日分は服用総量・累積量から除いています
          </p>
        )}
      </section>

      {/* 累積量の推移グラフ */}
      {series.length >= 2 && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-base mb-1">累積量の推移</h2>
          <p className="text-xs text-slate-500 mb-3">
            治療開始からの累積投与量 (mg/kg)。グラフに触れると日ごとの値が見られます。
          </p>
          <CumulativeChart points={series} targetMgPerKg={targetMgPerKg} />
        </section>
      )}

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
          本アプリでは、用量を変更した日付と1日量を記録するだけで服用総量を自動計算し、累積投与量と目標までの進捗を表示します。体重が大きく変わった場合は、設定から「期間ごとの体重で計算する」モードに切り替えると、その時々の体重を使ったより厳密な計算ができます。
        </p>
        <p className="text-xs text-slate-500">
          ※ 目標値や治療方針は個人差があります。必ず主治医の指示に従ってください。
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          出典:{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/26187395/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Evaluation of Evidence for Acne Remission With Oral Isotretinoin Cumulative Dosing of
            120-150 mg/kg (PubMed)
          </a>
          {" / "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/26471145/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Making sense of the effects of the cumulative dose of isotretinoin in acne vulgaris
            (PubMed)
          </a>
        </p>
      </section>

      {/* よくある質問 */}
      <FaqSection />

      {/* 運営者情報 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 text-sm leading-relaxed text-slate-700 space-y-3">
        <h2 className="font-bold text-base">このアプリについて（運営者情報）</h2>
        <p>
          本アプリは、イソトレチノイン服用中の累積投与量の管理が煩雑だったことをきっかけに、個人が開発・運営している無料の計算補助ツールです。広告はなく、利用データの収集も行っていません。
        </p>
        <p className="text-xs text-slate-500">
          記載内容は医師の監修を受けたものではありません。計算結果や解説は参考情報であり、診断・治療方針の決定には使用できません。服用に関する判断は必ず主治医・薬剤師にご相談ください。誤りのご指摘・ご要望は
          <a
            href="https://github.com/Fujita-Yuto/isotretinoin-dose-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            GitHubリポジトリ
          </a>
          までお寄せください。
        </p>
      </section>
    </div>
  );
}
