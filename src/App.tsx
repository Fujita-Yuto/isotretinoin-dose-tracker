import { useEffect, useState } from "react";
import { todayStr } from "./lib/calc";
import { loadData, saveData, clearData, DEFAULT_DATA, type AppData } from "./lib/storage";
import DisclaimerModal from "./components/DisclaimerModal";
import HomeTab from "./components/HomeTab";
import RecordsTab from "./components/RecordsTab";
import SettingsTab from "./components/SettingsTab";

type Tab = "home" | "records" | "settings";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "ホーム", icon: "🏠" },
  { key: "records", label: "記録", icon: "📝" },
  { key: "settings", label: "設定", icon: "⚙️" },
];

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [tab, setTab] = useState<Tab>("home");
  const today = todayStr();

  useEffect(() => {
    saveData(data);
  }, [data]);

  const handleReset = () => {
    clearData();
    setData({ ...DEFAULT_DATA, disclaimerAccepted: true });
    setTab("home");
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 flex flex-col">
      {!data.disclaimerAccepted && (
        <DisclaimerModal onAccept={() => setData((d) => ({ ...d, disclaimerAccepted: true }))} />
      )}

      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-base font-bold text-center">イソトレチノイン累積投与量計算</h1>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-5 pb-28">
        {tab === "home" && (
          <HomeTab
            doses={data.doses}
            weights={data.weights}
            targetMgPerKg={data.settings.targetMgPerKg}
            today={today}
            onGoToRecords={() => setTab("records")}
          />
        )}
        {tab === "records" && (
          <RecordsTab
            doses={data.doses}
            weights={data.weights}
            today={today}
            onChangeDoses={(doses) => setData((d) => ({ ...d, doses }))}
            onChangeWeights={(weights) => setData((d) => ({ ...d, weights }))}
          />
        )}
        {tab === "settings" && (
          <SettingsTab
            targetMgPerKg={data.settings.targetMgPerKg}
            onChangeTarget={(targetMgPerKg) =>
              setData((d) => ({ ...d, settings: { ...d.settings, targetMgPerKg } }))
            }
            onReset={handleReset}
          />
        )}

        <footer className="mt-10 text-xs text-slate-500 leading-relaxed space-y-2">
          <p>
            ⚠️
            本アプリは計算補助ツールであり、医療アドバイスではありません。服用量の変更・中止は自己判断で行わず、必ず医師の指導のもとで行ってください。イソトレチノインには催奇形性など重大な注意事項があります。
          </p>
          <p>
            🔒
            入力されたデータはお使いのブラウザ内（localStorage）にのみ保存され、サーバーには一切送信されません。
          </p>
        </footer>
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-10">
        <div className="max-w-xl mx-auto grid grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 text-sm flex flex-col items-center gap-0.5 ${
                tab === t.key ? "text-blue-600 font-bold" : "text-slate-500"
              }`}
              aria-current={tab === t.key ? "page" : undefined}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
