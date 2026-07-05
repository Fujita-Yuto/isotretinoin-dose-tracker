import { describe, it, expect } from "vitest";
import {
  calcCumulative,
  calcCumulativeMgPerKg,
  calcCumulativeStrict,
  calcDoseSummary,
  calcQuickCumulative,
  cumulativeSeries,
  currentDailyDose,
  daysBetween,
  latestWeight,
  projectGoalDate,
  weightOnDate,
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
    // 60kg × 120mg/kg = 7200mg 目標。累積 60mg/kg 済み。残 60mg/kg × 60kg = 3600mg ÷ 40 = 90日後
    const result = projectGoalDate(60, 40, 60, 120, "2026-03-31");
    expect(result).toEqual({ status: "projected", date: "2026-06-29", daysRemaining: 90 });
  });

  it("目標到達済みなら reached", () => {
    expect(projectGoalDate(60, 40, 60, 60, "2026-03-31")).toEqual({ status: "reached" });
  });

  it("休薬中（0mg）は予測不能", () => {
    expect(projectGoalDate(20, 0, 60, 120, "2026-02-10").status).toBe("unknown");
  });

  it("体重・累積量が不明なら予測不能", () => {
    expect(projectGoalDate(null, 40, 60, 120, "2026-01-10").status).toBe("unknown");
    expect(projectGoalDate(20, 40, null, 120, "2026-01-10").status).toBe("unknown");
  });

  it("端数は切り上げる", () => {
    // 60kg × 120 = 7200mg。累積 0.55mg/kg（33mg ÷ 60kg）。残 7167 ÷ 33 = 217.18… → 218日
    const result = projectGoalDate(33 / 60, 33, 60, 120, "2026-01-01");
    expect(result.status).toBe("projected");
    if (result.status === "projected") {
      expect(result.daysRemaining).toBe(218);
    }
  });
});

describe("飲み忘れ（missedDates）", () => {
  it("飲み忘れ日は総量から除くが治療日数には含める", () => {
    // 20mg/日を10日、うち2日飲み忘れ → 総量 160mg、日数 10日
    const summary = calcDoseSummary([dose("2026-01-01", 20)], "2026-01-10", [
      "2026-01-03",
      "2026-01-07",
    ]);
    expect(summary.totalMg).toBe(160);
    expect(summary.totalDays).toBe(10);
    expect(summary.missedDays).toBe(2);
  });

  it("休薬期間中・治療期間外・未来の飲み忘れは数えない", () => {
    const records = [dose("2026-01-01", 20), dose("2026-01-06", 0)];
    const summary = calcDoseSummary(records, "2026-01-10", [
      "2025-12-31", // 治療開始前
      "2026-01-08", // 休薬中
      "2026-06-01", // 未来
    ]);
    expect(summary.totalMg).toBe(100);
    expect(summary.missedDays).toBe(0);
  });

  it("同じ日付が重複していても1日として数える", () => {
    const summary = calcDoseSummary([dose("2026-01-01", 20)], "2026-01-10", [
      "2026-01-03",
      "2026-01-03",
    ]);
    expect(summary.totalMg).toBe(180);
    expect(summary.missedDays).toBe(1);
  });
});

describe("weightOnDate", () => {
  const w = (date: string, weightKg: number, id = date): WeightRecord => ({ id, date, weightKg });
  const weights = [w("2026-01-10", 60), w("2026-02-01", 58)];

  it("その日以前の最新の体重を返す", () => {
    expect(weightOnDate(weights, "2026-01-20")).toBe(60);
    expect(weightOnDate(weights, "2026-02-01")).toBe(58);
    expect(weightOnDate(weights, "2026-03-01")).toBe(58);
  });

  it("最初の記録より前の日付は最初の体重で代用する", () => {
    expect(weightOnDate(weights, "2026-01-01")).toBe(60);
  });

  it("記録なしなら null", () => {
    expect(weightOnDate([], "2026-01-01")).toBeNull();
  });
});

describe("calcCumulativeStrict（期間ごとの体重）", () => {
  const w = (date: string, weightKg: number, id = date): WeightRecord => ({ id, date, weightKg });

  it("体重変更をまたぐと期間ごとの体重で積み上げる", () => {
    // 20mg/日: 1/1〜1/10 は 50kg、1/11〜1/20 は 60kg
    const records = [dose("2026-01-01", 20)];
    const weights = [w("2026-01-01", 50), w("2026-01-11", 60)];
    const result = calcCumulativeStrict(records, weights, "2026-01-20");
    expect(result).toBeCloseTo((20 * 10) / 50 + (20 * 10) / 60);
  });

  it("体重が一定なら latest モードと一致する", () => {
    const records = [dose("2026-01-01", 40)];
    const weights = [w("2026-01-01", 60)];
    const strict = calcCumulativeStrict(records, weights, "2026-03-31");
    const latest = calcCumulative(records, weights, "latest", "2026-03-31");
    expect(strict).toBeCloseTo(60.0);
    expect(latest).toBeCloseTo(60.0);
  });

  it("飲み忘れ日は積み上げない", () => {
    const records = [dose("2026-01-01", 20)];
    const weights = [w("2026-01-01", 50)];
    const result = calcCumulativeStrict(records, weights, "2026-01-10", ["2026-01-05"]);
    expect(result).toBeCloseTo((20 * 9) / 50);
  });

  it("記録がなければ null", () => {
    expect(calcCumulativeStrict([], [w("2026-01-01", 50)], "2026-01-10")).toBeNull();
    expect(calcCumulativeStrict([dose("2026-01-01", 20)], [], "2026-01-10")).toBeNull();
  });
});

describe("cumulativeSeries", () => {
  const w = (date: string, weightKg: number, id = date): WeightRecord => ({ id, date, weightKg });

  it("開始日から today まで1日1点、単調増加の系列を返す", () => {
    const records = [dose("2026-01-01", 30)];
    const weights = [w("2026-01-01", 60)];
    const series = cumulativeSeries(records, weights, "latest", "2026-01-10");
    expect(series).toHaveLength(10);
    expect(series[0]).toEqual({ date: "2026-01-01", mgPerKg: 30 / 60 });
    expect(series[9].date).toBe("2026-01-10");
    expect(series[9].mgPerKg).toBeCloseTo(300 / 60);
    for (let i = 1; i < series.length; i++) {
      expect(series[i].mgPerKg).toBeGreaterThanOrEqual(series[i - 1].mgPerKg);
    }
  });

  it("休薬期間は横ばいになる", () => {
    const records = [dose("2026-01-01", 20), dose("2026-01-06", 0)];
    const weights = [w("2026-01-01", 50)];
    const series = cumulativeSeries(records, weights, "latest", "2026-01-10");
    expect(series[4].mgPerKg).toBeCloseTo(100 / 50);
    expect(series[9].mgPerKg).toBeCloseTo(100 / 50);
  });

  it("記録がなければ空配列", () => {
    expect(cumulativeSeries([], [w("2026-01-01", 50)], "latest", "2026-01-10")).toEqual([]);
    expect(cumulativeSeries([dose("2026-01-01", 20)], [], "latest", "2026-01-10")).toEqual([]);
  });
});
