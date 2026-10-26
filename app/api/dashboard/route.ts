import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type DecimalLike = {
  toString(): string;
};

type FinancialAccountRow = {
  balance: DecimalLike | number | null;
};

type SaleItemRow = {
  unitCost: DecimalLike | number | null;
  quantity: number | null;
};

type SaleRow = {
  totalAmount: DecimalLike | number | null;
  createdAt: Date;
  items?: SaleItemRow[];
};

type CostRow = {
  amount: DecimalLike | number | null;

  category?: {
    name: string;
  } | null;
};

type CentralStockRow = {
  id: string;
  quantity: number;
  avgCost: DecimalLike | number | null;

  product: {
    name: string;
    salePrice: DecimalLike | number | null;
    minStock: number;
  };
};

type CantinaRow = {
  id: string;
  name: string;
  code: string;
  sales: SaleRow[];
};

type EmployeeRow = {
  status: string;
};

function startOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function startOfToday() {
  const d = new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

export async function GET() {
  try {
    const session =
      await requireAdmin();

    const now =
      new Date();

    const monthStart =
      startOfMonth(now);

    const todayStart =
      startOfToday();

    const [
      financialAccounts,
      monthSales,
      todaySales,
      monthCosts,
      centralStocks,
      lowStocks,
      cantinas,
      events,
      transactions,
      employees,
      purchases,
    ] = await Promise.all([
      /*
       * ========================================================
       * CONTAS FINANCEIRAS
       * ========================================================
       */
      prisma.financialAccount.findMany({
        where: {
          companyId:
            session.companyId,

          status:
            "ACTIVE",
        },
      }),

      /*
       * ========================================================
       * VENDAS DO MÊS
       * ========================================================
       */
      prisma.sale.findMany({
        where: {
          companyId:
            session.companyId,

          status:
            "COMPLETED",

          createdAt: {
            gte:
              monthStart,

            lte:
              now,
          },
        },

        include: {
          items:
            true,

          cantina: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),

      /*
       * ========================================================
       * VENDAS DE HOJE
       * ========================================================
       */
      prisma.sale.findMany({
        where: {
          companyId:
            session.companyId,

          status:
            "COMPLETED",

          createdAt: {
            gte:
              todayStart,

            lte:
              now,
          },
        },
      }),

      /*
       * ========================================================
       * CUSTOS PAGOS DO MÊS
       *
       * Incluímos a categoria porque precisamos distinguir:
       *
       * - custos/despesas operacionais
       * - antigos custos automáticos "Compra de mercadoria"
       *
       * A compra principal da mercadoria NÃO deve ser
       * descontada aqui porque o custo já entra pelo FIFO.
       * ========================================================
       */
      prisma.cost.findMany({
        where: {
          companyId:
            session.companyId,

          paymentStatus:
            "PAID",

          costDate: {
            gte:
              monthStart,

            lte:
              now,
          },
        },

        include: {
          category:
            true,
        },
      }),

      /*
       * ========================================================
       * STOCK CENTRAL
       * ========================================================
       */
      prisma.centralStock.findMany({
        where: {
          companyId:
            session.companyId,
        },

        include: {
          product:
            true,
        },
      }),

      /*
       * ========================================================
       * STOCK BAIXO
       * ========================================================
       */
      prisma.centralStock.findMany({
        where: {
          companyId:
            session.companyId,
        },

        include: {
          product:
            true,
        },
      }),

      /*
       * ========================================================
       * CANTINAS
       * ========================================================
       */
      prisma.cantina.findMany({
        where: {
          companyId:
            session.companyId,
        },

        include: {
          sales: {
            where: {
              createdAt: {
                gte:
                  monthStart,

                lte:
                  now,
              },

              status:
                "COMPLETED",
            },
          },
        },
      }),

      /*
       * ========================================================
       * EVENTOS
       * ========================================================
       */
      prisma.event.findMany({
        where: {
          companyId:
            session.companyId,

          status:
            "PENDING",

          eventDate: {
            gte:
              now,
          },
        },

        orderBy: {
          eventDate:
            "asc",
        },

        take:
          6,
      }),

      /*
       * ========================================================
       * ÚLTIMAS TRANSAÇÕES
       * ========================================================
       */
      prisma.financeTransaction.findMany({
        where: {
          companyId:
            session.companyId,
        },

        orderBy: {
          date:
            "desc",
        },

        take:
          6,
      }),

      /*
       * ========================================================
       * FUNCIONÁRIOS
       * ========================================================
       */
      prisma.employee.findMany({
        where: {
          companyId:
            session.companyId,
        },
      }),

      /*
       * ========================================================
       * ÚLTIMAS COMPRAS
       * ========================================================
       */
      prisma.purchase.findMany({
        where: {
          companyId:
            session.companyId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          5,
      }),
    ]);

    /*
     * ==========================================================
     * CAIXA ATUAL
     *
     * Soma do saldo de todas as contas financeiras ativas.
     * ==========================================================
     */

    const cashBalance =
      financialAccounts.reduce(
        (
          sum: number,
          account: FinancialAccountRow
        ) =>
          sum +
          Number(
            account.balance ||
              0
          ),
        0
      );

    /*
     * ==========================================================
     * VENDAS DO MÊS
     * ==========================================================
     */

    const salesMonthTotal =
      monthSales.reduce(
        (
          sum: number,
          sale: SaleRow
        ) =>
          sum +
          Number(
            sale.totalAmount ||
              0
          ),
        0
      );

    /*
     * ==========================================================
     * VENDAS DO DIA
     * ==========================================================
     */

    const salesTodayTotal =
      todaySales.reduce(
        (
          sum: number,
          sale: SaleRow
        ) =>
          sum +
          Number(
            sale.totalAmount ||
              0
          ),
        0
      );

    /*
     * ==========================================================
     * CUSTO DA MERCADORIA VENDIDA
     *
     * Apenas produtos efetivamente vendidos no mês.
     *
     * O custo é:
     *
     * unitCost FIFO
     * ×
     * quantidade vendida
     *
     * Não é o valor total das compras realizadas.
     * ==========================================================
     */

    const merchandiseCost =
      monthSales.reduce(
        (
          saleSum: number,
          sale: SaleRow
        ) => {
          const itemCost =
            (
              sale.items ||
              []
            ).reduce(
              (
                itemSum: number,
                item: SaleItemRow
              ) =>
                itemSum +
                Number(
                  item.unitCost ||
                    0
                ) *
                  Number(
                    item.quantity ||
                      0
                  ),
              0
            );

          return (
            saleSum +
            itemCost
          );
        },
        0
      );

    /*
     * ==========================================================
     * CUSTOS OPERACIONAIS DO MÊS
     *
     * IMPORTANTE:
     *
     * Antigas versões do sistema criavam:
     *
     * Cost:
     * "Compra de mercadoria"
     *
     * e simultaneamente criavam o custo FIFO.
     *
     * Se incluirmos esse Cost no lucro líquido,
     * descontamos a mercadoria duas vezes:
     *
     * 1. pelo FIFO
     * 2. pelo Cost automático da compra
     *
     * Portanto ignoramos APENAS essa categoria histórica.
     *
     * Transporte e outros custos continuam incluídos.
     * ==========================================================
     */

    const costsMonthTotal =
      monthCosts
        .filter(
          (
            cost: CostRow
          ) => {
            const categoryName =
              cost.category?.name
                ?.trim()
                .toLowerCase();

            return (
              categoryName !==
              "compra de mercadoria"
            );
          }
        )
        .reduce(
          (
            sum: number,
            cost: CostRow
          ) =>
            sum +
            Number(
              cost.amount ||
                0
            ),
          0
        );

    /*
     * ==========================================================
     * LUCRO BRUTO
     *
     * Vendas
     * -
     * custo FIFO da mercadoria efetivamente vendida
     * ==========================================================
     */

    const grossProfit =
      salesMonthTotal -
      merchandiseCost;

    /*
     * ==========================================================
     * LUCRO LÍQUIDO
     *
     * Lucro bruto
     * -
     * custos/despesas operacionais pagos
     *
     * NÃO voltamos a adicionar merchandiseCost.
     * ==========================================================
     */

    const netProfit =
      grossProfit -
      costsMonthTotal;

    /*
     * ==========================================================
     * VALOR DO STOCK CENTRAL
     * ==========================================================
     */

    const stockValue =
      centralStocks.reduce(
        (
          sum: number,
          stock: CentralStockRow
        ) =>
          sum +
          Number(
            stock.quantity ||
              0
          ) *
            Number(
              stock.avgCost ||
                0
            ),
        0
      );

    /*
     * ==========================================================
     * LUCRO POTENCIAL DO STOCK CENTRAL
     * ==========================================================
     */

    const potentialProfit =
      centralStocks.reduce(
        (
          sum: number,
          stock: CentralStockRow
        ) => {
          const quantity =
            Number(
              stock.quantity ||
                0
            );

          const salePrice =
            Number(
              stock.product
                .salePrice ||
                0
            );

          const avgCost =
            Number(
              stock.avgCost ||
                0
            );

          return (
            sum +
            quantity *
              (
                salePrice -
                avgCost
              )
          );
        },
        0
      );

    /*
     * ==========================================================
     * STOCK BAIXO
     * ==========================================================
     */

    const allLowStockRows =
      lowStocks
        .filter(
          (
            stock: CentralStockRow
          ) =>
            Number(
              stock.quantity ||
                0
            ) <=
            Number(
              stock.product
                .minStock ||
                0
            )
        )
        .map(
          (
            stock: CentralStockRow
          ) => ({
            id:
              stock.id,

            productName:
              stock.product.name,

            quantity:
              Number(
                stock.quantity ||
                  0
              ),

            minStock:
              Number(
                stock.product
                  .minStock ||
                  0
              ),
          })
        );

    const lowStockRows =
      allLowStockRows.slice(
        0,
        5
      );

    const lowStockCount =
      allLowStockRows.length;

    /*
     * ==========================================================
     * RANKING DE CANTINAS
     * ==========================================================
     */

    const cantinaRanking =
      cantinas
        .map(
          (
            cantina: CantinaRow
          ) => {
            const total =
              cantina.sales.reduce(
                (
                  sum: number,
                  sale: SaleRow
                ) =>
                  sum +
                  Number(
                    sale.totalAmount ||
                      0
                  ),
                0
              );

            return {
              id:
                cantina.id,

              name:
                cantina.name,

              code:
                cantina.code,

              total,

              salesCount:
                cantina.sales
                  .length,
            };
          }
        )
        .sort(
          (
            a: {
              total: number;
            },
            b: {
              total: number;
            }
          ) =>
            b.total -
            a.total
        );

    const bestCantina =
      cantinaRanking[0] ||
      null;

    /*
     * ==========================================================
     * GRÁFICO MENSAL
     * ==========================================================
     */

    const monthlyChart =
      Array.from(
        {
          length: 12,
        },
        (
          _,
          index
        ) => {
          const label =
            new Date(
              now.getFullYear(),
              index
            ).toLocaleString(
              "pt-PT",
              {
                month:
                  "short",
              }
            );

          const sales =
            monthSales.filter(
              (
                sale: SaleRow
              ) =>
                new Date(
                  sale.createdAt
                ).getMonth() ===
                index
            );

          const total =
            sales.reduce(
              (
                sum: number,
                sale: SaleRow
              ) =>
                sum +
                Number(
                  sale.totalAmount ||
                    0
                ),
              0
            );

          return {
            month:
              label,

            vendas:
              total,
          };
        }
      );

    /*
     * ==========================================================
     * RESPOSTA
     * ==========================================================
     */

    return NextResponse.json({
      cards: {
        cashBalance,

        salesMonthTotal,

        salesTodayTotal,

        stockValue,

        potentialProfit,

        netProfit,

        lowStockCount,

        activeEmployees:
          employees.filter(
            (
              employee: EmployeeRow
            ) =>
              employee.status ===
              "ACTIVE"
          ).length,
      },

      bestCantina,

      cantinaRanking:
        cantinaRanking.slice(
          0,
          5
        ),

      lowStockRows,

      events,

      transactions,

      purchases,

      monthlyChart,
    });
  } catch (error) {
    console.error(
      "ERRO DASHBOARD:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao carregar dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}