import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const cantina = await prisma.cantina.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        user: {
          select: {
            identifier: true,
            status: true,
            lastLoginAt: true,
          },
        },
        employees: {
          orderBy: { createdAt: "desc" },
        },
        costs: {
          include: {
            category: true,
          },
          orderBy: { costDate: "desc" },
        },
        cantinaStocks: {
          include: {
            product: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
        sales: {
          where: {
            status: "COMPLETED",
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            sales: true,
            employees: true,
            costs: true,
            cantinaStocks: true,
          },
        },
      },
    });

    if (!cantina) {
      return NextResponse.json(
        { message: "Cantina não encontrada." },
        { status: 404 }
      );
    }

    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        companyId: session.companyId,
        cantinaId: id,
      },
      include: {
        product: true,
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
    });

    return NextResponse.json({
      cantina: {
        ...cantina,
        stockMovements,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const cantina = await prisma.cantina.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!cantina) {
      return NextResponse.json(
        { message: "Cantina não encontrada." },
        { status: 404 }
      );
    }

    const updatedCantina = await prisma.cantina.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        location: body.location ?? undefined,
        openingDate: body.openingDate ? new Date(body.openingDate) : undefined,
        openingCash:
          body.openingCash === "" || body.openingCash === undefined
            ? undefined
            : body.openingCash,
        availableMachines: body.availableMachines ?? undefined,
        status: body.status ?? undefined,
      },
    });

    if (body.status) {
      await prisma.user.updateMany({
        where: {
          cantinaId: id,
          companyId: session.companyId,
        },
        data: {
          status: body.status,
        },
      });
    }

    return NextResponse.json({
      message: "Cantina atualizada com sucesso.",
      cantina: updatedCantina,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao atualizar cantina." },
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

    const cantina = await prisma.cantina.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
    });

    if (!cantina) {
      return NextResponse.json(
        { message: "Cantina não encontrada." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({
        where: {
          cantinaId: id,
          companyId: session.companyId,
        },
      });

      await tx.stockMovement.updateMany({
        where: {
          cantinaId: id,
          companyId: session.companyId,
        },
        data: {
          cantinaId: null,
        },
      });

      await tx.cantina.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      message: "Cantina apagada definitivamente.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Erro ao apagar cantina." },
      { status: 500 }
    );
  }
}