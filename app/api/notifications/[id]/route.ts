import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const session = await requireAuth();

    const { id } = await params;

    /*
     * ============================================================
     * MARCAR COMO LIDA
     *
     * Atualizamos os dois campos juntos:
     *
     * isRead = true
     * readAt = momento da leitura
     *
     * Também limitamos sempre por:
     * - companyId
     * - userId
     *
     * Assim um utilizador nunca pode modificar
     * notificação de outra empresa ou utilizador.
     * ============================================================
     */

    const result =
      await prisma.notification.updateMany({
        where: {
          id,
          companyId:
            session.companyId,
          userId:
            session.userId,
        },

        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

    if (result.count === 0) {
      return NextResponse.json(
        {
          message:
            "Notificação não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      message:
        "Notificação marcada como lida.",
    });
  } catch (error) {
    console.error(
      "ERRO NOTIFICATION READ:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Erro ao marcar notificação como lida.",
      },
      {
        status: 500,
      }
    );
  }
}