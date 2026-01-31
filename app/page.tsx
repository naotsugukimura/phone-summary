"use client";

import { useEffect, useState } from "react";

type CallRecord = {
  id: number;
  caller: string;
  caller_number: string;
  purpose: string;
  action_required: string;
  urgency: string;
  summary: string;
  created_at: string;
  saved_to_kabenashi?: boolean;
};

type EditingRecord = {
  id: number;
  caller: string;
  caller_number: string;
  purpose: string;
  action_required: string[];
  urgency: string;
  summary: string;
};

export default function Home() {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<EditingRecord | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/records");
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (record: CallRecord) => {
    setEditingId(record.id);
    setEditingData({
      id: record.id,
      caller: record.caller,
      caller_number: record.caller_number,
      purpose: record.purpose,
      action_required: JSON.parse(record.action_required || "[]"),
      urgency: record.urgency,
      summary: record.summary,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const updateEditingField = (field: keyof EditingRecord, value: string | string[]) => {
    if (!editingData) return;
    setEditingData({ ...editingData, [field]: value });
  };

  const updateActionItem = (index: number, value: string) => {
    if (!editingData) return;
    const newActions = [...editingData.action_required];
    newActions[index] = value;
    setEditingData({ ...editingData, action_required: newActions });
  };

  const addActionItem = () => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      action_required: [...editingData.action_required, ""],
    });
  };

  const removeActionItem = (index: number) => {
    if (!editingData) return;
    const newActions = editingData.action_required.filter((_, i) => i !== index);
    setEditingData({ ...editingData, action_required: newActions });
  };

  const saveToKabenashi = async () => {
    if (!editingData) return;

    const text = `【発信者】${editingData.caller}
【電話番号】${editingData.caller_number}
【用件】${editingData.purpose}
【緊急度】${editingData.urgency}
【対応が必要なこと】
${editingData.action_required.filter(a => a).map((a) => `・${a}`).join("\n")}
【要約】
${editingData.summary}`;

    await navigator.clipboard.writeText(text);

    try {
      await fetch("/api/records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingData.id,
          caller: editingData.caller,
          caller_number: editingData.caller_number,
          purpose: editingData.purpose,
          action_required: JSON.stringify(editingData.action_required.filter(a => a)),
          urgency: editingData.urgency,
          summary: editingData.summary,
          saved_to_kabenashi: true,
        }),
      });

      setRecords(records.map(r =>
        r.id === editingData.id
          ? {
              ...r,
              ...editingData,
              action_required: JSON.stringify(editingData.action_required.filter(a => a)),
              saved_to_kabenashi: true
            }
          : r
      ));

      setSavedId(editingData.id);
      setTimeout(() => setSavedId(null), 3000);
      setEditingId(null);
      setEditingData(null);
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "高":
        return "bg-red-100 text-red-700 border-red-300";
      case "中":
        return "bg-amber-100 text-amber-700 border-amber-300";
      case "低":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">📞</span>
            電話要約ダッシュボード
          </h1>
          <p className="text-orange-100 text-sm mt-1">入電内容の要約一覧</p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-orange-100">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-600 font-medium">まだ通話記録がありません</p>
            <p className="text-sm text-gray-400 mt-2">
              電話がかかってくると、ここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const isEditing = editingId === record.id;
              const actions = isEditing
                ? editingData?.action_required || []
                : JSON.parse(record.action_required || "[]");

              return (
                <div
                  key={record.id}
                  className={`bg-white rounded-2xl shadow-md border-2 overflow-hidden transition-all ${
                    record.saved_to_kabenashi
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-orange-100 hover:border-orange-200"
                  }`}
                >
                  {/* ステータスバー */}
                  {record.saved_to_kabenashi && (
                    <div className="bg-emerald-500 px-4 py-2 text-sm text-white font-medium flex items-center gap-2">
                      <span>✓</span> かべなしに保存済み
                    </div>
                  )}
                  {savedId === record.id && (
                    <div className="bg-emerald-500 px-4 py-3 text-white text-sm font-medium text-center animate-pulse">
                      ✓ クリップボードにコピーしました！かべなしに貼り付けてください
                    </div>
                  )}

                  <div className="p-4">
                    {/* ヘッダー部分 - スマホ対応 */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                      <div className="flex items-start gap-3">
                        {isEditing ? (
                          <select
                            value={editingData?.urgency || ""}
                            onChange={(e) => updateEditingField("urgency", e.target.value)}
                            className={`px-3 py-1.5 text-sm font-bold rounded-full border-2 ${getUrgencyColor(
                              editingData?.urgency || ""
                            )}`}
                          >
                            <option value="高">高</option>
                            <option value="中">中</option>
                            <option value="低">低</option>
                          </select>
                        ) : (
                          <span
                            className={`px-3 py-1.5 text-sm font-bold rounded-full border-2 ${getUrgencyColor(
                              record.urgency
                            )}`}
                          >
                            {record.urgency}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingData?.caller || ""}
                              onChange={(e) => updateEditingField("caller", e.target.value)}
                              className="font-bold text-gray-800 border-2 border-orange-300 focus:border-orange-500 focus:outline-none bg-white px-3 py-1.5 rounded-lg w-full"
                            />
                          ) : (
                            <h2 className="font-bold text-gray-800 text-lg truncate">{record.caller}</h2>
                          )}
                          <div className="text-sm text-gray-500 mt-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.caller_number || ""}
                                onChange={(e) => updateEditingField("caller_number", e.target.value)}
                                className="border-2 border-orange-300 focus:border-orange-500 focus:outline-none bg-white text-gray-700 px-3 py-1 rounded-lg w-full"
                              />
                            ) : (
                              <span>{record.caller_number} ・ {formatDate(record.created_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ボタン - スマホでは横幅いっぱい */}
                      <div className="flex gap-2 sm:flex-shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              onClick={cancelEditing}
                              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              キャンセル
                            </button>
                            <button
                              onClick={saveToKabenashi}
                              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
                            >
                              かべなしに保存
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(record)}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
                          >
                            編集
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 用件 */}
                    <div className="mt-4">
                      <p className="text-sm font-bold text-orange-600 mb-1">📋 用件</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingData?.purpose || ""}
                          onChange={(e) => updateEditingField("purpose", e.target.value)}
                          className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none bg-white text-gray-800"
                        />
                      ) : (
                        <p className="text-gray-800 bg-orange-50 rounded-xl px-4 py-3">{record.purpose}</p>
                      )}
                    </div>

                    {/* 要約 */}
                    <div className="mt-4">
                      <p className="text-sm font-bold text-orange-600 mb-1">📝 要約</p>
                      {isEditing ? (
                        <textarea
                          value={editingData?.summary || ""}
                          onChange={(e) => updateEditingField("summary", e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:outline-none bg-white text-gray-800 resize-none"
                        />
                      ) : (
                        <p className="text-gray-700 bg-orange-50 rounded-xl px-4 py-3 text-sm leading-relaxed">{record.summary}</p>
                      )}
                    </div>

                    {/* 対応が必要なこと */}
                    <div className="mt-4">
                      <p className="text-sm font-bold text-orange-600 mb-1">✅ 対応が必要なこと</p>
                      {isEditing ? (
                        <div className="space-y-2 bg-orange-50 rounded-xl p-4">
                          {(editingData?.action_required || []).map((action, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-orange-500 font-bold">•</span>
                              <input
                                type="text"
                                value={action}
                                onChange={(e) => updateActionItem(index, e.target.value)}
                                className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none bg-white text-gray-800"
                              />
                              <button
                                onClick={() => removeActionItem(index)}
                                className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-100 rounded-lg transition-colors font-bold"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addActionItem}
                            className="text-sm text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 mt-2"
                          >
                            <span className="text-lg">+</span> 項目を追加
                          </button>
                        </div>
                      ) : (
                        actions.length > 0 && (
                          <ul className="bg-orange-50 rounded-xl px-4 py-3 space-y-2">
                            {actions.map((action: string, index: number) => (
                              <li
                                key={index}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <span className="text-orange-500 font-bold mt-0.5">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="bg-orange-100 mt-8 py-4 text-center text-sm text-orange-600">
        <p>電話要約ダッシュボード</p>
      </footer>
    </div>
  );
}
