import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await prisma.notification.updateMany({
      where: {
        id,
        companyId: session.companyId,
        userId: session.userId,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Notificação marcada como lida.",
    });
  } catch (error) {
    console.error("ERRO NOTIFICATION READ:", error);

    return NextResponse.json(
      { message: "Erro ao marcar notificação como lida." },
      { status: 500 }
    );
  }
}