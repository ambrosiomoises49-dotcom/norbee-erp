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
    const body = await request.json();

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        internalCode: body.internalCode,
        barcode: body.barcode || null,
        unit: body.unit || "UN",
        categoryId: body.categoryId || null,
        supplierId: body.supplierId || null,
        purchasePrice: body.purchasePrice || 0,
        salePrice: body.salePrice || 0,
        minStock: Number(body.minStock || 0),
      },
    });

    return NextResponse.json({
      message: "Produto atualizado com sucesso.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao editar produto." },
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

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        saleItems: true,
        purchaseItems: true,
        transferItems: true,
        stockMovements: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Produto não encontrado." },
        { status: 404 }
      );
    }

    const hasHistory =
      product.saleItems.length > 0 ||
      product.purchaseItems.length > 0 ||
      product.transferItems.length > 0 ||
      product.stockMovements.length > 0;

    if (hasHistory) {
      await prisma.product.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      return NextResponse.json({
        message:
          "Produto já tem histórico. Ele foi desativado para preservar os relatórios.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.centralStock.deleteMany({
        where: {
          productId: id,
          companyId: session.companyId,
        },
      });

      await tx.cantinaStock.deleteMany({
        where: {
          productId: id,
          companyId: session.companyId,
        },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Produto apagado definitivamente.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao apagar produto." },
      { status: 500 }
    );
  }
}