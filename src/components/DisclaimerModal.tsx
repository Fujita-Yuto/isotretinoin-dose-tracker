interface Props {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
      >
        <h2 id="disclaimer-title" className="text-lg font-bold">
          ご利用前に必ずお読みください
        </h2>
        <div className="text-sm leading-relaxed space-y-3 text-slate-700">
          <p>
            本アプリは、イソトレチノインの累積投与量を計算するための
            <strong>計算補助ツール</strong>であり、医療アドバイスではありません。
          </p>
          <p>
            イソトレチノインは<strong>催奇形性</strong>
            など重大な注意事項がある薬剤です。服用量の変更・中止・再開を自己判断で行わず、
            <strong>必ず医師の指導のもとで服用してください</strong>。
          </p>
          <p>
            入力されたデータはお使いのブラウザ内にのみ保存され、サーバーには一切送信されません。
          </p>
        </div>
        <button
          onClick={onAccept}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl active:bg-blue-700"
        >
          理解して利用を開始する
        </button>
      </div>
    </div>
  );
}
