// 累積投与量の計算ロジック（純関数）
// 日付はすべて "YYYY-MM-DD" 形式の文字列で扱う

export interface DoseRecord {
  id: string;
  /** この用量での服用開始日 (YYYY-MM-DD) */
  startDate: string;
  /** 1日量 (mg)。0 = 休薬 */
  doseMgPerDay: number;
}

export interface WeightRecord {
  id: string;
  /** 測定日 (YYYY-MM-DD) */
  date: string;
  weightKg: number;
}

/** 累積量の計算モード: latest = 最新体重で一括計算 / period = その時々の体重で日ごとに計算 */
export type CalcMode = "latest" | "period";

export interface DosePeriod {
  record: DoseRecord;
  /** この用量の期間の日数（開始日を含む。飲み忘れも日数には含む） */
  days: number;
  /** この期間に実際に服用した量 (mg)。飲み忘れ分は除く */
  totalMg: number;
}

export interface DoseSummary {
  totalMg: number;
  /** 治療日数（休薬 0mg・飲み忘れの日も含む） */
  totalDays: number;
  /** 飲み忘れとして記録された日数（服用予定があった日のみ） */
  missedDays: number;
  periods: DosePeriod[];
}

/** "YYYY-MM-DD" を UTC 基準のタイムスタンプに変換（DST の影響を受けない日数計算のため） */
function toUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** UTC タイムスタンプを "YYYY-MM-DD" に変換 */
function fromUtc(ts: number): string {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** from から to までの日数差（to - from）。同日なら 0 */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

/** ローカルタイムゾーンでの今日の日付を "YYYY-MM-DD" で返す */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 開始日昇順にソートしたコピーを返す */
export function sortDoseRecords(records: DoseRecord[]): DoseRecord[] {
  return [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** 測定日昇順にソートしたコピーを返す（同日は入力順を維持） */
function sortWeights(records: WeightRecord[]): WeightRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 服用総量と治療日数を計算する。
 * 各記録は「開始日から次の記録の前日まで（最後の記録は today まで、開始日・today を含む）」
 * その 1 日量で服用したとみなす。missedDates（飲み忘れ日）の分は総量から除く。
 */
export function calcDoseSummary(
  records: DoseRecord[],
  today: string,
  missedDates: string[] = []
): DoseSummary {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= today);
  const missed = [...new Set(missedDates)].filter((m) => m <= today);
  const periods: DosePeriod[] = [];
  let totalMg = 0;
  let totalDays = 0;
  let missedDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];
    // 次の記録の開始日（排他的終端）。最後の記録は today の翌日を終端とする＝today を含む
    const endExclusive =
      i < sorted.length - 1 ? toUtc(sorted[i + 1].startDate) : toUtc(today) + MS_PER_DAY;
    const days = Math.max(0, Math.round((endExclusive - toUtc(record.startDate)) / MS_PER_DAY));

    let missedInPeriod = 0;
    if (record.doseMgPerDay > 0 && days > 0) {
      for (const m of missed) {
        if (m >= record.startDate && toUtc(m) < endExclusive) missedInPeriod++;
      }
    }

    const periodMg = (days - missedInPeriod) * record.doseMgPerDay;
    periods.push({ record, days, totalMg: periodMg });
    totalMg += periodMg;
    totalDays += days;
    missedDays += missedInPeriod;
  }

  return { totalMg, totalDays, missedDays, periods };
}

/** その日に服用予定の 1 日量。治療開始前・記録なしなら null */
export function doseOnDate(records: DoseRecord[], date: string): number | null {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= date);
  if (sorted.length === 0) return null;
  return sorted[sorted.length - 1].doseMgPerDay;
}

/** 最新（日付が最大）の体重記録を返す。同日が複数あれば後に追加されたものを優先 */
export function latestWeight(records: WeightRecord[]): WeightRecord | null {
  if (records.length === 0) return null;
  let latest = records[0];
  for (const r of records) {
    if (r.date >= latest.date) latest = r;
  }
  return latest;
}

/**
 * その日時点の体重 (kg)。その日以前の最新の記録を使い、
 * 治療初期にまだ記録がない場合は最初の体重記録で代用する。記録ゼロなら null
 */
export function weightOnDate(records: WeightRecord[], date: string): number | null {
  if (records.length === 0) return null;
  const sorted = sortWeights(records);
  let current: WeightRecord | null = null;
  for (const w of sorted) {
    if (w.date <= date) current = w;
    else break;
  }
  return (current ?? sorted[0]).weightKg;
}

/** 累積投与量 (mg/kg)。体重未登録なら null */
export function calcCumulativeMgPerKg(totalMg: number, weightKg: number | null): number | null {
  if (weightKg == null || weightKg <= 0) return null;
  return totalMg / weightKg;
}

/**
 * 期間ごとの体重を使った厳密な累積投与量 (mg/kg)。
 * 1 日ごとに「その日の 1 日量 ÷ その日時点の体重」を積み上げる。
 */
export function calcCumulativeStrict(
  records: DoseRecord[],
  weights: WeightRecord[],
  today: string,
  missedDates: string[] = []
): number | null {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= today);
  if (sorted.length === 0 || weights.length === 0) return null;
  const sortedW = sortWeights(weights);
  const missedSet = new Set(missedDates);

  let sum = 0;
  let doseIdx = 0;
  let currentDose = 0;
  let weightIdx = 0;
  let currentWeight = sortedW[0].weightKg; // 開始時点で記録がなければ最初の体重で代用

  const start = toUtc(sorted[0].startDate);
  const end = toUtc(today);
  for (let t = start; t <= end; t += MS_PER_DAY) {
    const date = fromUtc(t);
    while (doseIdx < sorted.length && sorted[doseIdx].startDate <= date) {
      currentDose = sorted[doseIdx].doseMgPerDay;
      doseIdx++;
    }
    while (weightIdx < sortedW.length && sortedW[weightIdx].date <= date) {
      currentWeight = sortedW[weightIdx].weightKg;
      weightIdx++;
    }
    if (currentDose > 0 && currentWeight > 0 && !missedSet.has(date)) {
      sum += currentDose / currentWeight;
    }
  }
  return sum;
}

/** 選択中の計算モードでの現在の累積投与量 (mg/kg) */
export function calcCumulative(
  records: DoseRecord[],
  weights: WeightRecord[],
  mode: CalcMode,
  today: string,
  missedDates: string[] = []
): number | null {
  if (mode === "period") {
    return calcCumulativeStrict(records, weights, today, missedDates);
  }
  const { totalMg } = calcDoseSummary(records, today, missedDates);
  return calcCumulativeMgPerKg(totalMg, latestWeight(weights)?.weightKg ?? null);
}

export interface SeriesPoint {
  date: string;
  mgPerKg: number;
}

/**
 * グラフ用: 治療開始日から today までの累積投与量 (mg/kg) の日次推移。
 * 体重・服用記録がなければ空配列
 */
export function cumulativeSeries(
  records: DoseRecord[],
  weights: WeightRecord[],
  mode: CalcMode,
  today: string,
  missedDates: string[] = []
): SeriesPoint[] {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= today);
  if (sorted.length === 0 || weights.length === 0) return [];
  const sortedW = sortWeights(weights);
  const missedSet = new Set(missedDates);
  const latestW = latestWeight(weights)!.weightKg;
  if (latestW <= 0) return [];

  const points: SeriesPoint[] = [];
  let totalMg = 0;
  let strictSum = 0;
  let doseIdx = 0;
  let currentDose = 0;
  let weightIdx = 0;
  let currentWeight = sortedW[0].weightKg;

  const start = toUtc(sorted[0].startDate);
  const end = toUtc(today);
  for (let t = start; t <= end; t += MS_PER_DAY) {
    const date = fromUtc(t);
    while (doseIdx < sorted.length && sorted[doseIdx].startDate <= date) {
      currentDose = sorted[doseIdx].doseMgPerDay;
      doseIdx++;
    }
    while (weightIdx < sortedW.length && sortedW[weightIdx].date <= date) {
      currentWeight = sortedW[weightIdx].weightKg;
      weightIdx++;
    }
    if (currentDose > 0 && !missedSet.has(date)) {
      totalMg += currentDose;
      if (currentWeight > 0) strictSum += currentDose / currentWeight;
    }
    points.push({ date, mgPerKg: mode === "period" ? strictSum : totalMg / latestW });
  }
  return points;
}

/** 現在有効な 1 日量（today 時点で最後に開始された記録の用量）。記録なしなら null */
export function currentDailyDose(records: DoseRecord[], today: string): number | null {
  return doseOnDate(records, today);
}

export type GoalProjection =
  | { status: "reached" }
  | { status: "projected"; date: string; daysRemaining: number }
  | { status: "unknown" }; // 休薬中・記録不足で予測不能

/**
 * 現在の用量ペースが続いた場合の目標到達予測日。
 * 明日以降、毎日 currentDose mg を服用し、体重は weightKg のままと仮定する。
 */
export function projectGoalDate(
  cumulativeMgPerKg: number | null,
  currentDose: number | null,
  weightKg: number | null,
  targetMgPerKg: number,
  today: string
): GoalProjection {
  if (cumulativeMgPerKg == null || weightKg == null || weightKg <= 0) {
    return { status: "unknown" };
  }
  if (cumulativeMgPerKg >= targetMgPerKg) return { status: "reached" };
  if (currentDose == null || currentDose <= 0) return { status: "unknown" };
  const remainingMg = (targetMgPerKg - cumulativeMgPerKg) * weightKg;
  const daysRemaining = Math.ceil(remainingMg / currentDose);
  return {
    status: "projected",
    date: fromUtc(toUtc(today) + daysRemaining * MS_PER_DAY),
    daysRemaining,
  };
}

export interface QuickCalcResult {
  totalMg: number;
  mgPerKg: number;
}

/**
 * かんたん計算機: 1日量・服用日数・体重からその場で積算量を計算する。
 * 入力が不正（負の値・体重 0 以下・非数値）なら null
 */
export function calcQuickCumulative(
  doseMgPerDay: number,
  days: number,
  weightKg: number
): QuickCalcResult | null {
  if (!Number.isFinite(doseMgPerDay) || doseMgPerDay < 0) return null;
  if (!Number.isFinite(days) || days < 0) return null;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  const totalMg = doseMgPerDay * days;
  return { totalMg, mgPerKg: totalMg / weightKg };
}
