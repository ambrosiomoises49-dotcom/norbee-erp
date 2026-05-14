import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type NotificationRow = {
  isRead: boolean;
};

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

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter(
        (n: NotificationRow) => !n.isRead
      ).length,
    });
  } catch (error) {
    console.error("ERRO API NOTIFICATIONS:", error);

    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}