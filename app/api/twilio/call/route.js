import { NextResponse } from "next/server";

export async function POST(request) {
  // 転送先の電話番号（日本の番号は+81形式で）
  const forwardTo = "+818067815457";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="ja-JP">お電話ありがとうございます。担当者におつなぎします。</Say>
    <Dial record="record-from-answer-dual" recordingStatusCallback="https://phone-summary.vercel.app/api/twilio/complete" recordingStatusCallbackMethod="POST">
        <Number>${forwardTo}</Number>
    </Dial>
    <Say language="ja-JP">お電話ありがとうございました。</Say>
</Response>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}