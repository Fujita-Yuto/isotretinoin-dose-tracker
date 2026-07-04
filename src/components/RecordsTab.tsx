import { useState } from "react";
import { sortDoseRecords, type DoseRecord, type WeightRecord } from "../lib/calc";
import { newId } from "../lib/storage";

interface Props {
  doses: DoseRecord[];
  weights: WeightRecord[];
  today: string;
  onChangeDoses: (doses: DoseRecord[]) => void;
  onChangeWeights: (weights: WeightRecord[]) => void;
}

const inputClass =
  "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-400";

export default function RecordsTab({
  doses,
  weights,
  today,
  onChangeDoses,
  onChangeWeights,
}: Props) {
  // --- 服用記録フォーム ---
  const [doseDate, setDoseDate] = useState(today);
  const [doseMg, setDoseMg] = useState("");
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [doseError, setDoseError] = useState("");

  // --- 体重フォーム ---
  const [weightDate, setWeightDate] = useState(today);
  const [weightKg, setWeightKg] = useState("");
  const [weightError, setWeightError] = useState("");

  const sortedDoses = sortDoseRecords(doses).reverse(); // 新しい順に表示
  const sortedWeights = [...weights].sort((a, b) => b.date.localeCompare(a.date));

  const resetDoseForm = () => {
    setDoseDate(today);
    setDoseMg("");
    setEditingDoseId(null);
    setDoseError("");
  };

  const submitDose = () => {
    const mg = Number(doseMg);
    if (!doseDate) {
      setDoseError("開始日を入力してください");
      return;
    }
    if (doseDate > today) {
      setDoseError("未来の日付は入力できません");
      return;
    }
    if (doseMg.trim() === "" || !Number.isFinite(mg) || mg < 0) {
      setDoseError("1日量は 0 以上の数値で入力してください（休薬は 0）");
      return;
    }
    const duplicate = doses.some((d) => d.startDate === doseDate && d.id !== editingDoseId);
    if (duplicate) {
      setDoseError("同じ開始日の記録がすでにあります。既存の記録を編集してください");
      return;
    }
    if (editingDoseId) {
      onChangeDoses(
        doses.map((d) =>
          d.id === editingDoseId ? { ...d, startDate: doseDate, doseMgPerDay: mg } : d
        )
      );
    } else {
      onChangeDoses([...doses, { id: newId(), startDate: doseDate, doseMgPerDay: mg }]);
    }
    resetDoseForm();
  };

  const startEditDose = (d: DoseRecord) => {
    setEditingDoseId(d.id);
    setDoseDate(d.startDate);
    setDoseMg(String(d.doseMgPerDay));
    setDoseError("");
  };

  const deleteDose = (id: string) => {
    if (!window.confirm("この服用記録を削除しますか？")) return;
    onChangeDoses(doses.filter((d) => d.id !== id));
    if (editingDoseId === id) resetDoseForm();
  };

  const submitWeight = () => {
    const kg = Number(weightKg);
    if (!weightDate) {
      setWeightError("日付を入力してください");
      return;
    }
    if (weightDate > today) {
      setWeightError("未来の日付は入力できません");
      return;
    }
    if (weightKg.trim() === "" || !Number.isFinite(kg) || kg <= 0 || kg > 300) {
      setWeightError("体重は 0 より大きい数値で入力してください");
      return;
    }
    onChangeWeights([...weights, { id: newId(), date: weightDate, weightKg: kg }]);
    setWeightDate(today);
    setWeightKg("");
    setWeightError("");
  };

  const deleteWeight = (id: string) => {
    if (!window.confirm("この体重記録を削除しますか？")) return;
    onChangeWeights(weights.filter((w) => w.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* 服用記録 */}
      <section className="space-y-3">
        <h2 className="font-bold text-lg">服用記録（用量の履歴）</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          用量を開始・変更した日と1日量を記録します。次の記録の前日まで（最後の記録は今日まで）その用量で服用したものとして計算します。休薬する場合は
          1日量 0mg で記録してください。
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <label htmlFor="dose-date" className="block text-sm font-medium mb-1">
              開始日
            </label>
            <input
              id="dose-date"
              type="date"
              max={today}
              value={doseDate}
              onChange={(e) => setDoseDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dose-mg" className="block text-sm font-medium mb-1">
              1日量 (mg)
            </label>
            <input
              id="dose-mg"
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              placeholder="例: 20（休薬は 0）"
              value={doseMg}
              onChange={(e) => setDoseMg(e.target.value)}
              className={inputClass}
            />
          </div>
          {doseError && <p className="text-sm text-red-600">{doseError}</p>}
          <div className="flex gap-2">
            <button
              onClick={submitDose}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:bg-blue-700"
            >
              {editingDoseId ? "更新する" : "追加する"}
            </button>
            {editingDoseId && (
              <button
                onClick={resetDoseForm}
                className="px-4 py-3 rounded-xl border border-slate-300 text-slate-600"
              >
                キャンセル
              </button>
            )}
          </div>
        </div>

        {sortedDoses.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">まだ服用記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {sortedDoses.map((d) => (
              <li
                key={d.id}
                className={`bg-white rounded-xl border p-3 flex items-center justify-between gap-2 ${
                  editingDoseId === d.id ? "border-blue-400 ring-1 ring-blue-300" : "border-slate-200"
                }`}
              >
                <div>
                  <p className="text-sm text-slate-500">{d.startDate} から</p>
                  <p className="font-bold">
                    {d.doseMgPerDay === 0 ? (
                      <span className="text-amber-600">休薬（0 mg/日）</span>
                    ) : (
                      `${d.doseMgPerDay} mg/日`
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => startEditDose(d)}
                    className="text-sm px-3 py-2 rounded-lg border border-slate-300 text-slate-600"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deleteDose(d.id)}
                    className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 体重記録 */}
      <section className="space-y-3">
        <h2 className="font-bold text-lg">体重の記録</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          累積投与量の計算には最新の日付の体重を使用します。
        </p>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <label htmlFor="weight-date" className="block text-sm font-medium mb-1">
              日付
            </label>
            <input
              id="weight-date"
              type="date"
              max={today}
              value={weightDate}
              onChange={(e) => setWeightDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="weight-kg" className="block text-sm font-medium mb-1">
              体重 (kg)
            </label>
            <input
              id="weight-kg"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              placeholder="例: 60.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={inputClass}
            />
          </div>
          {weightError && <p className="text-sm text-red-600">{weightError}</p>}
          <button
            onClick={submitWeight}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl active:bg-blue-700"
          >
            追加する
          </button>
        </div>

        {sortedWeights.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">まだ体重記録がありません</p>
        ) : (
          <ul className="space-y-2">
            {sortedWeights.map((w) => (
              <li
                key={w.id}
                className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm text-slate-500">{w.date}</p>
                  <p className="font-bold">{w.weightKg} kg</p>
                </div>
                <button
                  onClick={() => deleteWeight(w.id)}
                  className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 shrink-0"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
