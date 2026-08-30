import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$use" | "$extends"
>;
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

    /*
 * ============================================================
 * STOCK PARADO / DIAS SEM VENDA
 *
 * Esta lógica é apenas informativa.
 * Não altera stock, FIFO, vendas ou movimentos.
 * ============================================================
 */

const now = new Date();

/*
 * Última venda conhecida por produto.
 *
 * Percorremos as vendas apenas UMA vez e criamos um Map.
 * Como as vendas já vêm ordenadas por createdAt desc,
 * guardamos apenas a primeira ocorrência de cada produto.
 */
const lastSaleByProduct = new Map<string, Date>();

for (const sale of cantina.sales) {
  for (const item of sale.items) {
    if (!lastSaleByProduct.has(item.productId)) {
      lastSaleByProduct.set(
        item.productId,
        new Date(sale.createdAt)
      );
    }
  }
}

/*
 * Última entrada de stock por produto.
 *
 * Como stockMovements também está ordenado desc,
 * guardamos apenas a primeira entrada encontrada.
 */
const lastStockInByProduct = new Map<string, Date>();

const stockInTypes = new Set([
  "PURCHASE_IN",
  "TRANSFER_IN",
  "ADJUSTMENT_IN",
  "RETURN",
]);

for (const movement of stockMovements) {
  if (
    stockInTypes.has(movement.type) &&
    !lastStockInByProduct.has(movement.productId)
  ) {
    lastStockInByProduct.set(
      movement.productId,
      new Date(movement.createdAt)
    );
  }
}

/*
 * Acrescentar informações de inatividade ao stock.
 */
const cantinaStocksWithInactivity =
  cantina.cantinaStocks.map((stock) => {
    const quantity = Number(stock.quantity || 0);

    const lastSaleAt =
      lastSaleByProduct.get(stock.productId) || null;

    const lastStockInAt =
      lastStockInByProduct.get(stock.productId) || null;

    /*
     * Para stock parado, interessa-nos a atividade
     * mais recente relacionada com o stock atual.
     *
     * Exemplo:
     * - última venda: há 100 dias
     * - nova entrada: há 5 dias
     *
     * Não seria correto dizer que o stock atual
     * está parado há 100 dias.
     */
    let inactivitySince: Date | null = null;

    if (lastSaleAt && lastStockInAt) {
      inactivitySince =
        lastSaleAt > lastStockInAt
          ? lastSaleAt
          : lastStockInAt;
    } else {
      inactivitySince =
        lastSaleAt || lastStockInAt;
    }

    let daysWithoutSale = 0;

    if (quantity > 0 && inactivitySince) {
      const differenceMs =
        now.getTime() - inactivitySince.getTime();

      daysWithoutSale = Math.max(
        0,
        Math.floor(
          differenceMs /
            (1000 * 60 * 60 * 24)
        )
      );
    }

    /*
     * REGRA DEFINIDA:
     *
     * 0 stock      → nunca é stock parado
     * 0–29 dias    → normal
     * 30–39 dias   → atenção
     * >= 40 dias   → stock parado
     */
    const isDeadStock =
      quantity > 0 &&
      inactivitySince !== null &&
      daysWithoutSale >= 40;

    return {
      ...stock,

      lastSaleAt:
        lastSaleAt?.toISOString() || null,

      lastStockInAt:
        lastStockInAt?.toISOString() || null,

      inactivitySince:
        inactivitySince?.toISOString() || null,

      daysWithoutSale,

      isDeadStock,
    };
  });

    return NextResponse.json({
      cantina: {
    ...cantina,

    cantinaStocks:
      cantinaStocksWithInactivity,

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

    await prisma.$transaction(async (tx: TransactionClient) => {
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