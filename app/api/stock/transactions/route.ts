import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const cantinaId = searchParams.get("cantinaId");
    const productCode = searchParams.get("productCode");

    const product = productCode
      ? await prisma.product.findFirst({
          where: {
            companyId: session.companyId,
            OR: [
              { internalCode: productCode },
              { barcode: productCode },
              { name: { contains: productCode, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        })
      : null;

    const transactions = await prisma.stockMovement.findMany({
      where: {
        companyId: session.companyId,
        ...(start || end
          ? {
              createdAt: {
                ...(start ? { gte: new Date(start) } : {}),
                ...(end ? { lte: new Date(`${end}T23:59:59`) } : {}),
              },
            }
          : {}),
        ...(cantinaId ? { cantinaId } : {}),
        ...(productCode && product ? { productId: product.id } : {}),
        ...(productCode && !product ? { productId: "__not_found__" } : {}),
      },
      include: {
        product: {
          select: {
            name: true,
            internalCode: true,
            barcode: true,
          },
        },
        user: {
          select: {
            name: true,
            identifier: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 300,
    });

    const cantinas = await prisma.cantina.findMany({
      where: {
        companyId: session.companyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      transactions,
      cantinas,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao carregar transações." },
      { status: 500 }
    );
  }
}