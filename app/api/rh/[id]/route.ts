import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/auth";

export async function PATCH(

  request: Request,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const session = await requireAdmin();

    const { id } = await params;

    const body = await request.json();

    const employee = await prisma.employee.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

    });

    if (!employee) {

      return NextResponse.json(

        { message: "Funcionário não encontrado." },

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

    const updated = await prisma.employee.update({

      where: { id },

      data: {

        fullName: body.fullName ?? undefined,

        idNumber: body.idNumber ?? undefined,

        phone: body.phone ?? undefined,

        email: body.email ?? undefined,

        address: body.address ?? undefined,

        role: body.role ?? undefined,

        salary:

          body.salary === undefined || body.salary === ""

            ? undefined

            : Number(body.salary),

        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,

        cantinaId: body.cantinaId === "" ? null : body.cantinaId ?? undefined,

        status: body.status ?? undefined,

        notes: body.notes ?? undefined,

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

      message: "Funcionário atualizado com sucesso.",

      employee: updated,

    });

  } catch (error) {

    console.error("ERRO API RH PATCH:", error);

    return NextResponse.json(

      { message: "Erro ao atualizar funcionário." },

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

    const employee = await prisma.employee.findFirst({

      where: {

        id,

        companyId: session.companyId,

      },

      include: {

        _count: {

          select: {

            salaryPayments: true,

          },

        },

      },

    });

    if (!employee) {

      return NextResponse.json(

        { message: "Funcionário não encontrado." },

        { status: 404 }

      );

    }

    if (employee._count.salaryPayments > 0) {

      await prisma.employee.update({

        where: { id },

        data: {

          status: "INACTIVE",

        },

      });

      return NextResponse.json({

        message:

          "Funcionário possui pagamentos. Foi marcado como inativo para preservar o histórico.",

      });

    }

    await prisma.employee.delete({

      where: { id },

    });

    return NextResponse.json({

      message: "Funcionário apagado com sucesso.",

    });

  } catch (error) {

    console.error("ERRO API RH DELETE:", error);

    return NextResponse.json(

      { message: "Erro ao apagar funcionário." },

      { status: 500 }

    );

  }

}