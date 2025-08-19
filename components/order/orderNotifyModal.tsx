"use client";

export default function OrderNotifyModal({ onAllow, onClose, loading }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4">배송 알림을 받으시겠어요?</h2>
        <p className="text-sm text-gray-600 mb-4">
          알림을 허용하면 배송 진행 상황을 알려드려요. 브라우저에서 알림을
          거부했다면 설정에서 다시 허용할 수 있어요.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className={`flex items-center justify-center px-4 py-2 text-sm text-white rounded ${
              loading ? "bg-sky-300 cursor-not-allowed" : "bg-sky-400 hover:bg-sky-500"
            }`}
          >
            나중에
          </button>
          <button
            onClick={onAllow}
            className="px-4 py-2 text-sm bg-sky-400 hover:bg-sky-500 text-white rounded"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "허용"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
