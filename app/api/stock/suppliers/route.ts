import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const { name, phone, email, address, taxId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { message: "Nome do fornecedor obrigatório." },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyId: session.companyId,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        taxId: taxId || null,
      },
    });

    return NextResponse.json({ supplier });
  } catch {
    return NextResponse.json(
      { message: "Erro ao criar fornecedor." },
      { status: 500 }
    );
  }
}