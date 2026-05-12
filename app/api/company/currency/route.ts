import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    const currency: string | undefined =
      body?.currency?.trim()?.toUpperCase();

    if (!currency) {
      return NextResponse.json(
        { message: "Moeda em falta." },
        { status: 400 }
      );
    }

    await prisma.company.update({
      where: {
        id: session.companyId,
      },
      data: {
        currency,
      },
    });

    return NextResponse.json({
      message: "Moeda atualizada com sucesso.",
      currency,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Não autorizado ou erro ao atualizar moeda." },
      { status: 401 }
    );
  }
}
export async function GET() {
  try {
    const session = await requireAdmin();

    const company = await prisma.company.findUnique({
      where: {
        id: session.companyId,
      },
      select: {
        currency: true,
      },
    });

    return NextResponse.json({
      currency: company?.currency || "EUR",
    });
  } catch {
    return NextResponse.json(
      { message: "Não autorizado." },
      { status: 401 }
    );
  }
}