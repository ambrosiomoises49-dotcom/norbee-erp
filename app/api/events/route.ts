import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

function parseDate(value: string) {

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    throw new Error("INVALID_DATE");

  }

  return date;

}

export async function GET(req: Request) {

  try {

    const session = await requireAdmin();

    const { searchParams } = new URL(req.url);

    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const month = Number(searchParams.get("month"));

    const start =

      Number.isFinite(month) && month >= 0 && month <= 11

        ? new Date(year, month, 1)

        : new Date(year, 0, 1);

    const end =

      Number.isFinite(month) && month >= 0 && month <= 11

        ? new Date(year, month + 1, 1)

        : new Date(year + 1, 0, 1);

    const [events, cantinas] = await Promise.all([

      prisma.event.findMany({

        where: {

          companyId: session.companyId,

          eventDate: {

            gte: start,

            lt: end,

          },

        },

        include: {

          cantina: {

            select: {

              id: true,

              name: true,

              code: true,

            },

          },

        },

        orderBy: {

          eventDate: "asc",

        },

      }),

      prisma.cantina.findMany({

        where: {

          companyId: session.companyId,

        },

        select: {

          id: true,

          name: true,

          code: true,

        },

        orderBy: {

          name: "asc",

        },

      }),

    ]);

    return NextResponse.json({

      events,

      cantinas,

    });

  } catch (error) {

    console.error("ERRO API EVENTS GET:", error);

    return NextResponse.json(

      { message: "Erro ao carregar eventos." },

      { status: 500 }

    );

  }

}

export async function POST(request: Request) {

  try {

    const session = await requireAdmin();

    const body = await request.json();

    const {

      title,

      type,

      description,

      eventDate,

      cantinaId,

      priority,

      color,

    } = body;

    if (!title || !eventDate) {

      return NextResponse.json(

        { message: "Título e data do evento são obrigatórios." },

        { status: 400 }

      );

    }

    if (cantinaId) {

      const cantina = await prisma.cantina.findFirst({

        where: {

          id: cantinaId,

          companyId: session.companyId,

        },

      });

      if (!cantina) {

        return NextResponse.json(

          { message: "Cantina inválida." },

          { status: 400 }

        );

      }

    }

    const event = await prisma.event.create({

      data: {

        companyId: session.companyId,

        cantinaId: cantinaId || null,

        title,

        type: type || "OTHER",

        description: description || null,

        eventDate: parseDate(eventDate),

        priority: priority || "NORMAL",

        status: "PENDING",

        color: color || "#123A5C",

      },

      include: {

        cantina: {

          select: {

            id: true,

            name: true,

            code: true,

          },

        },

      },

    });

    return NextResponse.json({

      message: "Evento criado com sucesso.",

      event,

    });

  } catch (error) {

    console.error("ERRO API EVENTS POST:", error);

    if (error instanceof Error && error.message === "INVALID_DATE") {

      return NextResponse.json(

        { message: "Data inválida." },

        { status: 400 }

      );

    }

    return NextResponse.json(

      { message: "Erro ao criar evento." },

      { status: 500 }

    );

  }

}