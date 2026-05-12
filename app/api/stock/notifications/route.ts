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

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  } catch {
    return NextResponse.json(
      { message: "Acesso não autorizado." },
      { status: 401 }
    );
  }
}