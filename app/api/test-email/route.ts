import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

export const runtime = "nodejs";
export async function GET() {
  try {
    const result = await sendEmail({
      to: "O_TEU_GMAIL@gmail.com",
      subject: "Teste Norbee ERP",
      html: `
        <h1>Email funcionando ✅</h1>
        <p>O sistema de emails do Norbee ERP está operacional.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      result,
      from: process.env.EMAIL_FROM,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        from: process.env.EMAIL_FROM,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}