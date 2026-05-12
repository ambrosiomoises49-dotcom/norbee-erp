import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/auth";

export async function GET() {

  try {

    const session = await requireAuth();

    const notifications = await prisma.notification.findMany({

      where: {

        companyId: session.companyId,

        userId: session.userId,

      },

      orderBy: {

        createdAt: "desc",

      },

      take: 30,

    });

    const unreadCount = await prisma.notification.count({

      where: {

        companyId: session.companyId,

        userId: session.userId,

        isRead: false,

      },

    });

    return NextResponse.json({

      notifications,

      unreadCount,

    });

  } catch (error) {

    console.error("ERRO API NOTIFICATIONS:", error);

    return NextResponse.json(

      { message: "Erro ao carregar notificações." },

      { status: 500 }

    );

  }

}