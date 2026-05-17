import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

type ChatBody = {
  question?: string;
  lang?: string;
  days?: number;
};

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as ChatBody;

    if (!body.question || body.question.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "Question obligatoire." },
        { status: 400 }
      );
    }

    const aiUrl = process.env.NORBEE_AI_URL;
    const apiKey = process.env.NORBEE_AI_API_KEY;

    if (!aiUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: "Norbee AI n’est pas configurée." },
        { status: 500 }
      );
    }

    const response = await fetch(`${aiUrl}/api/ai/chat`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        company_id: session.companyId,
        question: body.question,
        lang: body.lang || "pt",
        days: body.days || 30,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Erreur Norbee AI.",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("ERRO ERP AI CHAT:", error);

    return NextResponse.json(
      { success: false, message: "Erreur de communication avec Norbee AI." },
      { status: 500 }
    );
  }
}