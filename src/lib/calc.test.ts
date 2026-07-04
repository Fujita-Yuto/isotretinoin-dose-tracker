import { describe, it, expect } from "vitest";
import {
  calcDoseSummary,
  calcCumulativeMgPerKg,
  calcQuickCumulative,
  currentDailyDose,
  daysBetween,
  latestWeight,
  projectGoalDate,
  type DoseRecord,
  type WeightRecord,
} from "./calc";

const dose = (startDate: string, doseMgPerDay: number, id = startDate): DoseRecord => ({
  id,
  startDate,
  doseMgPerDay,
});

describe("daysBetween", () => {
  it("同日は 0", () => {
    expect(daysBetween("2026-01-01", "2026-01-01")).toBe(0);
  });
  it("翌日は 1", () => {
    expect(daysBetween("2026-01-01", "2026-01-02")).toBe(1);
  });
  it("月をまたぐ", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
  });
});

describe("calcDoseSummary", () => {
  // 受け入れ条件: 体重60kg、40mg/日を90日間服用 → 総量3600mg、累積量60.0 mg/kg
  it("40mg/日を90日間 → 総量3600mg", () => {
    // 1/1 開始、90日目は 3/31（1月31日 + 2月28日 + 3月31日 = 90日）
    const records = [dose("2026-01-01", 40)];
    const summary = calcDoseSummary(records, "2026-03-31");
    expect(summary.totalDays).toBe(90);
    expect(summary.totalMg).toBe(3600);
    expect(calcCumulativeMgPerKg(summary.totalMg, 60)).toBeCloseTo(60.0);
  });

  // 受け入れ条件: 20mg/日を30日 → 40mg/日を60日、体重60kg → 総量3000mg、累積量50.0 mg/kg
  it("20mg/日を30日 → 40mg/日を60日 → 総量3000mg", () => {
    const records = [dose("2026-01-01", 20), dose("2026-01-31", 40)];
    // 1/1〜1/30 が 30日、1/31 開始で 60日目は 3/31
    const summary = calcDoseSummary(records, "2026-03-31");
    expect(summary.totalDays).toBe(90);
    expect(summary.totalMg).toBe(600 + 2400);
    expect(calcCumulativeMgPerKg(summary.totalMg, 60)).toBeCloseTo(50.0);
  });

  // 受け入れ条件: 休薬期間（0mg）は日数に含めるが総量には加算しない
  it("休薬期間（0mg）は日数に含めるが総量には加算しない", () => {
    const records = [
      dose("2026-01-01", 20), // 10日間 (1/1〜1/10)
      dose("2026-01-11", 0), // 休薬 5日間 (1/11〜1/15)
      dose("2026-01-16", 20), // 5日間 (1/16〜1/20)
    ];
    const summary = calcDoseSummary(records, "2026-01-20");
    expect(summary.totalDays).toBe(20);
    expect(summary.totalMg).toBe(10 * 20 + 0 + 5 * 20);
  });

  it("開始日当日は 1 日として数える", () => {
    const summary = calcDoseSummary([dose("2026-01-01", 30)], "2026-01-01");
    expect(summary.totalDays).toBe(1);
    expect(summary.totalMg).toBe(30);
  });

  it("記録なしなら 0", () => {
    const summary = calcDoseSummary([], "2026-01-01");
    expect(summary.totalMg).toBe(0);
    expect(summary.totalDays).toBe(0);
  });

  it("未来開始の記録は無視する", () => {
    const records = [dose("2026-01-01", 20), dose("2026-06-01", 40)];
    const summary = calcDoseSummary(records, "2026-01-10");
    expect(summary.totalMg).toBe(200);
    expect(summary.totalDays).toBe(10);
  });

  it("入力順に関係なく開始日順に計算する", () => {
    const a = calcDoseSummary([dose("2026-01-31", 40), dose("2026-01-01", 20)], "2026-03-31");
    const b = calcDoseSummary([dose("2026-01-01", 20), dose("2026-01-31", 40)], "2026-03-31");
    expect(a.totalMg).toBe(b.totalMg);
    expect(a.totalMg).toBe(3000);
  });
});

describe("latestWeight", () => {
  const w = (date: string, weightKg: number, id = date): WeightRecord => ({ id, date, weightKg });

  it("空なら null", () => {
    expect(latestWeight([])).toBeNull();
  });
  it("日付が最新のものを返す", () => {
    expect(latestWeight([w("2026-01-01", 60), w("2026-02-01", 58), w("2026-01-15", 59)])?.weightKg).toBe(58);
  });
  it("同日なら後に追加されたものを優先", () => {
    expect(latestWeight([w("2026-01-01", 60, "a"), w("2026-01-01", 61, "b")])?.weightKg).toBe(61);
  });
});

describe("currentDailyDose", () => {
  it("最後に開始された記録の用量を返す", () => {
    expect(currentDailyDose([dose("2026-01-01", 20), dose("2026-02-01", 40)], "2026-02-10")).toBe(40);
  });
  it("未来の記録は無視する", () => {
    expect(currentDailyDose([dose("2026-01-01", 20), dose("2026-06-01", 40)], "2026-02-10")).toBe(20);
  });
  it("記録なしなら null", () => {
    expect(currentDailyDose([], "2026-02-10")).toBeNull();
  });
});

describe("calcQuickCumulative", () => {
  it("40mg/日 × 90日 ÷ 60kg → 3600mg / 60.0 mg/kg", () => {
    const result = calcQuickCumulative(40, 90, 60);
    expect(result).not.toBeNull();
    expect(result!.totalMg).toBe(3600);
    expect(result!.mgPerKg).toBeCloseTo(60.0);
  });

  it("休薬（0mg/日）は 0", () => {
    expect(calcQuickCumulative(0, 30, 60)).toEqual({ totalMg: 0, mgPerKg: 0 });
  });

  it("体重が 0 以下なら null", () => {
    expect(calcQuickCumulative(40, 90, 0)).toBeNull();
    expect(calcQuickCumulative(40, 90, -5)).toBeNull();
  });

  it("負の値や非数値なら null", () => {
    expect(calcQuickCumulative(-10, 90, 60)).toBeNull();
    expect(calcQuickCumulative(40, -1, 60)).toBeNull();
    expect(calcQuickCumulative(NaN, 90, 60)).toBeNull();
  });
});

describe("projectGoalDate", () => {
  it("残量を現在用量で割った日数後を予測日とする", () => {
    // 60kg × 120mg/kg = 7200mg 目標。40mg/日を90日 → 3600mg 済み。残 3600mg ÷ 40 = 90日後
    const records = [dose("2026-01-01", 40)];
    const result = projectGoalDate(records, 60, 120, "2026-03-31");
    expect(result).toEqual({ status: "projected", date: "2026-06-29", daysRemaining: 90 });
  });

  it("目標到達済みなら reached", () => {
    const records = [dose("2026-01-01", 40)];
    // 60kg × 60mg/kg = 3600mg。90日で到達
    expect(projectGoalDate(records, 60, 60, "2026-03-31")).toEqual({ status: "reached" });
  });

  it("休薬中（0mg）は予測不能", () => {
    const records = [dose("2026-01-01", 40), dose("2026-02-01", 0)];
    expect(projectGoalDate(records, 60, 120, "2026-02-10").status).toBe("unknown");
  });

  it("体重未登録なら予測不能", () => {
    expect(projectGoalDate([dose("2026-01-01", 40)], null, 120, "2026-01-10").status).toBe("unknown");
  });

  it("端数は切り上げる", () => {
    // 50kg × 120 = 6000mg。30mg/日 10日 → 300mg。残 5700 ÷ 30 = 190日ちょうど
    // 残 5701 相当になるよう 49.5kg… 単純化: 残が割り切れないケース
    // 60kg × 120 = 7200mg。50mg/日 1日 → 50mg。残 7150 ÷ 50 = 143日ちょうど → 割り切れないケースを作る
    // 33mg/日 1日 → 33mg。残 7167 ÷ 33 = 217.18… → 218日
    const result = projectGoalDate([dose("2026-01-01", 33)], 60, 120, "2026-01-01");
    expect(result.status).toBe("projected");
    if (result.status === "projected") {
      expect(result.daysRemaining).toBe(218);
    }
  });
});
