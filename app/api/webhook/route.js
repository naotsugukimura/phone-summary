import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Supabase初期化
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // 1. Webhookからのデータを受け取る
    const body = await request.json();
    console.log("Webhook received:", body);

    // 2. 録音URLから音声ファイルをダウンロード
    const audioUrl = body.recording_url;
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    // 3. Geminiで要約
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/mpeg",
          data: base64Audio,
        },
      },
      {
        text: `この電話録音を分析し、以下のJSON形式で出力してください：
{
  "caller": "発信者名",
  "purpose": "用件",
  "action_required": ["対応が必要なこと1", "対応が必要なこと2"],
  "urgency": "高/中/低",
  "summary": "要約"
}
JSONのみを出力し、他の文字は含めないでください。`,
      },
    ]);

    const summaryText = result.response.text();
    const summary = JSON.parse(summaryText.replace(/```json|```/g, "").trim());

    // 4. Supabaseに保存
    const { data, error } = await supabase.from("call_records").insert([
      {
        caller: summary.caller,
        caller_number: body.caller || "不明",
        purpose: summary.purpose,
        action_required: JSON.stringify(summary.action_required),
        urgency: summary.urgency,
        summary: summary.summary,
      },
    ]).select();

    if (error) throw error;

    // 5. 結果を返す
    return NextResponse.json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}