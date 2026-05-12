import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Cantina, Event } from "@prisma/client";

export const runtime = "nodejs";

type EventWithCantina = Event & {
  cantina: Pick<Cantina, "name" | "code"> | null;
};

type ReminderType = "24H" | "2H" | "30M";

function minutesUntil(date: Date) {
  return Math.floor((date.getTime() - Date.now()) / 60000);
}

function reminderLabel(type: ReminderType) {
  if (type === "24H") return "24 horas";
  if (type === "2H") return "2 horas";
  return "30 minutos";
}

function reminderTitle(type: ReminderType, eventTitle: string) {
  return `Lembrete ${reminderLabel(type)}: ${eventTitle}`;
}

function reminderMessage(event: EventWithCantina, type: ReminderType) {
  const cantina = event.cantina
    ? `${event.cantina.name} — ${event.cantina.code}`
    : "Geral";

  return `O evento "${event.title}" está programado para daqui a ${reminderLabel(
    type
  )}. Cantina: ${cantina}.`;
}

async function notifyEvent({
  event,
  type,
}: {
  event: EventWithCantina;
  type: ReminderType;
}) {
  const admins = await prisma.user.findMany({
    where: {
      companyId: event.companyId,
      role: "ADMIN",
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        companyId: event.companyId,
        userId: admin.id,
        type: "SYSTEM",
        title: reminderTitle(type, event.title),
        message: reminderMessage(event, type),
        link: "Dashboard",
        isRead: false,
      },
    });
  }
}
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
  try {
    const now = new Date();
    const next25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const events = await prisma.event.findMany({
      where: {
        status: "PENDING",
        eventDate: {
          gte: now,
          lte: next25h,
        },
      },
      include: {
        cantina: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    let sent24h = 0;
    let sent2h = 0;
    let sent30m = 0;

    for (const event of events) {
      const diff = minutesUntil(new Date(event.eventDate));

      if (diff <= 24 * 60 && diff > 23 * 60 && !event.reminder24Sent) {
        await notifyEvent({ event, type: "24H" });

        await prisma.event.update({
          where: { id: event.id },
          data: { reminder24Sent: true },
        });

        sent24h++;
      }

      if (diff <= 2 * 60 && diff > 90 && !event.reminder2Sent) {
        await notifyEvent({ event, type: "2H" });

        await prisma.event.update({
          where: { id: event.id },
          data: { reminder2Sent: true },
        });

        sent2h++;
      }

      if (diff <= 30 && diff > 0 && !event.reminder30Sent) {
        await notifyEvent({ event, type: "30M" });

        await prisma.event.update({
          where: { id: event.id },
          data: { reminder30Sent: true },
        });

        sent30m++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lembretes verificados com sucesso.",
      checked: events.length,
      sent24h,
      sent2h,
      sent30m,
    });
  } catch (error) {
    console.error("ERRO EVENT REMINDERS:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar lembretes.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}