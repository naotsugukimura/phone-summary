import { NextResponse } from "next/server";

export async function POST(request) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="ja-JP">お電話ありがとうございます。発信音の後にご用件をお話しください。</Say>
    <Record maxLength="120" action="/api/twilio/complete" />
</Response>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "text/xml",
    },
  });
}