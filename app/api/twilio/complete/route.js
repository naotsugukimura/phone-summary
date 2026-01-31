import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // TwilioはFormData形式でデータを送ってくる
    const formData = await request.formData();
    const recordingUrl = formData.get("RecordingUrl"); // 録音データのURL
    const caller = formData.get("From"); // 発信者番号

    console.log("Twilio Recording:", recordingUrl);

    if (!recordingUrl) {
      return NextResponse.json({ error: "No recording URL" }, { status: 400 });
    }

    // 1. 録音ファイルをダウンロード（mp3形式を指定、認証付き）
    const authHeader = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const audioResponse = await fetch(`${recordingUrl}.mp3`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });
    const audioBuffer = await audioResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    // 2. Geminiで要約
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
"caller": "発信者名（名乗っていない場合は'不明'）",
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

    // 3. Supabaseに保存
    const { data, error } = await supabase
      .from("call_records")
      .insert([
        {
          caller: summary.caller,
          caller_number: caller,
          purpose: summary.purpose,
          action_required: JSON.stringify(summary.action_required),
          urgency: summary.urgency,
          summary: summary.summary,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}