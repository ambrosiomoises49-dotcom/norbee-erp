import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { name, code } = await request.json();

    if (!name) {
      return NextResponse.json(
        { message: "Nome da categoria obrigatório." },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        companyId: session.companyId,
        name,
        code: code || null,
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json(
      { message: "Erro ao criar categoria." },
      { status: 500 }
    );
  }
}