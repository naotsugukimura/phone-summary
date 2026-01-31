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

    // クリップボードにコピー（かべなしに貼り付け用）
    const text = `【発信者】${editingData.caller}
【電話番号】${editingData.caller_number}
【用件】${editingData.purpose}
【緊急度】${editingData.urgency}
【対応が必要なこと】
${editingData.action_required.filter(a => a).map((a) => `・${a}`).join("\n")}
【要約】
${editingData.summary}`;

    await navigator.clipboard.writeText(text);

    // DBも更新
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

      // 状態を更新
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
        return "bg-red-100 text-red-800 border-red-200";
      case "中":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "低":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">電話要約ダッシュボード</h1>
          <p className="text-sm text-gray-500">入電内容の要約一覧（下書き）</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">まだ通話記録がありません</p>
            <p className="text-sm text-gray-400 mt-2">
              /api/test にアクセスしてテストデータを作成できます
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
                  className={`bg-white rounded-lg shadow border overflow-hidden ${
                    record.saved_to_kabenashi
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  {/* ステータスバー */}
                  {record.saved_to_kabenashi && (
                    <div className="bg-green-100 px-4 py-1 text-xs text-green-700 font-medium">
                      かべなしに保存済み
                    </div>
                  )}
                  {savedId === record.id && (
                    <div className="bg-green-500 px-4 py-2 text-white text-sm font-medium text-center">
                      クリップボードにコピーしました！かべなしに貼り付けてください
                    </div>
                  )}

                  <div className="p-4">
                    {/* ヘッダー部分 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <select
                            value={editingData?.urgency || ""}
                            onChange={(e) => updateEditingField("urgency", e.target.value)}
                            className={`px-2 py-1 text-xs font-medium rounded border ${getUrgencyColor(
                              editingData?.urgency || ""
                            )}`}
                          >
                            <option value="高">高</option>
                            <option value="中">中</option>
                            <option value="低">低</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded border ${getUrgencyColor(
                              record.urgency
                            )}`}
                          >
                            {record.urgency}
                          </span>
                        )}
                        <div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingData?.caller || ""}
                              onChange={(e) => updateEditingField("caller", e.target.value)}
                              className="font-semibold text-gray-900 border-b border-blue-300 focus:outline-none focus:border-blue-500 bg-white px-2 py-1 rounded"
                            />
                          ) : (
                            <h2 className="font-semibold text-gray-900">{record.caller}</h2>
                          )}
                          <p className="text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.caller_number || ""}
                                onChange={(e) => updateEditingField("caller_number", e.target.value)}
                                className="border-b border-blue-300 focus:outline-none focus:border-blue-500 bg-white text-gray-900 px-2 py-1 rounded w-32"
                              />
                            ) : (
                              record.caller_number
                            )}
                            {" "}・ {formatDate(record.created_at)}
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={saveToKabenashi}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            かべなしに保存
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(record)}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                        >
                          編集
                        </button>
                      )}
                    </div>

                    {/* 用件 */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">用件</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingData?.purpose || ""}
                          onChange={(e) => updateEditingField("purpose", e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-900">{record.purpose}</p>
                      )}
                    </div>

                    {/* 要約 */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">要約</p>
                      {isEditing ? (
                        <textarea
                          value={editingData?.summary || ""}
                          onChange={(e) => updateEditingField("summary", e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                        />
                      ) : (
                        <p className="text-gray-600 text-sm">{record.summary}</p>
                      )}
                    </div>

                    {/* 対応が必要なこと */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700">対応が必要なこと</p>
                      {isEditing ? (
                        <div className="mt-1 space-y-2">
                          {(editingData?.action_required || []).map((action, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="text-blue-500">•</span>
                              <input
                                type="text"
                                value={action}
                                onChange={(e) => updateActionItem(index, e.target.value)}
                                className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                              />
                              <button
                                onClick={() => removeActionItem(index)}
                                className="text-red-500 hover:text-red-700 px-2"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addActionItem}
                            className="text-sm text-blue-500 hover:text-blue-700"
                          >
                            + 項目を追加
                          </button>
                        </div>
                      ) : (
                        actions.length > 0 && (
                          <ul className="mt-1 space-y-1">
                            {actions.map((action: string, index: number) => (
                              <li
                                key={index}
                                className="text-sm text-gray-600 flex items-start gap-2"
                              >
                                <span className="text-blue-500">•</span>
                                {action}
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
    </div>
  );
}
