import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

type EmployeeBody = {
  fullName?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  role?: string;
  salary?: number | string;
  hireDate?: string;
  cantinaId?: string | null;
  notes?: string | null;
};

export async function GET() {
  try {
    const session = await requireAdmin();

    const [employees, cantinas, salaryPayments, financialAccounts] =
      await Promise.all([
        prisma.employee.findMany({
          where: { companyId: session.companyId },
          include: {
            cantina: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            salaryPayments: {
              orderBy: { paymentDate: "desc" },
              take: 12,
            },
          },
          orderBy: { createdAt: "desc" },
        }),

        prisma.cantina.findMany({
          where: { companyId: session.companyId },
          select: {
            id: true,
            name: true,
            code: true,
          },
          orderBy: { name: "asc" },
        }),

        prisma.salaryPayment.findMany({
          where: { companyId: session.companyId },
          include: {
            employee: {
              include: {
                cantina: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
          orderBy: { paymentDate: "desc" },
        }),

        prisma.financialAccount.findMany({
          where: {
            companyId: session.companyId,
            status: "ACTIVE",
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    return NextResponse.json({
      employees,
      cantinas,
      salaryPayments,
      financialAccounts,
    });
  } catch (error) {
    console.error("ERRO API RH GET:", error);

    return NextResponse.json(
      { message: "Erro ao carregar RH." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = (await request.json()) as EmployeeBody;

    const {
      fullName,
      idNumber,
      phone,
      email,
      address,
      role,
      salary,
      hireDate,
      cantinaId,
      notes,
    } = body;

    if (!fullName || !role) {
      return NextResponse.json(
        { message: "Nome completo e função são obrigatórios." },
        { status: 400 }
      );
    }

    const salaryValue = Number(salary || 0);

    if (salaryValue < 0) {
      return NextResponse.json(
        { message: "O salário não pode ser negativo." },
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

    const employee = await prisma.employee.create({
      data: {
        companyId: session.companyId,
        cantinaId: cantinaId || null,
        fullName,
        idNumber: idNumber || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        role,
        salary: salaryValue,
        hireDate: hireDate ? new Date(hireDate) : null,
        status: "ACTIVE",
        notes: notes || null,
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
      message: "Funcionário criado com sucesso.",
      employee,
    });
  } catch (error) {
    console.error("ERRO API RH POST:", error);

    return NextResponse.json(
      { message: "Erro ao criar funcionário." },
      { status: 500 }
    );
  }
}