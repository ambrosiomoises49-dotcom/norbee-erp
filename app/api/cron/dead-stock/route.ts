import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/*
 * ============================================================
 * CONFIGURAÇÃO STOCK PARADO
 * ============================================================
 */

const DEAD_STOCK_LEVELS = [40, 60, 90] as const;

type DeadStockLevel = (typeof DEAD_STOCK_LEVELS)[number];

const STOCK_IN_TYPES = new Set([
  "PURCHASE_IN",
  "TRANSFER_IN",
  "ADJUSTMENT_IN",
  "RETURN",
]);

/*
 * ============================================================
 * TEXTO DAS NOTIFICAÇÕES
 * ============================================================
 */

function getDeadStockAlert(
  level: DeadStockLevel,
  productName: string,
  cantinaName: string,
  quantity: number
) {
  if (level === 90) {
    return {
      title: "Stock parado crítico",
      message:
        `${productName} está há pelo menos 90 dias sem venda ` +
        `na ${cantinaName}. Quantidade em stock: ${quantity}.`,
    };
  }

  if (level === 60) {
    return {
      title: "Stock parado prolongado",
      message:
        `${productName} está há pelo menos 60 dias sem venda ` +
        `na ${cantinaName}. Quantidade em stock: ${quantity}.`,
    };
  }

  return {
    title: "Stock parado",
    message:
      `${productName} está há pelo menos 40 dias sem venda ` +
      `na ${cantinaName}. Quantidade em stock: ${quantity}.`,
  };
}

/*
 * ============================================================
 * NÍVEL ATUAL DE STOCK PARADO
 *
 * 0–39  → nenhum
 * 40–59 → 40
 * 60–89 → 60
 * 90+   → 90
 * ============================================================
 */

function getCurrentDeadStockLevel(
  daysWithoutSale: number
): DeadStockLevel | null {
  if (daysWithoutSale >= 90) {
    return 90;
  }

  if (daysWithoutSale >= 60) {
    return 60;
  }

  if (daysWithoutSale >= 40) {
    return 40;
  }

  return null;
}

/*
 * ============================================================
 * CRON
 * ============================================================
 */

export async function GET(request: Request) {
  try {
    /*
     * ========================================================
     * 1. SEGURANÇA VIA QUERY PARAMETER
     *
     * Exemplo:
     *
     * /api/cron/dead-stock?secret=MINHA_CHAVE
     * ========================================================
     */

    const { searchParams } = new URL(request.url);

    const secret = searchParams.get("secret");

    const cronSecret = process.env.CRON_SECRET;

    if (
      !cronSecret ||
      !secret ||
      secret !== cronSecret
    ) {
      return NextResponse.json(
        {
          message: "Não autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const now = new Date();

    /*
     * ========================================================
     * 2. CARREGAR STOCK COM QUANTIDADE > 0
     * ========================================================
     */

    const stocks =
      await prisma.cantinaStock.findMany({
        where: {
          quantity: {
            gt: 0,
          },
        },

        include: {
          product: {
            select: {
              id: true,
              name: true,
              internalCode: true,
            },
          },

          cantina: {
            select: {
              id: true,
              name: true,
              code: true,
              companyId: true,
            },
          },
        },
      });

    if (stocks.length === 0) {
      return NextResponse.json({
        message:
          "Verificação de stock parado concluída.",
        checked: 0,
        deadStock: 0,
        notificationsCreated: 0,
      });
    }

    /*
     * ========================================================
     * 3. CARREGAR MOVIMENTOS RELEVANTES
     * ========================================================
     */

    const movements =
      await prisma.stockMovement.findMany({
        where: {
          cantinaId: {
            not: null,
          },

          type: {
            in: [
              "SALE_OUT",
              "PURCHASE_IN",
              "TRANSFER_IN",
              "ADJUSTMENT_IN",
              "RETURN",
            ],
          },
        },

        select: {
          productId: true,
          cantinaId: true,
          type: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    /*
     * ========================================================
     * 4. MAPAS DE ÚLTIMA VENDA / ÚLTIMA ENTRADA
     * ========================================================
     */

    const lastSaleByStock =
      new Map<string, Date>();

    const lastStockInByStock =
      new Map<string, Date>();

    for (const movement of movements) {
      if (!movement.cantinaId) {
        continue;
      }

      const key =
        `${movement.cantinaId}:${movement.productId}`;

      /*
       * Última venda
       */
      if (
        movement.type === "SALE_OUT" &&
        !lastSaleByStock.has(key)
      ) {
        lastSaleByStock.set(
          key,
          movement.createdAt
        );
      }

      /*
       * Última entrada de stock
       */
      if (
        STOCK_IN_TYPES.has(movement.type) &&
        !lastStockInByStock.has(key)
      ) {
        lastStockInByStock.set(
          key,
          movement.createdAt
        );
      }
    }

    /*
     * ========================================================
     * 5. IDENTIFICAR STOCK PARADO
     * ========================================================
     */

    const deadStockCandidates: Array<{
      companyId: string;

      cantinaId: string;
      cantinaName: string;

      productId: string;
      productName: string;

      quantity: number;

      inactivitySince: Date;
      daysWithoutSale: number;

      level: DeadStockLevel;

      link: string;
    }> = [];

    for (const stock of stocks) {
      const key =
        `${stock.cantina.id}:${stock.product.id}`;

      const lastSaleAt =
        lastSaleByStock.get(key) || null;

      const lastStockInAt =
        lastStockInByStock.get(key) || null;

      /*
       * Usa a atividade mais recente:
       *
       * - última venda
       * - última entrada
       *
       * Isso evita considerar stock novo como parado
       * por causa de uma venda muito antiga.
       */

      let inactivitySince: Date | null =
        null;

      if (lastSaleAt && lastStockInAt) {
        inactivitySince =
          lastSaleAt > lastStockInAt
            ? lastSaleAt
            : lastStockInAt;
      } else {
        inactivitySince =
          lastSaleAt || lastStockInAt;
      }

      /*
       * Sem referência temporal:
       * não inventamos uma data.
       */

      if (!inactivitySince) {
        continue;
      }

      const differenceMs =
        now.getTime() -
        inactivitySince.getTime();

      const daysWithoutSale =
        Math.max(
          0,
          Math.floor(
            differenceMs /
              (1000 * 60 * 60 * 24)
          )
        );

      const level =
        getCurrentDeadStockLevel(
          daysWithoutSale
        );

      if (!level) {
        continue;
      }

      /*
       * O nível entra no link.
       *
       * Isso permite distinguir:
       * 40, 60 e 90 dias.
       */

      const link =
        `/cantinas/${stock.cantina.id}` +
        `?deadStockProduct=${stock.product.id}` +
        `&deadStockLevel=${level}`;

      deadStockCandidates.push({
        companyId:
          stock.cantina.companyId,

        cantinaId:
          stock.cantina.id,

        cantinaName:
          stock.cantina.name,

        productId:
          stock.product.id,

        productName:
          stock.product.name,

        quantity:
          Number(stock.quantity || 0),

        inactivitySince,

        daysWithoutSale,

        level,

        link,
      });
    }

    /*
     * ========================================================
     * NENHUM STOCK PARADO
     * ========================================================
     */

    if (
      deadStockCandidates.length === 0
    ) {
      return NextResponse.json({
        message:
          "Verificação de stock parado concluída.",

        checked:
          stocks.length,

        deadStock: 0,

        notificationsCreated: 0,
      });
    }

    /*
     * ========================================================
     * 6. EMPRESAS ENVOLVIDAS
     * ========================================================
     */

    const companyIds =
      Array.from(
        new Set(
          deadStockCandidates.map(
            (item) => item.companyId
          )
        )
      );

    /*
     * ========================================================
     * 7. ADMINISTRADORES ATIVOS
     * ========================================================
     */

    const admins =
      await prisma.user.findMany({
        where: {
          companyId: {
            in: companyIds,
          },

          role: "ADMIN",

          status: "ACTIVE",
        },

        select: {
          id: true,
          companyId: true,
        },
      });

    const adminsByCompany =
      new Map<string, string[]>();

    for (const admin of admins) {
      const current =
        adminsByCompany.get(
          admin.companyId
        ) || [];

      current.push(admin.id);

      adminsByCompany.set(
        admin.companyId,
        current
      );
    }

    /*
     * ========================================================
     * 8. NOTIFICAÇÕES DE STOCK PARADO JÁ EXISTENTES
     *
     * Uma única query.
     * ========================================================
     */

    const existingNotifications =
      await prisma.notification.findMany({
        where: {
          companyId: {
            in: companyIds,
          },

          type: "STOCK_LOW",

          link: {
            contains:
              "deadStockProduct=",
          },
        },

        select: {
          userId: true,
          link: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    /*
     * userId + link
     *
     * Exemplo:
     *
     * admin123:/cantinas/xxx?...level=40
     */

    const existingNotificationMap =
      new Map<string, Date>();

    for (
      const notification
      of existingNotifications
    ) {
      if (!notification.link) {
        continue;
      }

      const key =
        `${notification.userId}:${notification.link}`;

      if (
        !existingNotificationMap.has(key)
      ) {
        existingNotificationMap.set(
          key,
          notification.createdAt
        );
      }
    }

    /*
     * ========================================================
     * 9. PREPARAR NOTIFICAÇÕES
     * ========================================================
     */

    const notificationsToCreate: Array<{
      companyId: string;
      userId: string;
      type: "STOCK_LOW";
      title: string;
      message: string;
      link: string;
    }> = [];

    for (
      const candidate
      of deadStockCandidates
    ) {
      const companyAdmins =
        adminsByCompany.get(
          candidate.companyId
        ) || [];

      if (
        companyAdmins.length === 0
      ) {
        continue;
      }

      const alert =
        getDeadStockAlert(
          candidate.level,
          candidate.productName,
          candidate.cantinaName,
          candidate.quantity
        );

      for (
        const adminId
        of companyAdmins
      ) {
        const notificationKey =
          `${adminId}:${candidate.link}`;

        const previousNotificationAt =
          existingNotificationMap.get(
            notificationKey
          );

        /*
         * Se já foi criada neste mesmo ciclo,
         * não cria novamente.
         */

        if (
          previousNotificationAt &&
          previousNotificationAt >=
            candidate.inactivitySince
        ) {
          continue;
        }

        notificationsToCreate.push({
          companyId:
            candidate.companyId,

          userId:
            adminId,

          type:
            "STOCK_LOW",

          title:
            alert.title,

          message:
            alert.message,

          link:
            candidate.link,
        });
      }
    }

    /*
     * ========================================================
     * 10. CRIAR TODAS AS NOVAS NOTIFICAÇÕES EM LOTE
     * ========================================================
     */

    if (
      notificationsToCreate.length > 0
    ) {
      await prisma.notification.createMany({
        data:
          notificationsToCreate,
      });
    }

    /*
     * ========================================================
     * 11. ESTATÍSTICAS
     * ========================================================
     */

    const level40 =
      deadStockCandidates.filter(
        (item) =>
          item.level === 40
      ).length;

    const level60 =
      deadStockCandidates.filter(
        (item) =>
          item.level === 60
      ).length;

    const level90 =
      deadStockCandidates.filter(
        (item) =>
          item.level === 90
      ).length;

    /*
     * ========================================================
     * 12. RESPOSTA
     * ========================================================
     */

    return NextResponse.json({
      message:
        "Verificação de stock parado concluída.",

      checked:
        stocks.length,

      deadStock:
        deadStockCandidates.length,

      levels: {
        days40:
          level40,

        days60:
          level60,

        days90:
          level90,
      },

      notificationsCreated:
        notificationsToCreate.length,
    });
  } catch (error) {
    console.error(
      "ERRO DEAD STOCK CRON:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao verificar stock parado.",
      },
      {
        status: 500,
      }
    );
  }
}