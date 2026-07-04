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

export interface DosePeriod {
  record: DoseRecord;
  /** この用量で服用した日数（開始日を含む） */
  days: number;
  /** この期間の服用量 (mg) */
  totalMg: number;
}

export interface DoseSummary {
  totalMg: number;
  /** 服用日数（休薬 0mg の期間も含む治療日数） */
  totalDays: number;
  periods: DosePeriod[];
}

/** "YYYY-MM-DD" を UTC 基準のタイムスタンプに変換（DST の影響を受けない日数計算のため） */
function toUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
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

/**
 * 服用総量と服用日数を計算する。
 * 各記録は「開始日から次の記録の前日まで（最後の記録は today まで、開始日・today を含む）」
 * その 1 日量で服用したとみなす。
 */
export function calcDoseSummary(records: DoseRecord[], today: string): DoseSummary {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= today);
  const periods: DosePeriod[] = [];
  let totalMg = 0;
  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];
    // 次の記録の開始日（排他的終端）。最後の記録は today の翌日を終端とする＝today を含む
    const endExclusive =
      i < sorted.length - 1 ? toUtc(sorted[i + 1].startDate) : toUtc(today) + MS_PER_DAY;
    const days = Math.max(0, Math.round((endExclusive - toUtc(record.startDate)) / MS_PER_DAY));
    const periodMg = days * record.doseMgPerDay;
    periods.push({ record, days, totalMg: periodMg });
    totalMg += periodMg;
    totalDays += days;
  }

  return { totalMg, totalDays, periods };
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

/** 累積投与量 (mg/kg)。体重未登録なら null */
export function calcCumulativeMgPerKg(totalMg: number, weightKg: number | null): number | null {
  if (weightKg == null || weightKg <= 0) return null;
  return totalMg / weightKg;
}

/** 現在有効な 1 日量（today 時点で最後に開始された記録の用量）。記録なしなら null */
export function currentDailyDose(records: DoseRecord[], today: string): number | null {
  const sorted = sortDoseRecords(records).filter((r) => r.startDate <= today);
  if (sorted.length === 0) return null;
  return sorted[sorted.length - 1].doseMgPerDay;
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

export type GoalProjection =
  | { status: "reached" }
  | { status: "projected"; date: string; daysRemaining: number }
  | { status: "unknown" }; // 休薬中・記録不足で予測不能

/**
 * 現在の用量ペースが続いた場合の目標到達予測日。
 * 明日以降、毎日 currentDose mg を服用すると仮定する。
 */
export function projectGoalDate(
  records: DoseRecord[],
  weightKg: number | null,
  targetMgPerKg: number,
  today: string
): GoalProjection {
  if (weightKg == null || weightKg <= 0) return { status: "unknown" };
  const { totalMg } = calcDoseSummary(records, today);
  const remainingMg = targetMgPerKg * weightKg - totalMg;
  if (remainingMg <= 0) return { status: "reached" };
  const dose = currentDailyDose(records, today);
  if (dose == null || dose <= 0) return { status: "unknown" };
  const daysRemaining = Math.ceil(remainingMg / dose);
  const projected = new Date(toUtc(today) + daysRemaining * MS_PER_DAY);
  const y = projected.getUTCFullYear();
  const m = String(projected.getUTCMonth() + 1).padStart(2, "0");
  const d = String(projected.getUTCDate()).padStart(2, "0");
  return { status: "projected", date: `${y}-${m}-${d}`, daysRemaining };
}
