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

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
