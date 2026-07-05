import { describe, it, expect } from "vitest";
import { exportDataJson, parseImportedJson, DEFAULT_DATA, type AppData } from "./storage";

const sampleData: AppData = {
  doses: [{ id: "d1", startDate: "2026-01-01", doseMgPerDay: 20 }],
  weights: [{ id: "w1", date: "2026-01-01", weightKg: 60.5 }],
  settings: { targetMgPerKg: 130 },
  disclaimerAccepted: true,
};

describe("exportDataJson / parseImportedJson", () => {
  it("エクスポート → インポートで元のデータに戻る（ラウンドトリップ）", () => {
    const json = exportDataJson(sampleData);
    const result = parseImportedJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.doses).toEqual(sampleData.doses);
      expect(result.data.weights).toEqual(sampleData.weights);
      expect(result.data.settings).toEqual(sampleData.settings);
      expect(result.data.disclaimerAccepted).toBe(true);
    }
  });

  it("壊れたJSONはエラー", () => {
    const result = parseImportedJson("{ これはJSONではない");
    expect(result.ok).toBe(false);
  });

  it("別アプリのJSONはエラー", () => {
    const result = parseImportedJson(JSON.stringify({ app: "other-app", doses: [] }));
    expect(result.ok).toBe(false);
  });

  it("不正なレコードは取り込まずスキップする", () => {
    const json = JSON.stringify({
      app: "isotretinoin-tracker",
      version: 1,
      doses: [
        { id: "ok", startDate: "2026-01-01", doseMgPerDay: 20 },
        { id: "bad-date", startDate: "1月1日", doseMgPerDay: 20 },
        { id: "bad-dose", startDate: "2026-01-02", doseMgPerDay: -5 },
        "not-an-object",
      ],
      weights: [
        { id: "ok", date: "2026-01-01", weightKg: 60 },
        { id: "bad-weight", date: "2026-01-02", weightKg: 0 },
      ],
      settings: { targetMgPerKg: 140 },
    });
    const result = parseImportedJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.doses).toHaveLength(1);
      expect(result.data.doses[0].id).toBe("ok");
      expect(result.data.weights).toHaveLength(1);
      expect(result.data.settings.targetMgPerKg).toBe(140);
    }
  });

  it("id が無いレコードには新しい id を割り当てる", () => {
    const json = JSON.stringify({
      app: "isotretinoin-tracker",
      doses: [{ startDate: "2026-01-01", doseMgPerDay: 20 }],
      weights: [],
    });
    const result = parseImportedJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.doses[0].id).toBeTruthy();
    }
  });

  it("settings が欠けていればデフォルト目標値を使う", () => {
    const json = JSON.stringify({ app: "isotretinoin-tracker", doses: [], weights: [] });
    const result = parseImportedJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.settings.targetMgPerKg).toBe(DEFAULT_DATA.settings.targetMgPerKg);
    }
  });
});
