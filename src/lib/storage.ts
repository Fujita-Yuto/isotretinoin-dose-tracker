import type { DoseRecord, WeightRecord } from "./calc";

export interface AppSettings {
  targetMgPerKg: number;
}

export interface AppData {
  doses: DoseRecord[];
  weights: WeightRecord[];
  settings: AppSettings;
  disclaimerAccepted: boolean;
}

export const DEFAULT_DATA: AppData = {
  doses: [],
  weights: [],
  settings: { targetMgPerKg: 120 },
  disclaimerAccepted: false,
};

const STORAGE_KEY = "isotretinoin-tracker-v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      doses: Array.isArray(parsed.doses) ? parsed.doses : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      settings: {
        targetMgPerKg:
          typeof parsed.settings?.targetMgPerKg === "number" && parsed.settings.targetMgPerKg > 0
            ? parsed.settings.targetMgPerKg
            : DEFAULT_DATA.settings.targetMgPerKg,
      },
      disclaimerAccepted: parsed.disclaimerAccepted === true,
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ストレージが使えない環境（プライベートブラウズ等）では保存をあきらめる
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}

// ---- エクスポート / インポート（機種変更・バックアップ用） ----

const EXPORT_APP_ID = "isotretinoin-tracker";
const EXPORT_VERSION = 1;

export function exportDataJson(data: AppData): string {
  return JSON.stringify(
    {
      app: EXPORT_APP_ID,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      doses: data.doses,
      weights: data.weights,
      settings: data.settings,
    },
    null,
    2
  );
}

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** エクスポートしたJSON文字列を検証しつつ AppData に戻す */
export function parseImportedJson(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "ファイルをJSONとして読み込めませんでした" };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "ファイルの形式が正しくありません" };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== EXPORT_APP_ID) {
    return { ok: false, error: "このアプリのバックアップファイルではないようです" };
  }

  const doses: DoseRecord[] = [];
  if (Array.isArray(obj.doses)) {
    for (const d of obj.doses as unknown[]) {
      if (typeof d !== "object" || d === null) continue;
      const rec = d as Record<string, unknown>;
      if (
        typeof rec.startDate === "string" &&
        DATE_RE.test(rec.startDate) &&
        typeof rec.doseMgPerDay === "number" &&
        Number.isFinite(rec.doseMgPerDay) &&
        rec.doseMgPerDay >= 0
      ) {
        doses.push({
          id: typeof rec.id === "string" && rec.id !== "" ? rec.id : newId(),
          startDate: rec.startDate,
          doseMgPerDay: rec.doseMgPerDay,
        });
      }
    }
  }

  const weights: WeightRecord[] = [];
  if (Array.isArray(obj.weights)) {
    for (const w of obj.weights as unknown[]) {
      if (typeof w !== "object" || w === null) continue;
      const rec = w as Record<string, unknown>;
      if (
        typeof rec.date === "string" &&
        DATE_RE.test(rec.date) &&
        typeof rec.weightKg === "number" &&
        Number.isFinite(rec.weightKg) &&
        rec.weightKg > 0
      ) {
        weights.push({
          id: typeof rec.id === "string" && rec.id !== "" ? rec.id : newId(),
          date: rec.date,
          weightKg: rec.weightKg,
        });
      }
    }
  }

  const settings = obj.settings as Record<string, unknown> | undefined;
  const targetMgPerKg =
    settings != null &&
    typeof settings.targetMgPerKg === "number" &&
    Number.isFinite(settings.targetMgPerKg) &&
    settings.targetMgPerKg > 0
      ? settings.targetMgPerKg
      : DEFAULT_DATA.settings.targetMgPerKg;

  return {
    ok: true,
    data: { doses, weights, settings: { targetMgPerKg }, disclaimerAccepted: true },
  };
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
