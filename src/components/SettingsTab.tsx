import { useState } from "react";

interface Props {
  targetMgPerKg: number;
  onChangeTarget: (target: number) => void;
  onReset: () => void;
}

export default function SettingsTab({ targetMgPerKg, onChangeTarget, onReset }: Props) {
  const [targetInput, setTargetInput] = useState(String(targetMgPerKg));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
