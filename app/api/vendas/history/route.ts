import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const page = Number(searchParams.get("page") || 1);
    const pageSize = 5;

    const requestedCantinaId = searchParams.get("cantinaId");

    const cantinaId =
      session.role === "ADMIN" ? requestedCantinaId || undefined : session.cantinaId || undefined;

    if (!cantinaId) {
      return NextResponse.json(
        { message: "Cantina obrigatória." },
        { status: 400 }
      );
    }

    const where = {
      companyId: session.companyId,
      cantinaId,
      createdAt: {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end ? { lte: new Date(`${end}T23:59:59`) } : {}),
      },
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  internalCode: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}