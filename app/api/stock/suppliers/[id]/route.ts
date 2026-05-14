import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type SupplierBody = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as SupplierBody;

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: session.companyId },
    });

    if (!supplier) {
      return NextResponse.json(
        { message: "Fornecedor não encontrado." },
        { status: 404 }
      );
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        taxId: body.taxId || null,
      },
    });

    return NextResponse.json({ supplier: updated });
  } catch {
    return NextResponse.json(
      { message: "Erro ao editar fornecedor." },
      { status: 500 }
    );
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
      where: { supplierId: id, companyId: session.companyId },
      data: { supplierId: null },
    });

    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Fornecedor apagado." });
  } catch {
    return NextResponse.json(
      { message: "Erro ao apagar fornecedor." },
      { status: 500 }
    );
  }
}