import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { name, code } = await request.json();

    const category = await prisma.category.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!category) {
      return NextResponse.json({ message: "Categoria não encontrada." }, { status: 404 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name, code: code || null },
    });

    return NextResponse.json({ category: updated });
  } catch {
    return NextResponse.json({ message: "Erro ao editar categoria." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    await prisma.product.updateMany({
      where: { categoryId: id, companyId: session.companyId },
      data: { categoryId: null },
    });

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Categoria apagada." });
  } catch {
    return NextResponse.json({ message: "Erro ao apagar categoria." }, { status: 500 });
  }
}