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

export async function PATCH(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const session = await requireAdmin();

    const { id } = await params;

    const body = await request.json();

    const event = await prisma.event.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

    });

    if (!event) {

      return NextResponse.json(

        { message: "Evento não encontrado." },

        { status: 404 }

      );

    }

    if (body.cantinaId) {

      const cantina = await prisma.cantina.findFirst({

        where: {

          id: body.cantinaId,

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

    const updated = await prisma.event.update({

      where: { id },

      data: {

        title: body.title ?? undefined,

        type: body.type ?? undefined,

        description:

          body.description === "" ? null : body.description ?? undefined,

        cantinaId:

          body.cantinaId === "" ? null : body.cantinaId ?? undefined,

        eventDate: body.eventDate ? parseDate(body.eventDate) : undefined,

        priority: body.priority ?? undefined,

        status: body.status ?? undefined,

        color: body.color ?? undefined,

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

      message: "Evento atualizado com sucesso.",

      event: updated,

    });

  } catch (error) {

    console.error("ERRO API EVENTS PATCH:", error);

    if (error instanceof Error && error.message === "INVALID_DATE") {

      return NextResponse.json(

        { message: "Data inválida." },

        { status: 400 }

      );

    }

    return NextResponse.json(

      { message: "Erro ao atualizar evento." },

      { status: 500 }

    );

  }

}

export async function DELETE(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const session = await requireAdmin();

    const { id } = await params;

    const event = await prisma.event.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

    });

    if (!event) {

      return NextResponse.json(

        { message: "Evento não encontrado." },

        { status: 404 }

      );

    }

    await prisma.event.delete({

      where: { id },

    });

    return NextResponse.json({

      message: "Evento apagado com sucesso.",

    });

  } catch (error) {

    console.error("ERRO API EVENTS DELETE:", error);

    return NextResponse.json(

      { message: "Erro ao apagar evento." },

      { status: 500 }

    );

  }

}