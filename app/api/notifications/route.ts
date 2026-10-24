import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);

    /*
     * ============================================================
     * FILTROS / PAGINAÇÃO
     * ============================================================
     */

    const unreadOnly =
      searchParams.get("unreadOnly") === "true";

    const requestedPage = Number(
      searchParams.get("page") || 1
    );

    const page =
      Number.isFinite(requestedPage) &&
      requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    /*
     * Carregamos 50 notificações de cada vez.
     *
     * Não significa que só existam 50.
     * As restantes ficam disponíveis através
     * das páginas seguintes.
     */
    const limit = 50;

    /*
     * ============================================================
     * FILTRO BASE
     *
     * Segurança multiempresa:
     * cada utilizador vê apenas as suas notificações.
     * ============================================================
     */

    const where = {
      companyId: session.companyId,
      userId: session.userId,

      ...(unreadOnly
        ? {
            isRead: false,
          }
        : {}),
    };

    /*
     * ============================================================
     * CONSULTAS
     *
     * notifications:
     * - não lidas primeiro
     * - dentro de cada grupo, mais recentes primeiro
     *
     * total:
     * - total correspondente ao filtro atual
     *
     * unreadCount:
     * - total real de notificações não lidas,
     *   independentemente da página atual
     * ============================================================
     */

    const [
      notifications,
      total,
      unreadCount,
    ] = await Promise.all([
      prisma.notification.findMany({
        where,

        orderBy: unreadOnly
          ? [
              {
                createdAt: "desc" as const,
              },
            ]
          : [
              {
                isRead: "asc" as const,
              },
              {
                createdAt: "desc" as const,
              },
            ],

        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.notification.count({
        where,
      }),

      prisma.notification.count({
        where: {
          companyId: session.companyId,
          userId: session.userId,
          isRead: false,
        },
      }),
    ]);

    /*
     * ============================================================
     * PAGINAÇÃO
     * ============================================================
     */

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    const hasMore =
      page * limit < total;

    return NextResponse.json({
      notifications,

      unreadCount,

      page,

      limit,

      total,

      totalPages,

      hasMore,

      unreadOnly,
    });
  } catch (error) {
    console.error(
      "ERRO API NOTIFICATIONS:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao carregar notificações.",
      },
      {
        status: 500,
      }
    );
  }
}