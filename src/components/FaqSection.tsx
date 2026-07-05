export interface FaqItem {
  q: string;
  a: string;
}

// index.html の JSON-LD (FAQPage) と内容を一致させること
export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "累積投与量（積算量）とは何ですか？",
    a: "治療開始からのイソトレチノインの総服用量 (mg) を体重 (kg) で割った値です。単位は mg/kg で、治療終了の目安として広く使われています。",
  },
  {
    q: "目標の120〜150mg/kgには根拠がありますか？",
    a: "従来、累積120〜150mg/kgに達すると再発率が下がると報告されてきました。ただし近年はこの範囲の根拠の強さを疑問視する研究もあり、低用量でも十分という報告も出ています。目標値は必ず主治医と相談して決めてください。",
  },
  {
    q: "体重60kg・1日40mgの場合、120mg/kgまで何ヶ月かかりますか？",
    a: "必要な総量は 120 × 60 = 7,200mg。1日40mgなら 7,200 ÷ 40 = 180日、約6ヶ月です。本アプリでは服用記録から自動で到達予測日を計算できます。",
  },
  {
    q: "飲み忘れた場合はどうすればいいですか？",
    a: "自己判断で2回分をまとめて飲むことは避け、対応は医師・薬剤師に確認してください。本アプリではカレンダーで飲み忘れをタップして記録すると、その分が累積量の計算から自動的に除外されます。",
  },
  {
    q: "入力したデータはどこに保存されますか？",
    a: "お使いの端末のブラウザ内（localStorage）にのみ保存され、サーバーには一切送信されません。機種変更の際は設定画面のエクスポート機能でファイルとして持ち出せます。",
  },
  {
    q: "目標の累積量に到達したら治療をやめてもいいですか？",
    a: "本アプリで治療終了を判断することはできません。累積量はあくまで目安の一つであり、治療の終了・継続は必ず主治医とご相談ください。",
  },
];

export default function FaqSection() {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="font-bold text-base mb-3">よくある質問</h2>
      <div className="divide-y divide-slate-100">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="py-2 group">
            <summary className="text-sm font-medium cursor-pointer list-none flex justify-between items-center gap-2">
              <span>{item.q}</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">
                ▾
              </span>
            </summary>
            <p className="text-sm text-slate-600 leading-relaxed mt-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
