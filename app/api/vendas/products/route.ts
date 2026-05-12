import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const requestedCantinaId = searchParams.get("cantinaId");

    const cantinaId =
      session.role === "ADMIN" ? requestedCantinaId : session.cantinaId;

    const cantinas =
      session.role === "ADMIN"
        ? await prisma.cantina.findMany({
            where: {
              companyId: session.companyId,
              status: "ACTIVE",
            },
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
            },
            orderBy: {
              name: "asc",
            },
          })
        : [];

    if (!cantinaId) {
      return NextResponse.json({
        role: session.role,
        cantinas,
        cantina: null,
        products: [],
      });
    }

    const cantina = await prisma.cantina.findFirst({
      where: {
        id: cantinaId,
        companyId: session.companyId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
      },
    });

    if (!cantina) {
      return NextResponse.json(
        { message: "Cantina não encontrada." },
        { status: 404 }
      );
    }

    const products = await prisma.cantinaStock.findMany({
      where: {
        companyId: session.companyId,
        cantinaId,
        quantity: {
          gt: 0,
        },
        product: {
          status: "ACTIVE",
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            internalCode: true,
            barcode: true,
            unit: true,
            salePrice: true,
            purchasePrice: true,
            minStock: true,
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      role: session.role,
      cantinas,
      cantina,
      products,
    });
  } catch {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}