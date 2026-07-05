import { useRef, useState } from "react";
import { todayStr, type CalcMode } from "../lib/calc";
import { exportDataJson, parseImportedJson, type AppData } from "../lib/storage";

interface Props {
  data: AppData;
  onChangeTarget: (target: number) => void;
  onChangeCalcMode: (mode: CalcMode) => void;
  onImport: (data: AppData) => void;
  onReset: () => void;
}

const CALC_MODES: { value: CalcMode; label: string; description: string }[] = [
  {
    value: "latest",
    label: "シンプル（最新の体重で計算）",
    description: "服用総量を最新の体重で割ります。体重変動が小さい場合はこちらで十分です。",
  },
  {
    value: "period",
    label: "厳密（期間ごとの体重で計算）",
    description:
      "1日ごとに「その日の1日量 ÷ その時点の体重」を積み上げます。治療中に体重が大きく変わった場合により正確です。",
  },
];

export default function SettingsTab({
  data,
  onChangeTarget,
  onChangeCalcMode,
  onImport,
  onReset,
}: Props) {
  const [targetInput, setTargetInput] = useState(String(data.settings.targetMgPerKg));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "ok" | "error"; text: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTarget = () => {
    const value = Number(targetInput);
    if (targetInput.trim() === "" || !Number.isFinite(value) || value <= 0 || value > 1000) {
      setError("目標値は 0 より大きい数値で入力してください");
      setSaved(false);
      return;
    }
    onChangeTarget(value);
    setError("");
    setSaved(true);
  };

  const handleExport = () => {
    const blob = new Blob([exportDataJson(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isotretinoin-data-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = parseImportedJson(text);
    if (!result.ok) {
      setImportMessage({ type: "error", text: result.error });
      return;
    }
    const ok = window.confirm(
      `現在の記録を、読み込んだ内容（服用記録 ${result.data.doses.length} 件・体重 ${result.data.weights.length} 件）で置き換えます。よろしいですか？`
    );
    if (!ok) {
      setImportMessage(null);
      return;
    }
    onImport(result.data);
    setTargetInput(String(result.data.settings.targetMgPerKg));
    setImportMessage({ type: "ok", text: "データを読み込みました" });
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "すべての記録（服用記録・体重・設定）を削除します。この操作は取り消せません。本当によろしいですか？"
      )
    ) {
      return;
    }
    onReset();
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-bold text-lg">目標累積量</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          治療終了の目安とされる目標累積量です。一般に 120〜150 mg/kg
          が用いられますが、必ず主治医の方針に従って設定してください。
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <label htmlFor="target" className="block text-sm font-medium mb-1">
              目標値 (mg/kg)
            </label>
            <input
              id="target"
              type="number"
              inputMode="decimal"
              min={1}
              step={5}
              value={targetInput}
              onChange={(e) => {
                setTargetInput(e.target.value);
                setSaved(false);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">保存しました</p>}
          <button
            onClick={saveTarget}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl active:bg-blue-700"
          >
            保存する
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-lg">計算モード</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2" role="radiogroup" aria-label="計算モード">
          {CALC_MODES.map((mode) => {
            const selected = data.settings.calcMode === mode.value;
            return (
              <button
                key={mode.value}
                role="radio"
                aria-checked={selected}
                onClick={() => onChangeCalcMode(mode.value)}
                className={`w-full text-left rounded-xl border p-3 ${
                  selected
                    ? "border-blue-500 ring-1 ring-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <p className={`text-sm font-bold ${selected ? "text-blue-700" : "text-slate-700"}`}>
                  {selected ? "● " : "○ "}
                  {mode.label}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mode.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-lg">バックアップ</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          記録をファイル（JSON）として保存できます。機種変更やブラウザのデータ消去に備えて、定期的にエクスポートしておくと安心です。新しい端末ではこのファイルをインポートすると記録を引き継げます。
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl active:bg-blue-700"
          >
            エクスポート（ファイルに保存）
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-blue-300 text-blue-700 font-bold py-3 rounded-xl active:bg-blue-50"
          >
            インポート（ファイルから復元）
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
          {importMessage && (
            <p
              className={`text-sm ${
                importMessage.type === "ok" ? "text-green-600" : "text-red-600"
              }`}
            >
              {importMessage.text}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold text-lg">データ管理</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          データはこのブラウザ内（localStorage）にのみ保存されており、サーバーには一切送信されません。ブラウザのデータを消去すると記録も失われます。
        </p>
        <button
          onClick={handleReset}
          className="w-full border border-red-300 text-red-600 font-bold py-3 rounded-xl active:bg-red-50"
        >
          すべてのデータをリセット
        </button>
      </section>
    </div>
  );
}
